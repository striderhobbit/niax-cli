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
import { cloneDeep, keyBy, pick, pull, zipWith } from 'lodash';
import { CookieService } from 'ngx-cookie-service';
import { Subject, Subscription, lastValueFrom, map, mergeMap, tap } from 'rxjs';
import { ApiService } from '../api.service';
import {
  ColumnToggleDialog,
  ColumnToggleDialogComponent,
} from '../column-toggle-dialog/column-toggle-dialog.component';
import {
  ResourceItemPatchDialog,
  ResourceItemPatchDialogComponent,
} from '../resource-item-patch-dialog/resource-item-patch-dialog.component';

class RowsPlaceholder {
  constructor(public readonly pageToken: string) {}
}

type Row<I extends Resource.Item> = Resource.TableRow<I> | RowsPlaceholder;

@Component({
  selector: 'app-resource-table',
  templateUrl: './resource-table.component.html',
  styleUrls: ['./resource-table.component.scss'],
  providers: [CookieService],
})
export class ResourceTableComponent<I extends Resource.Item>
  implements OnInit, OnDestroy
{
  @ViewChild(CdkHeaderRowDef) headerRowDef?: CdkHeaderRowDef;
  @ViewChild(MatTable) table?: MatTable<Row<I>>;

  #intersectionIgnored?: boolean;

  private routeDataSubscription?: Subscription;

  protected readonly dataSource = new MatTableDataSource<Row<I>>();

  protected readonly pull = pull;

  protected readonly selection = new SelectionModel<Row<I>>(false, []);

  protected get intersectionIgnored(): boolean | undefined {
    return this.#intersectionIgnored;
  }

  protected set intersectionIgnored(intersectionIgnored: boolean) {
    this.cookieService.set(
      'intersectionIgnored',
      JSON.stringify((this.#intersectionIgnored = intersectionIgnored))
    );
  }

  protected resourceTable?: Resource.Table<I>;

  constructor(
    private readonly apiService: ApiService<I>,
    private readonly cookieService: CookieService,
    private readonly dialog: MatDialog,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.#intersectionIgnored =
      this.cookieService.get('intersectionIgnored') === 'true';

    this.routeDataSubscription = this.route.data
      .pipe(
        tap(() => this.resourceTable?.rowsPagesUpdates?.complete()),
        map((data) => data['resourceTable'] as Resource.Table<I>)
      )
      .subscribe({
        next: (resourceTable) => {
          (resourceTable.rowsPagesUpdates = new Subject<void>())
            .pipe(
              map(() =>
                resourceTable.rowsPages.flatMap<Row<I>>((rowsPage) =>
                  rowsPage.pending && this.isConnected(resourceTable, rowsPage)
                    ? new RowsPlaceholder(rowsPage.pageToken)
                    : rowsPage.items
                )
              ),
              mergeMap(async (rows) => {
                if (!this.selection.hasValue()) {
                  const activeRow = rows.find(
                    (row) =>
                      !(row instanceof RowsPlaceholder) &&
                      row.resourceId === resourceTable.query.resourceId
                  );

                  if (activeRow != null) {
                    await this.toggleRowIsSelected(activeRow, true);
                  }
                }

                return rows;
              })
            )
            .subscribe({
              next: (rows) => (this.dataSource.data = rows),
            });

          this.selection.clear();

          (this.resourceTable = resourceTable).rowsPagesUpdates?.next();
        },
      });
  }

  ngOnDestroy(): void {
    this.routeDataSubscription?.unsubscribe();
  }

  #assertIsRowsPlaceholder(
    row?: Row<I>
  ): asserts row is RowsPlaceholder | undefined {
    if (!(row instanceof RowsPlaceholder)) {
      throw new TypeError();
    }
  }

  protected assertIsRowsPlaceholder(row?: Row<I>): RowsPlaceholder | undefined {
    this.#assertIsRowsPlaceholder(row);

    return row;
  }

  #assertIsResourceTableRow(
    row?: Row<I>
  ): asserts row is Resource.TableRow<I> | undefined {
    if (row instanceof RowsPlaceholder) {
      throw new TypeError();
    }
  }

  protected assertIsResourceTableRow(
    row?: Row<I>
  ): Resource.TableRow<I> | undefined {
    this.#assertIsResourceTableRow(row);

    return row;
  }

  protected fetchResourceTableRows(
    resourceTable: Resource.Table<I>,
    pageToken: string
  ): Promise<void> {
    return lastValueFrom(
      this.apiService.getResourceTableRowsPage({
        pageToken,
        tableToken: resourceTable.token,
      })
    ).then(({ items }) => {
      const rowsPage = resourceTable.rowsPages.find(
        (rowsPage) => rowsPage.pageToken === pageToken
      );

      rowsPage!.pending = false;
      rowsPage!.items = items;

      resourceTable.rowsPagesUpdates?.next();
    });
  }

  protected getType(value: any): string {
    return Object.prototype.toString.call(value).slice(8, -1).toLowerCase();
  }

  private isConnected(
    resourceTable: Resource.Table<I>,
    resourceTableRowsPage: Resource.TableRowsPage<I>
  ): boolean {
    const resourceTableRowsPagesDictionary = keyBy(
      resourceTable.rowsPages,
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

  protected isRowsPlaceholder(index: number, item: Row<I>): boolean {
    return item instanceof RowsPlaceholder;
  }

  protected async moveResourceTableColumns(
    resourceTable: Resource.Table<I>,
    { previousIndex, currentIndex, container }: CdkDragDrop<PropertyPath<I>[]>
  ): Promise<void> {
    if (previousIndex !== currentIndex) {
      const {
        data: { [previousIndex]: previousItem, [currentIndex]: currentItem },
      } = container;

      const [previousArray, currentArray] = [previousItem, currentItem].map(
        (path) =>
          resourceTable.primaryPaths.includes(path)
            ? resourceTable.primaryPaths
            : resourceTable.secondaryPaths
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

      await this.syncResourceTableColumns(resourceTable);
    }
  }

  protected openColumnToggleDialog(
    resourceTable: Resource.Table<I>
  ): Promise<void> {
    const dialogRef: ColumnToggleDialog<I>['ref'] = this.dialog.open<
      ColumnToggleDialogComponent<I>,
      ColumnToggleDialog<I>['data']
    >(ColumnToggleDialogComponent<I>, {
      data: resourceTable.columns,
    });

    return lastValueFrom(dialogRef.afterClosed()).then(
      async (resourceTableColumns) => {
        if (resourceTableColumns != null) {
          await this.updateResourceTableColumns(resourceTableColumns);
        }
      }
    );
  }

  protected openResourceItemPatchDialog(
    resourceTable: Resource.Table<I>,
    resourceTableField: Resource.TableField<I>
  ): Promise<void> {
    const dialogRef: ResourceItemPatchDialog<I>['ref'] = this.dialog.open<
      ResourceItemPatchDialogComponent<I>,
      ResourceItemPatchDialog<I>['data']
    >(ResourceItemPatchDialogComponent<I>, {
      data: cloneDeep(resourceTableField),
    });

    return lastValueFrom(dialogRef.afterClosed()).then(
      async (resourceTableField) => {
        if (resourceTableField != null) {
          await this.patchResourceItem(resourceTable, resourceTableField);
        }
      }
    );
  }

  protected patchResourceItem(
    resourceTable: Resource.Table<I>,
    resourceTableField: Resource.TableField<I>
  ): Promise<I> {
    return lastValueFrom(
      this.apiService.patchResourceItem(
        { tableToken: resourceTable.token },
        resourceTableField
      )
    ).then((resourceItem) =>
      this.setQueryParams(pick(resourceTableField, 'resourceId'), {
        runResolvers: true,
      }).then(() => resourceItem)
    );
  }

  protected async scrollToAnchor(fragment?: string): Promise<void> {
    await this.router.navigate([], {
      fragment,
      queryParamsHandling: 'preserve',
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

  protected syncResourceTableColumns(
    resourceTable: Resource.Table<I>
  ): Promise<void> {
    resourceTable.columns.forEach((column) => {
      column.sortIndex = resourceTable.primaryPaths.indexOf(column.path);

      if (column.sortIndex === -1) {
        delete column.sortIndex;
        delete column.order;
      }
    });

    return this.updateResourceTableColumns(resourceTable.columns);
  }

  protected async toggleRowIsSelected(
    row: Row<I>,
    forceState: boolean = !this.selection.isSelected(row)
  ): Promise<void> {
    this.#assertIsResourceTableRow(row);

    if (forceState) {
      this.selection.select(row);
    } else {
      this.selection.deselect(row);
    }

    await this.setQueryParams({
      resourceId: this.selection.isSelected(row) ? row.resourceId : null,
    });
  }

  protected updateResourceTableColumns(
    resourceTableColumns: Resource.TableColumn<I>[]
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
