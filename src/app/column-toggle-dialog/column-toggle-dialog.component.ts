import { NgFor } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatListModule } from '@angular/material/list';
import { Resource } from '@shared/schema/resource';
import { zipWith } from 'lodash';
import { ChangeDetector } from '../change-detector';

export interface ColumnToggleDialog<I extends Resource.Item> {
  ref: MatDialogRef<ColumnToggleDialogComponent<I>, Resource.TableColumn<I>[]>;
  data: Resource.TableColumn<I>[];
}

@Component({
  selector: 'app-column-toggle-dialog',
  templateUrl: './column-toggle-dialog.component.html',
  styleUrls: [],
  standalone: true,
  imports: [MatButtonModule, MatDialogModule, MatListModule, NgFor],
})
export class ColumnToggleDialogComponent<
  I extends Resource.Item
> extends ChangeDetector<Resource.TableColumn<I>[]> {
  protected readonly columns: Resource.TableColumn<I>[];

  constructor(
    @Inject(MatDialogRef)
    protected readonly dialogRef: ColumnToggleDialog<I>['ref'],
    @Inject(MAT_DIALOG_DATA)
    data: ColumnToggleDialog<I>['data']
  ) {
    super(data);

    this.columns = this.data;
  }

  protected override isEqual(
    columnsA: Resource.TableColumn<I>[],
    columnsB: Resource.TableColumn<I>[]
  ): boolean {
    return zipWith(
      columnsA,
      columnsB,
      (columnA, columnB) => !columnA.include === !columnB.include
    ).every(Boolean);
  }
}
