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
import { CookieService } from 'ngx-cookie-service';
import {
    Subject,
    Subscription,
    firstValueFrom,
    map,
    mergeMap,
    tap,
} from 'rxjs';
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

  private readonly resourceTableRowsPageChanges = new Subject<
    Resource.TableRowsPage<I>[]
  >();

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

  protected resourceTable: Resource.Table<I> = this.route.snapshot.data[
    'resourceTable'
  ] as Resource.Table<I>;

  constructor(
    private readonly apiService: ApiService<I>,
    private readonly cookieService: CookieService,
    private readonly dialog: MatDialog,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {
    this.resourceTableRowsPageChanges
      .pipe(
        map((resourceTableRowsPages) =>
          resourceTableRowsPages.flatMap<Row<I>>((rowsPage) =>
            rowsPage.pending && this.isConnected(rowsPage)
              ? new RowsPlaceholder(rowsPage.pageToken)
              : rowsPage.items
          )
        ),
        map((rows) => (this.dataSource.data = rows)),
        mergeMap(async (rows) => {
          if (!this.selection.hasValue()) {
            const { resourceId } = this.resourceTable.query;

            const activeRow = rows.find(
              (row) =>
                !(row instanceof RowsPlaceholder) &&
                row.resource.id === resourceId
            );

            if (activeRow != null) {
              await this.toggleRowIsSelected(activeRow, true);
            }
          }
        })
      )
      .subscribe();
  }

  ngOnInit(): void {
    this.#intersectionIgnored =
      this.cookieService.get('intersectionIgnored') === 'true';

    this.routeDataSubscription = this.route.data
      .pipe(map((data) => data['resourceTable'] as Resource.Table<I>))
      .subscribe({
        next: (resourceTable) => {
          const { rowsPages } = (this.resourceTable = resourceTable);

          /**
           * FIXME https://github.com/angular/components/issues/22022
           */
          if (this.headerRowDef != null) {
            // this.table?.removeHeaderRowDef(this.headerRowDef);
          }

          this.selection.clear();

          this.resourceTableRowsPageChanges.next(rowsPages);
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

            resourceTableRowsPage!.pending = false;
            resourceTableRowsPage!.items = items;

            return this.resourceTable.rowsPages;
          }),
          tap((resourceTableRowsPages) =>
            this.resourceTableRowsPageChanges.next(resourceTableRowsPages)
          )
        )
    );
  }

  protected getType(value: any): string {
    return Object.prototype.toString.call(value).slice(8, -1).toLowerCase();
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
    return item instanceof RowsPlaceholder;
  }

  protected async moveResourceTableColumns({
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
    const dialogRef: ColumnToggleDialog<I>['ref'] = this.dialog.open<
      ColumnToggleDialogComponent<I>,
      ColumnToggleDialog<I>['data']
    >(ColumnToggleDialogComponent<I>, {
      data: this.resourceTable.columns,
    });

    return firstValueFrom(
      dialogRef.afterClosed().pipe(
        mergeMap(async (resourceTableColumns) => {
          if (resourceTableColumns != null) {
            await this.updateResourceTableColumns(resourceTableColumns);
          }
        })
      )
    );
  }

  protected openResourceItemPatchDialog(
    resourceTableField: Resource.TableField<I>
  ): Promise<void> {
    const dialogRef: ResourceItemPatchDialog<I>['ref'] = this.dialog.open<
      ResourceItemPatchDialogComponent<I>,
      ResourceItemPatchDialog<I>['data']
    >(ResourceItemPatchDialogComponent<I>, {
      data: cloneDeep(resourceTableField),
    });

    return firstValueFrom(
      dialogRef.afterClosed().pipe(
        mergeMap(async (resourceTableField) => {
          if (resourceTableField != null) {
            await this.patchResourceItem(resourceTableField);
          }
        })
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
          mergeMap((resourceItem) =>
            this.setQueryParams(
              { resourceId: resourceTableField.resource.id },
              { runResolvers: true }
            ).then(() => resourceItem)
          )
        )
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
