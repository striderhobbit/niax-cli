import { Component, ElementRef, OnInit } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { UniqItem } from '@shared/schema';
import { Resource } from '@shared/schema/resource';
import { pick, pickBy } from 'lodash';
import { filter, tap } from 'rxjs';
import { ApiService } from '../api.service';

@Component({
  selector: 'app-resource-table',
  templateUrl: './resource-table.component.html',
  styleUrls: ['./resource-table.component.scss'],
})
export class ResourceTableComponent<T extends UniqItem> implements OnInit {
  protected defer?: boolean;
  protected resourceTable?: Resource.Table<T>;

  constructor(
    private readonly apiService: ApiService<T>,
    private readonly host: ElementRef,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  protected readonly preserveOrder = () => 0;

  ngOnInit(): void {
    this.updateResourceTable();
  }

  protected updateResourceTableColumns(): void {
    this.setQueryParams({
      paths: Object.keys(pickBy(this.resourceTable?.columns, 'include')).join(
        ','
      ),
    }).then(() => this.updateResourceTable());
  }

  private updateResourceTable(): void {
    this.route.queryParams
      .pipe(filter((params) => 'resource' in params))
      .subscribe((params) =>
        this.apiService
          .getResourceTable(
            pick(params, 'resource'),
            pick(params, 'paths', 'limit', 'hash', 'resourceId')
          )
          .pipe(tap(() => (this.defer = true)))
          .subscribe({
            next: (resourceTableHeader) => {
              const { hash, pageToken, resourceId } = (this.resourceTable =
                resourceTableHeader);

              this.setQueryParams({ hash });

              if (pageToken != null) {
                this.getResourceTablePage(this.resourceTable, pageToken)
                  .then(() => this.scrollIntoView(resourceId))
                  .then(() => (this.defer = false));
              } else {
                this.defer = false;
              }
            },
          })
      );
  }

  private scrollIntoView(resourceId?: string): Promise<void> {
    return resourceId != null
      ? new Promise((resolve) =>
          new MutationObserver((mutations, observer) => {
            const row = this.host.nativeElement.querySelector(
              `tr[resource-id=${JSON.stringify(resourceId)}]`
            );

            if (row != null) {
              row.scrollIntoView({ block: 'start' });
              observer.disconnect();
              resolve();
            }
          }).observe(this.host.nativeElement, {
            childList: true,
            subtree: true,
          })
        )
      : Promise.resolve();
  }

  private setQueryParams(queryParams: Params): Promise<boolean> {
    return this.router.navigate([], {
      queryParams,
      queryParamsHandling: 'merge',
    });
  }

  protected getResourceTablePage(
    resourceTable: Resource.Table<T>,
    pageToken: string
  ): Promise<void> {
    return new Promise((resolve) =>
      this.apiService
        .getResourceTablePage(pick(resourceTable, 'resource'), {
          pageToken,
        })
        .subscribe({
          next: (page) => {
            resourceTable.rows[pageToken].items = page.items;

            resolve();
          },
        })
    );
  }

  protected patchResourceItem(
    resourceTable: Resource.Table<T>,
    resourceField: Resource.Field<T>
  ): void {
    this.setQueryParams({ resourceId: resourceField.id }).then(() =>
      this.apiService
        .patchResourceItem(pick(resourceTable, 'resource'), resourceField)
        .pipe(tap(() => this.updateResourceTable()))
        .subscribe()
    );
  }
}
