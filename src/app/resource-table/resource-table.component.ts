import { SelectionModel } from '@angular/cdk/collections';
import {
  CdkDragDrop,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { CdkHeaderRowDef } from '@angular/cdk/table';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { Resource } from '@shared/schema/resource';
import { PropertyPath } from '@shared/schema/utility';
import { cloneDeep, find, keyBy, pull, zipWith } from 'lodash';
import {
  BehaviorSubject,
  Subject,
  Subscription,
  debounceTime,
  firstValueFrom,
  map,
  mergeMap,
  tap,
} from 'rxjs';
import { ApiService } from '../api.service';
import { ColumnToggleDialogComponent } from '../column-toggle-dialog/column-toggle-dialog.component';

export interface CSSBoxMargin {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

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
  @ViewChild(CdkHeaderRowDef) headerRowDef?: CdkHeaderRowDef;
  @ViewChild(MatTable) table?: MatTable<Row<I>>;

  private readonly resourceTableRowsPagesChangeSubject = new Subject<
    Resource.TableRowsPage<I>[]
  >();

  private routeDataSubscription?: Subscription;

  protected readonly dataSource = new MatTableDataSource<Row<I>>();

  protected readonly pull = pull;

  protected readonly rootMarginSubject = new BehaviorSubject<CSSBoxMargin>({});

  protected readonly selection = new SelectionModel<Row<I>>(false, []);

  protected resourceTable: Resource.Table<I> = this.route.snapshot.data[
    'resourceTable'
  ] as Resource.Table<I>;

  constructor(
    private readonly apiService: ApiService<I>,
    private readonly dialog: MatDialog,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {
    this.rootMarginSubject.subscribe({
      next: (r) => console.warn(performance.now(), r),
    });
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
            const { resourceId } = this.resourceTable.params;

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

          /**
           * FIXME https://github.com/angular/components/issues/22022
           */
          if (this.headerRowDef != null) {
            this.table?.removeHeaderRowDef(this.headerRowDef);
          }

          this.selection.clear();

          this.resourceTableRowsPagesChangeSubject.next(rowsPages);
        },
      });
  }

  ngOnDestroy(): void {
    this.routeDataSubscription?.unsubscribe();
  }

  protected fetchResourceTableRows(
    pageToken: string
  ): Promise<Resource.TableRowsPage<I>[]> {
    return firstValueFrom(
      this.apiService
        .getResourceTableRowsPage({
          pageToken,
          tableToken: this.resourceTable.params.token,
        })
        .pipe(
          map(({ items }) => {
            const resourceTableRowsPage = find(this.resourceTable.rowsPages, {
              pageToken,
            })!;

            delete resourceTableRowsPage.pending;

            resourceTableRowsPage.items = items;

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

  protected onPathDropped({
    previousIndex,
    currentIndex,
    container: {
      data: { [previousIndex]: previousItem, [currentIndex]: currentItem },
    },
  }: CdkDragDrop<PropertyPath<I>[]>): Promise<void> {
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

    return this.syncResourceTableColumns();
  }

  protected openColumnToggleDialog(): void {
    this.dialog
      .open(ColumnToggleDialogComponent, {
        data: cloneDeep(this.resourceTable.columns),
      })
      .afterClosed()
      .subscribe({
        next: (resourceTableColumns) =>
          this.updateResourceTableColumns(resourceTableColumns),
      });
  }

  protected patchResourceItem(
    resourceTableField: Resource.TableField<I>
  ): Promise<I> {
    return firstValueFrom(
      this.apiService
        .patchResourceItem(
          { tableToken: this.resourceTable.params.token },
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

  protected scrollIntoView(element: HTMLElement): Promise<void> {
    return firstValueFrom(
      this.rootMarginSubject.pipe(
        tap((result) =>
          console.log(performance.now(), 'scrollIntoView', result)
        ),
        debounceTime(500)
      )
    ).then(({ top = 0 }) => {
      element.style.scrollMarginTop = `${-top}px`;

      element.scrollIntoView({ block: 'start' });
    });
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
    if (forceState) {
      this.selection.select(row);
    } else {
      this.selection.deselect(row);
    }

    if (!(row instanceof ResourceTableRowsPlaceholder)) {
      await this.setQueryParams({
        resourceId: this.selection.isSelected(row) ? row.resource.id : null,
      });
    }
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
