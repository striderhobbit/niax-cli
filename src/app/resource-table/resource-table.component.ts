import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { Resource } from '@shared/schema/resource';
import { PropertyPath } from '@shared/schema/utility';
import { find, keyBy, pick, pull } from 'lodash';
import { combineLatest, firstValueFrom, map, mergeMap } from 'rxjs';
import { ApiService } from '../api.service';

@Component({
  selector: 'app-resource-table',
  templateUrl: './resource-table.component.html',
  styleUrls: ['./resource-table.component.scss'],
})
export class ResourceTableComponent<I extends Resource.Item> implements OnInit {
  protected resourceTable?: Resource.Table<I>;

  constructor(
    private readonly activatedRoute: ActivatedRoute,
    private readonly apiService: ApiService<I>,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.fetchResourceTable();
  }

  private fetchResourceTable(): Promise<Resource.Table<I>> {
    return firstValueFrom(
      combineLatest([
        this.activatedRoute.params,
        this.activatedRoute.queryParams,
      ]).pipe(
        mergeMap(([params, queryParams]) =>
          this.apiService.getResourceTable(
            pick(params, 'resourceName'),
            pick(queryParams, 'hash', 'limit', 'paths', 'resourceId')
          )
        ),
        map((resourceTable) => (this.resourceTable = resourceTable))
      )
    ).then(
      async (resourceTable) => (
        await this.setQueryParams({ hash: resourceTable.hash }), resourceTable
      )
    );
  }

  protected fetchResourceTableColumns(
    resourceTable: Resource.Table<I>
  ): Promise<Resource.TableColumns<I>> {
    return this.setQueryParams({
      paths: this.stringifyResourceTableColumns(resourceTable),
    })
      .then(() => this.fetchResourceTable())
      .then(({ columns }) => columns);
  }

  protected async fetchResourceTableRows(
    resourceTable: Resource.Table<I>,
    pageToken: string
  ): Promise<Resource.TableRow<I>[]> {
    return firstValueFrom(
      this.apiService
        .getResourceTableRowsPage(
          {
            resourceName: resourceTable.resource.name,
          },
          {
            pageToken,
          }
        )
        .pipe(
          map(({ items }) => {
            const resourceTableRowsPage = find(resourceTable.rowsPages, {
              pageToken,
            })!;

            delete resourceTableRowsPage.deferred;

            return (resourceTableRowsPage.items = items);
          })
        )
    );
  }

  protected isConnected(
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
        !resourceTableRowsPagesDictionary[previousPageToken].deferred) ||
      (nextPageToken != null &&
        !resourceTableRowsPagesDictionary[nextPageToken].deferred)
    );
  }

  private onPrimaryPathsChanged(resourceTable: Resource.Table<I>): void {
    resourceTable.columns.forEach((resourceTableColumn) => {
      if (
        (resourceTableColumn.sortIndex = resourceTable.primaryPaths.indexOf(
          resourceTableColumn.path
        )) === -1
      ) {
        delete resourceTableColumn.sortIndex;
      }
    });
  }

  protected onPrimaryPathDropped(
    resourceTable: Resource.Table<I>,
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
    resourceTable: Resource.Table<I>,
    event: {
      item: PropertyPath<I>;
      state: boolean;
    }
  ): void {
    if (event.state) {
      resourceTable.primaryPaths.push(event.item);
    } else {
      pull(resourceTable.primaryPaths, event.item);
    }

    this.onPrimaryPathsChanged(resourceTable);
  }

  protected patchResourceItem(
    resourceTable: Resource.Table<I>,
    resourceTableField: Resource.TableField<I>
  ): Promise<I> {
    return this.setQueryParams({
      resourceId: resourceTableField.resource.id,
    }).then(() =>
      firstValueFrom(
        this.apiService.patchResourceItem(
          {
            resourceName: resourceTable.resource.name,
          },
          resourceTableField
        )
      ).then(
        async (resourceItem) => (await this.fetchResourceTable(), resourceItem)
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
    resourceTable: Resource.Table<I>
  ): string {
    return resourceTable.columns
      .filter((column) => column.include)
      .map((column) =>
        [
          column.path,
          column.sortIndex ?? '',
          column.order ?? '',
          column.filter ?? '',
        ].join(':')
      )
      .join(',');
  }
}
