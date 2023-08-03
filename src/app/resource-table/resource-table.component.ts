import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { UniqItem } from '@shared/schema';
import { Resource } from '@shared/schema/resource';
import { pick, pickBy } from 'lodash';
import { defer, filter, firstValueFrom, forkJoin, map, mergeMap } from 'rxjs';
import { ApiService } from '../api.service';

@Component({
  selector: 'app-resource-table',
  templateUrl: './resource-table.component.html',
  styleUrls: ['./resource-table.component.scss'],
})
export class ResourceTableComponent<T extends UniqItem> implements OnInit {
  protected resourceTable?: Resource.Table<T>;

  protected readonly preserveOrder = () => 0;

  constructor(
    private readonly apiService: ApiService<T>,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.updateResourceTable();
  }

  protected async fetchResourceTableRows(
    resourceTable: Resource.Table<T>,
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
    resourceTable: Resource.Table<T>,
    resourceTableRowsPage: Resource.TableRowsPageHeader<T>
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

  protected patchResourceItem(
    resourceTable: Resource.Table<T>,
    resourceTableField: Resource.TableField<T>
  ): Promise<T> {
    return this.setQueryParams({ resourceId: resourceTableField.id }).then(() =>
      firstValueFrom(
        forkJoin([
          this.apiService.patchResourceItem(
            pick(resourceTable, 'resource'),
            resourceTableField
          ),
          defer(() => this.updateResourceTable()),
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

  private updateResourceTable(): Promise<void> {
    return firstValueFrom(
      this.route.queryParams.pipe(
        filter((params) => 'resource' in params),
        mergeMap((params) =>
          this.apiService.getResourceTable(
            pick(params, 'resource'),
            pick(params, 'hash', 'limit', 'paths', 'resourceId')
          )
        ),
        map((resourceTable) => (this.resourceTable = resourceTable)),
        mergeMap((resourceTable) => {
          const { hash, pageToken } = resourceTable;

          return this.setQueryParams({ hash }).then(async () => {
            if (pageToken != null) {
              return this.fetchResourceTableRows(resourceTable, pageToken);
            }
          });
        })
      )
    );
  }

  protected updateResourceTableColumns(): Promise<void> {
    return this.setQueryParams({
      paths: Object.keys(pickBy(this.resourceTable!.columns, 'include')).join(
        ','
      ),
    }).then(() => this.updateResourceTable());
  }
}
