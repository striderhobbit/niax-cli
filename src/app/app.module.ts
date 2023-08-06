import { DragDropModule } from '@angular/cdk/drag-drop';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { FilterPipe } from './filter.pipe';
import { IntersectionObserverDirective } from './intersection-observer.directive';
import { RegExpValidatorDirective } from './reg-exp-validator.directive';
import { ResourceTableComponent } from './resource-table/resource-table.component';
import { ViewInitObserverDirective } from './view-init-observer.directive';

@NgModule({
  declarations: [
    AppComponent,
    FilterPipe,
    IntersectionObserverDirective,
    RegExpValidatorDirective,
    ResourceTableComponent,
    ViewInitObserverDirective,
  ],
  imports: [
    AppRoutingModule,
    BrowserModule,
    DragDropModule,
    FormsModule,
    HttpClientModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
