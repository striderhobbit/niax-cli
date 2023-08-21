import { SelectionModel } from '@angular/cdk/collections';
import {
  CdkDragDrop,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { ViewportScroller } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { Resource } from '@shared/schema/resource';
import { PropertyPath } from '@shared/schema/utility';
import { cloneDeep, find, keyBy, pull, zipWith } from 'lodash';
import {
  Subject,
  Subscription,
  firstValueFrom,
  map,
  mergeMap,
  tap,
} from 'rxjs';
import { ApiService } from '../api.service';
import { ColumnToggleDialogComponent } from '../column-toggle-dialog/column-toggle-dialog.component';

class ResourceTableRowsPlaceholder {
  constructor(public readonly pageToken: string) {}
}

type Row<I extends Resource.Item> =
  | Resource.TableRow<I>
  | ResourceTableRowsPlaceholder;

@Component({
  selector: 'app-resource-table',
  templateUrl: './resource-table.component.html',
  styleUrls: ['./resource-table.component.scss'],
})
export class ResourceTableComponent<I extends Resource.Item>
  implements OnInit, OnDestroy
{
  private readonly resourceTableRowsPagesChangeSubject = new Subject<
    Resource.TableRowsPage<I>[]
  >();

  private routeDataSubscription?: Subscription;

  protected readonly dataSource = new MatTableDataSource<Row<I>>();

  protected readonly pull = pull;

  protected readonly selection = new SelectionModel<Row<I>>(false, []);

  protected resourceTable: Resource.Table<I> = this.route.snapshot.data[
    'resourceTable'
  ] as Resource.Table<I>;

  constructor(
    private readonly apiService: ApiService<I>,
    private readonly dialog: MatDialog,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    protected readonly viewportScroller: ViewportScroller
  ) {
    this.resourceTableRowsPagesChangeSubject
      .pipe(
        map((resourceTableRowsPages) =>
          resourceTableRowsPages.flatMap<Row<I>>((rowsPage) =>
            rowsPage.pending && this.isConnected(rowsPage)
              ? new ResourceTableRowsPlaceholder(rowsPage.pageToken)
              : rowsPage.items
          )
        ),
        map((rows) => (this.dataSource.data = rows)),
        mergeMap(async (rows) => {
          if (!this.selection.hasValue()) {
            const { resourceId } = this.resourceTable.query;

            const activeRow = rows.find(
              (row) =>
                !(row instanceof ResourceTableRowsPlaceholder) &&
                row.resource.id === resourceId
            );

            if (activeRow != null) {
              await this.toggleRowSelection(activeRow, true);
            }
          }
        })
      )
      .subscribe();
  }

  ngOnInit(): void {
    this.routeDataSubscription = this.route.data
      .pipe(map((data) => data['resourceTable'] as Resource.Table<I>))
      .subscribe({
        next: (resourceTable) => {
          const { rowsPages } = (this.resourceTable = resourceTable);

          this.selection.clear();

          this.resourceTableRowsPagesChangeSubject.next(rowsPages);
        },
      });
  }

  ngOnDestroy(): void {
    this.routeDataSubscription?.unsubscribe();
  }

  protected asResourceTableRow(row: Row<I>): Resource.TableRow<I> {
    this.assertIsResourceTableRow(row);

    return row;
  }

  private assertIsResourceTableRow(
    row: Row<I>
  ): asserts row is Resource.TableRow<I> {
    if (row instanceof ResourceTableRowsPlaceholder) {
      throw new TypeError();
    }
  }

  protected fetchResourceTableRows(
    pageToken: string
  ): Promise<Resource.TableRowsPage<I>[]> {
    return firstValueFrom(
      this.apiService
        .getResourceTableRowsPage({
          pageToken,
          tableToken: this.resourceTable.token,
        })
        .pipe(
          map(({ items }) => {
            const resourceTableRowsPage = find(this.resourceTable.rowsPages, {
              pageToken,
            });

            delete resourceTableRowsPage!.pending;

            resourceTableRowsPage!.items = items;

            return this.resourceTable.rowsPages;
          }),
          tap((resourceTableRowsPages) =>
            this.resourceTableRowsPagesChangeSubject.next(
              resourceTableRowsPages
            )
          )
        )
    );
  }

  private isConnected(
    resourceTableRowsPage: Resource.TableRowsPage<I>
  ): boolean {
    const resourceTableRowsPagesDictionary = keyBy(
      this.resourceTable.rowsPages,
      'pageToken'
    );

    const { previousPageToken, nextPageToken } = resourceTableRowsPage;

    return (
      (previousPageToken == null && nextPageToken == null) ||
      (previousPageToken != null &&
        !resourceTableRowsPagesDictionary[previousPageToken].pending) ||
      (nextPageToken != null &&
        !resourceTableRowsPagesDictionary[nextPageToken].pending)
    );
  }

  protected isPlaceholder(index: number, item: Row<I>): boolean {
    return item instanceof ResourceTableRowsPlaceholder;
  }

  protected async onPathDropped({
    previousIndex,
    currentIndex,
    container,
  }: CdkDragDrop<PropertyPath<I>[]>): Promise<void> {
    if (previousIndex !== currentIndex) {
      const {
        data: { [previousIndex]: previousItem, [currentIndex]: currentItem },
      } = container;

      const [previousArray, currentArray] = [previousItem, currentItem].map(
        (path) =>
          this.resourceTable.primaryPaths.includes(path)
            ? this.resourceTable.primaryPaths
            : this.resourceTable.secondaryPaths
      );

      const [previousIndexInArray, currentIndexInArray] = zipWith(
        [previousArray, currentArray],
        [previousItem, currentItem],
        (array, item) => array.indexOf(item)
      );

      previousArray === currentArray
        ? moveItemInArray(
            previousArray,
            previousIndexInArray,
            currentIndexInArray
          )
        : transferArrayItem(
            previousArray,
            currentArray,
            previousIndexInArray,
            currentIndexInArray
          );

      await this.syncResourceTableColumns();
    }
  }

  protected openColumnToggleDialog(): Promise<void> {
    const dialogRef: MatDialogRef<
      ColumnToggleDialogComponent<Resource.Item>,
      Resource.TableColumn<I>[]
    > = this.dialog.open(ColumnToggleDialogComponent, {
      data: cloneDeep(this.resourceTable.columns),
    });

    return firstValueFrom(
      dialogRef
        .afterClosed()
        .pipe(
          mergeMap((resourceTableColumns) =>
            this.updateResourceTableColumns(resourceTableColumns)
          )
        )
    );
  }

  protected patchResourceItem(
    resourceTableField: Resource.TableField<I>
  ): Promise<I> {
    return firstValueFrom(
      this.apiService
        .patchResourceItem(
          { tableToken: this.resourceTable.token },
          resourceTableField
        )
        .pipe(
          // TODO mergeTap? https://github.com/ReactiveX/rxjs/discussions/7320
          mergeMap((resourceItem) =>
            this.setQueryParams(
              { resourceId: resourceTableField.resource.id }, // TODO needs adaptation
              { runResolvers: true }
            ).then(() => resourceItem)
          )
        )
    );
  }

  protected async setQueryParams(
    queryParams: Params,
    { runResolvers }: { runResolvers?: boolean } = {}
  ): Promise<void> {
    await this.router.navigate([], {
      queryParams: {
        ...queryParams,
        ...(runResolvers ? { snapshotId: Date.now() } : {}),
      },
      queryParamsHandling: 'merge',
    });
  }

  protected syncResourceTableColumns(): Promise<void> {
    this.resourceTable.columns.forEach((column) => {
      column.sortIndex = this.resourceTable.primaryPaths.indexOf(column.path);

      if (column.sortIndex === -1) {
        delete column.sortIndex;
        delete column.order;
      }
    });

    return this.updateResourceTableColumns();
  }

  protected async toggleRowSelection(
    row: Row<I>,
    forceState: boolean = !this.selection.isSelected(row)
  ): Promise<void> {
    this.assertIsResourceTableRow(row);

    if (forceState) {
      this.selection.select(row);
    } else {
      this.selection.deselect(row);
    }

    await this.setQueryParams({
      resourceId: this.selection.isSelected(row) ? row.resource.id : null,
    });
  }

  protected updateResourceTableColumns(
    resourceTableColumns: Resource.TableColumn<I>[] = this.resourceTable.columns
  ): Promise<void> {
    return this.setQueryParams(
      {
        cols: resourceTableColumns
          .filter((column) => column.include)
          .map((column) =>
            [
              column.path,
              column.sortIndex ?? '',
              column.order ?? '',
              column.filter ?? '',
            ].join(':')
          )
          .join(','),
      },
      { runResolvers: true }
    );
  }
}
