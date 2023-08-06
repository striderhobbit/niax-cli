import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { Resource } from '@shared/schema/resource';
import { PropertyPath } from '@shared/schema/utility';
import { find, keyBy, pick, pull } from 'lodash';
import { Subscription, firstValueFrom, map, tap } from 'rxjs';
import { ApiService } from '../api.service';

@Component({
  selector: 'app-resource-table',
  templateUrl: './resource-table.component.html',
  styleUrls: ['./resource-table.component.scss'],
})
export class ResourceTableComponent<I extends Resource.Item>
  implements OnInit, OnDestroy
{
  protected resourceTable: Resource.Table<I> =
    this.route.snapshot.data['resourceTable'];

  private routeDataSubscription?: Subscription;

  constructor(
    private readonly apiService: ApiService<I>,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.routeDataSubscription = this.route.data
      .pipe(
        map((data) => data['resourceTable'] as Resource.Table<I>),
        tap((resourceTable) =>
          this.setQueryParams(pick(resourceTable.params, 'hash'))
        )
      )
      .subscribe({
        next: (resourceTable) => (this.resourceTable = resourceTable),
      });
  }

  ngOnDestroy(): void {
    this.routeDataSubscription?.unsubscribe();
  }

  protected fetchResourceTableRows(
    pageToken: string
  ): Promise<Resource.TableRow<I>[]> {
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

            delete resourceTableRowsPage.deferred;

            return (resourceTableRowsPage.items = items);
          })
        )
    );
  }

  protected isConnected(
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
        !resourceTableRowsPagesDictionary[previousPageToken].deferred) ||
      (nextPageToken != null &&
        !resourceTableRowsPagesDictionary[nextPageToken].deferred)
    );
  }

  private onPrimaryPathsChanged(): void {
    this.resourceTable.columns.forEach((resourceTableColumn) => {
      if (
        (resourceTableColumn.sortIndex =
          this.resourceTable.primaryPaths.indexOf(resourceTableColumn.path)) ===
        -1
      ) {
        delete resourceTableColumn.sortIndex;
      }
    });
  }

  protected onPrimaryPathDropped(event: CdkDragDrop<PropertyPath<I>[]>): void {
    moveItemInArray(
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );

    this.onPrimaryPathsChanged();
  }

  protected onPrimaryPathToggled(event: {
    item: PropertyPath<I>;
    state: boolean;
  }): void {
    if (event.state) {
      this.resourceTable.primaryPaths.push(event.item);
    } else {
      pull(this.resourceTable.primaryPaths, event.item);
    }

    this.onPrimaryPathsChanged();
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
            this.setQueryParams({
              resourceId: resourceTableField.resource.id,
              snapshotId: Date.now(),
            })
          )
        )
    );
  }

  private setQueryParams(queryParams: Params): Promise<boolean> {
    return this.router.navigate([], {
      queryParams,
      queryParamsHandling: 'merge',
    });
  }

  protected updateResourceTableColumns(): Promise<boolean> {
    return this.setQueryParams({
      paths: this.resourceTable.columns
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
      snapshotId: Date.now(),
    });
  }
}
