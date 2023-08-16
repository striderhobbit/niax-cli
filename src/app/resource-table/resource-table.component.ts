import {
  CdkDragDrop,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { Resource } from '@shared/schema/resource';
import { PropertyPath } from '@shared/schema/utility';
import { cloneDeep, find, keyBy, pick, pull, zipWith } from 'lodash';
import { Subject, Subscription, firstValueFrom, map, tap } from 'rxjs';
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

  protected get paths(): PropertyPath<I>[] {
    const { primaryPaths, secondaryPaths } = this.resourceTable;

    return primaryPaths.concat(secondaryPaths);
  }

  protected resourceTable!: Resource.Table<I>;

  constructor(
    private readonly apiService: ApiService<I>,
    private readonly dialog: MatDialog,
    private readonly route: ActivatedRoute,
    private readonly router: Router
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
        tap((rows) => (this.dataSource.data = rows))
      )
      .subscribe();
  }

  ngOnInit(): void {
    this.routeDataSubscription = this.route.data
      .pipe(
        map((data) => data['resourceTable'] as Resource.Table<I>),
        tap((resourceTable) =>
          this.setQueryParams(pick(resourceTable.params, 'hash'))
        )
      )
      .subscribe({
        next: (resourceTable) =>
          this.resourceTableRowsPagesChangeSubject.next(
            (this.resourceTable = resourceTable).rowsPages
          ),
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
          resourceName: this.resourceTable.params.resourceName,
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
  }: CdkDragDrop<PropertyPath<I>[]>): void {
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

    this.syncPaths();
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
          pick(this.resourceTable.params, 'resourceName'),
          resourceTableField
        )
        .pipe(
          tap(() =>
            this.setQueryParams(
              { resourceId: resourceTableField.resource.id },
              { runResolvers: true }
            )
          )
        )
    );
  }

  private setQueryParams(
    queryParams: Params,
    { runResolvers }: { runResolvers?: boolean } = {}
  ): Promise<boolean> {
    return this.router.navigate([], {
      queryParams: {
        ...queryParams,
        ...(runResolvers ? { snapshotId: Date.now() } : {}),
      },
      queryParamsHandling: 'merge',
    });
  }

  protected syncPaths(): Promise<boolean> {
    this.resourceTable.columns.forEach((resourceTableColumn) => {
      if (
        (resourceTableColumn.sortIndex =
          this.resourceTable.primaryPaths.indexOf(resourceTableColumn.path)) ===
        -1
      ) {
        delete resourceTableColumn.sortIndex;
      }
    });

    return this.updateResourceTableColumns();
  }

  protected togglePath(column: Resource.TableColumn<I>): Promise<boolean> {
    if (!this.resourceTable.primaryPaths.includes(column.path)) {
      this.resourceTable.primaryPaths.push(column.path);
    } else if (column.order === 'desc') {
      pull(this.resourceTable.primaryPaths, column.path);
    } else {
      column.order = 'desc';

      return this.updateResourceTableColumns();
    }

    return this.syncPaths();
  }

  protected updateResourceTableColumns(
    resourceTableColumns: Resource.TableColumn<I>[] = this.resourceTable.columns
  ): Promise<boolean> {
    return this.setQueryParams(
      {
        paths: resourceTableColumns
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
