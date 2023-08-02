import { Component, ElementRef, OnInit } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { UniqItem } from '@shared/schema';
import { Resource } from '@shared/schema/resource';
import { pick, pickBy } from 'lodash';
import {
  defer,
  filter,
  firstValueFrom,
  forkJoin,
  map,
  mergeMap,
  tap,
} from 'rxjs';
import { ApiService } from '../api.service';

@Component({
  selector: 'app-resource-table',
  templateUrl: './resource-table.component.html',
  styleUrls: ['./resource-table.component.scss'],
})
export class ResourceTableComponent<T extends UniqItem> implements OnInit {
  protected defer?: boolean;
  protected resourceTable?: Resource.Table<T>;

  protected readonly preserveOrder = () => 0;

  constructor(
    private readonly apiService: ApiService<T>,
    private readonly host: ElementRef,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.updateResourceTable();
  }

  protected fetchResourceTablePageItems(
    resourceTable: Resource.Table<T>,
    pageToken: string
  ): Promise<void> {
    return resourceTable.rows[pageToken].items == null
      ? firstValueFrom(
          this.apiService
            .getResourceTablePage(pick(resourceTable, 'resource'), {
              pageToken,
            })
            .pipe(
              map((page) => {
                resourceTable.rows[pageToken].items = page.items;
              })
            )
        )
      : Promise.resolve();
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

  private scrollTableRowIntoView(resourceId: string): Promise<void> {
    return new Promise((resolve) =>
      new MutationObserver((mutations, observer) => {
        const tableRow = this.host.nativeElement.querySelector(
          `tr[resource-id=${JSON.stringify(resourceId)}]`
        );

        if (tableRow != null) {
          tableRow.scrollIntoView({ block: 'start' });
          observer.disconnect();

          resolve();
        }
      }).observe(this.host.nativeElement, {
        childList: true,
        subtree: true,
      })
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
        tap(() => (this.defer = true)),
        map(
          (resourceTableHeader) => (this.resourceTable = resourceTableHeader)
        ),
        mergeMap((resourceTable) => {
          const { hash, pageToken, resourceId } = resourceTable;

          return this.setQueryParams({ hash }).then(() =>
            pageToken != null
              ? this.fetchResourceTablePageItems(resourceTable, pageToken).then(
                  () =>
                    resourceId != null
                      ? this.scrollTableRowIntoView(resourceId)
                      : Promise.resolve()
                )
              : Promise.resolve()
          );
        }),
        tap(() => (this.defer = false))
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
