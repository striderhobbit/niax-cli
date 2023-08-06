import { NgModule, inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  RouterModule,
  RouterStateSnapshot,
  Routes,
} from '@angular/router';
import { Resource } from '@shared/schema/resource';
import { pick } from 'lodash';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ResourceTableComponent } from './resource-table/resource-table.component';

const routes: Routes = [
  {
    component: ResourceTableComponent,
    path: 'resource/table',
    resolve: {
      resourceTable: <I extends Resource.Item>(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
      ): Observable<Resource.Table<I>> =>
        inject(ApiService<I>).getResourceTable(
          pick(
            route.queryParams,
            'hash',
            'limit',
            'paths',
            'resourceId',
            'resourceName'
          )
        ),
    },
    runGuardsAndResolvers: (from, to) =>
      from.queryParams['snapshotId'] !== to.queryParams['snapshotId'],
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
