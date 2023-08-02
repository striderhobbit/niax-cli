import { Component, ElementRef, OnInit } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { UniqItem } from '@shared/schema';
import { Resource } from '@shared/schema/resource';
import { pick, pickBy } from 'lodash';
import { filter, firstValueFrom, mergeMap, tap } from 'rxjs';
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

  protected async getResourceTablePageItems(
    resourceTable: Resource.Table<T>,
    pageToken: string
  ): Promise<Resource.TableRow<T>[]> {
    return (
      resourceTable.rows[pageToken].items ??
      firstValueFrom(
        this.apiService.getResourceTablePage(pick(resourceTable, 'resource'), {
          pageToken,
        })
      ).then((page) => (resourceTable.rows[pageToken].items = page.items))
    );
  }

  protected patchResourceItem(
    resourceTable: Resource.Table<T>,
    resourceTableField: Resource.TableField<T>
  ): Promise<void> {
    return this.setQueryParams({ resourceId: resourceTableField.id })
      .then(() =>
        firstValueFrom(
          this.apiService.patchResourceItem(
            pick(resourceTable, 'resource'),
            resourceTableField
          )
        )
      )
      .then(() => this.updateResourceTable());
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
        tap(() => (this.defer = true))
      )
    )
      .then((resourceTableHeader) => (this.resourceTable = resourceTableHeader))
      .then(async (resourceTable) => {
        const { hash, pageToken, resourceId } = resourceTable;

        this.setQueryParams({ hash });

        return (
          pageToken != null &&
          this.getResourceTablePageItems(resourceTable, pageToken).then(
            async () =>
              resourceId != null && this.scrollTableRowIntoView(resourceId)
          )
        );
      })
      .then(() => {
        this.defer = false;
      });
  }

  protected updateResourceTableColumns(): Promise<void> {
    return this.setQueryParams({
      paths: Object.keys(pickBy(this.resourceTable!.columns, 'include')).join(
        ','
      ),
    }).then(() => this.updateResourceTable());
  }
}
