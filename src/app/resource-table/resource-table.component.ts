import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { Resource } from '@shared/schema/resource';
import { PropertyPath } from '@shared/schema/utility';
import { forOwn, pick, pull } from 'lodash';
import {
  defer,
  filter,
  first,
  firstValueFrom,
  forkJoin,
  map,
  mergeMap,
} from 'rxjs';
import { ApiService } from '../api.service';

@Component({
  selector: 'app-resource-table',
  templateUrl: './resource-table.component.html',
  styleUrls: ['./resource-table.component.scss'],
})
export class ResourceTableComponent<I extends Resource.Item> implements OnInit {
  protected resourceTable?: Resource.TableHeader<I>;

  protected readonly preserveOrder = () => 0;

  constructor(
    private readonly apiService: ApiService<I>,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.fetchResourceTable();
  }

  private fetchResourceTable(): Promise<void> {
    return firstValueFrom(
      this.route.queryParams.pipe(
        filter((params) => 'resource' in params),
        first(),
        mergeMap((params) =>
          this.apiService.getResourceTable(
            pick(params, 'resource'),
            pick(params, 'hash', 'limit', 'paths', 'resourceId')
          )
        ),
        map((resourceTable) => (this.resourceTable = resourceTable)),
        mergeMap((resourceTable) => {
          const { hash, query } = resourceTable;

          return this.setQueryParams({ hash }).then(async () => {
            if (query.pageToken != null) {
              return this.fetchResourceTableRows(
                resourceTable,
                query.pageToken
              );
            }
          });
        })
      )
    );
  }

  protected fetchResourceTableColumns(
    resourceTable: Resource.TableHeader<I>
  ): Promise<void> {
    return this.setQueryParams({
      paths: this.stringifyResourceTableColumns(resourceTable),
    }).then(() => this.fetchResourceTable());
  }

  protected async fetchResourceTableRows(
    resourceTable: Resource.TableHeader<I>,
    pageToken: string
  ): Promise<void> {
    return firstValueFrom(
      this.apiService
        .getResourceTableRowsPage(pick(resourceTable, 'resource'), {
          pageToken,
        })
        .pipe(
          map((resourceTableRowsPage) => {
            resourceTable.rowsPages[pageToken].items =
              resourceTableRowsPage.items;
          })
        )
    );
  }

  protected isConnected(
    resourceTable: Resource.TableHeader<I>,
    resourceTableRowsPage: Resource.TableRowsPageHeader<I>
  ): boolean {
    return (
      (resourceTableRowsPage.nextPageToken == null &&
        resourceTableRowsPage.previousPageToken == null) ||
      (resourceTableRowsPage.nextPageToken != null &&
        resourceTable.rowsPages[resourceTableRowsPage.nextPageToken].items !=
          null) ||
      (resourceTableRowsPage.previousPageToken != null &&
        resourceTable.rowsPages[resourceTableRowsPage.previousPageToken]
          .items != null)
    );
  }

  private onPrimaryPathsChanged(resourceTable: Resource.TableHeader<I>) {
    forOwn(resourceTable.columns, (resourceTableColumn) => {
      if (
        (resourceTableColumn.sortIndex = resourceTable.$primaryPaths.indexOf(
          resourceTableColumn.path
        )) === -1
      ) {
        delete resourceTableColumn.sortIndex;
      }
    });
  }

  protected onPrimaryPathDropped(
    resourceTable: Resource.TableHeader<I>,
    event: CdkDragDrop<PropertyPath<I>[]>
  ): void {
    moveItemInArray(
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );

    this.onPrimaryPathsChanged(resourceTable);
  }

  protected onPrimaryPathToggled(
    resourceTable: Resource.TableHeader<I>,
    event: {
      item: PropertyPath<I>;
      state: boolean;
    }
  ): void {
    if (event.state) {
      resourceTable.$primaryPaths.push(event.item);
    } else {
      pull(resourceTable.$primaryPaths, event.item);
    }

    this.onPrimaryPathsChanged(resourceTable);
  }

  protected patchResourceItem(
    resourceTable: Resource.TableHeader<I>,
    resourceTableField: Resource.TableField<I>
  ): Promise<I> {
    return this.setQueryParams({
      resourceId: resourceTableField.resource.id,
    }).then(() =>
      firstValueFrom(
        forkJoin([
          this.apiService.patchResourceItem(
            pick(resourceTable, 'resource'),
            resourceTableField
          ),
          defer(() => this.fetchResourceTable()),
        ]).pipe(map(([resourceItem]) => resourceItem))
      )
    );
  }

  private setQueryParams(queryParams: Params): Promise<boolean> {
    return this.router.navigate([], {
      queryParams,
      queryParamsHandling: 'merge',
    });
  }

  private stringifyResourceTableColumns(
    resourceTable: Resource.TableHeader<I>
  ): string {
    let paths: string[] = [];

    forOwn(resourceTable.columns, (column) => {
      if (column.include) {
        paths.push(
          [
            column.path,
            column.sortIndex ?? '',
            column.order ?? '',
            column.filter ?? '',
          ].join(':')
        );
      }
    });

    return paths.join(',');
  }
}
