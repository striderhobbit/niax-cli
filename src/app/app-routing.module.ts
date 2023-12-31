import { NgModule, inject } from '@angular/core';
import { ActivatedRouteSnapshot, RouterModule } from '@angular/router';
import { Resource } from '@shared/schema/resource';
import { pick } from 'lodash';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ResourceTableComponent } from './resource-table/resource-table.component';

@NgModule({
  imports: [
    RouterModule.forRoot(
      [
        {
          component: ResourceTableComponent,
          path: 'resource/table',
          resolve: {
            resourceTable: <I extends Resource.Item>(
              route: ActivatedRouteSnapshot
            ): Observable<Resource.Table<I>> =>
              inject(ApiService<I>).getResourceTable(
                pick(
                  route.queryParams,
                  'limit',
                  'cols',
                  'resourceId',
                  'resourceName'
                )
              ),
          },
          runGuardsAndResolvers: (from, to) =>
            from.queryParams['snapshotId'] !== to.queryParams['snapshotId'],
        },
      ],
      {
        anchorScrolling: 'enabled',
      }
    ),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
