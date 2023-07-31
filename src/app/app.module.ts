import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { FilterPipe } from './filter.pipe';
import { IntersectionDirective } from './intersection.directive';
import { ResourceTableComponent } from './resource-table/resource-table.component';

@NgModule({
  declarations: [
    AppComponent,
    FilterPipe,
    IntersectionDirective,
    ResourceTableComponent,
  ],
  imports: [AppRoutingModule, BrowserModule, FormsModule, HttpClientModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
