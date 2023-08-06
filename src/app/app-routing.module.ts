import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ResourceTableComponent } from './resource-table/resource-table.component';

const routes: Routes = [
  {
    path: ':resourceName/resource/table',
    component: ResourceTableComponent,
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
