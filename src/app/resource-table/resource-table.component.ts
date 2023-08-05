import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { KeyValue } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { Resource } from '@shared/schema/resource';
import { PropertyPath } from '@shared/schema/utility';
import { pick, pull } from 'lodash';
import { defer, filter, firstValueFrom, forkJoin, map, mergeMap } from 'rxjs';
import { ApiService } from '../api.service';

@Component({
  selector: 'app-resource-table',
  templateUrl: './resource-table.component.html',
  styleUrls: ['./resource-table.component.scss'],
})
export class ResourceTableComponent<I extends Resource.Item> implements OnInit {
  protected resourceTable?: Resource.TableHeader<I>;

  constructor(
    private readonly apiService: ApiService<I>,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.fetchResourceTable();
  }

  protected compareIndex<T extends { index: number }>(
    a: KeyValue<string, T>,
    b: KeyValue<string, T>,
    ascending: boolean = true
  ): number {
    return (ascending ? 1 : -1) * (a.value.index - b.value.index);
  }

  private fetchResourceTable(): Promise<Resource.TableHeader<I>> {
    return firstValueFrom(
      this.route.queryParams.pipe(
        filter((params) => 'resource' in params),
        mergeMap((params) =>
          this.apiService.getResourceTable(
            pick(params, 'resource'),
            pick(params, 'hash', 'limit', 'paths', 'resourceId')
          )
        ),
        map((resourceTable) => (this.resourceTable = resourceTable))
      )
    ).then((resourceTable) => {
      const {
        hash,
        $query: { pageToken },
      } = resourceTable;

      return this.setQueryParams({ hash }).then(async () => {
        if (pageToken != null) {
          await this.fetchResourceTableRows(resourceTable, pageToken);
        }

        return resourceTable;
      });
    });
  }

  protected fetchResourceTableColumns(
    resourceTable: Resource.TableHeader<I>
  ): Promise<Resource.TableColumns<I>> {
    return this.setQueryParams({
      paths: this.stringifyResourceTableColumns(resourceTable),
    })
      .then(() => this.fetchResourceTable())
      .then(({ columns }) => columns);
  }

  protected async fetchResourceTableRows(
    resourceTable: Resource.TableHeader<I>,
    pageToken: string
  ): Promise<Resource.TableRow<I>[]> {
    return firstValueFrom(
      this.apiService
        .getResourceTableRowsPage(pick(resourceTable, 'resource'), {
          pageToken,
        })
        .pipe(
          map(
            (resourceTableRowsPage) =>
              (resourceTable.rowsPages[pageToken].items =
                resourceTableRowsPage.items)
          )
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

  private onPrimaryPathsChanged(resourceTable: Resource.TableHeader<I>): void {
    resourceTable.columns.forEach((resourceTableColumn) => {
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
