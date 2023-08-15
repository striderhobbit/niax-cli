import { DragDropModule } from '@angular/cdk/drag-drop';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  ErrorStateMatcher,
  ShowOnDirtyErrorStateMatcher,
} from '@angular/material/core';
import {
  MAT_FORM_FIELD_DEFAULT_OPTIONS,
  MatFormFieldModule,
} from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { BrowserModule } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { FilterPipe } from './filter.pipe';
import { IntersectionObserverDirective } from './intersection-observer.directive';
import { RegExpValidatorDirective } from './reg-exp-validator.directive';
import { ResourceTableSettingsComponent } from './resource-table-settings/resource-table-settings.component';
import { ResourceTableComponent } from './resource-table/resource-table.component';
import { ViewInitObserverDirective } from './view-init-observer.directive';

@NgModule({
  declarations: [
    AppComponent,
    FilterPipe,
    IntersectionObserverDirective,
    RegExpValidatorDirective,
    ResourceTableComponent,
    ResourceTableSettingsComponent,
    ViewInitObserverDirective,
  ],
  imports: [
    AppRoutingModule,
    BrowserModule,
    DragDropModule,
    FormsModule,
    HttpClientModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatTableModule,
    MatTabsModule,
    NoopAnimationsModule,
  ],
  providers: [
    {
      provide: ErrorStateMatcher,
      useClass: ShowOnDirtyErrorStateMatcher,
    },
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: {
        subscriptSizing: 'dynamic',
      },
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
