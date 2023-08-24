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
import { cloneDeep, zipWith } from 'lodash';

export type ColumnToggleDialogRef<I extends Resource.Item> = MatDialogRef<
  ColumnToggleDialogComponent<I>,
  Resource.TableColumn<I>[]
>;

@Component({
  selector: 'app-column-toggle-dialog',
  templateUrl: './column-toggle-dialog.component.html',
  styleUrls: [],
  standalone: true,
  imports: [MatButtonModule, MatDialogModule, MatListModule, NgFor],
})
export class ColumnToggleDialogComponent<I extends Resource.Item> {
  private readonly columnsBackup: Resource.TableColumn<I>[];

  constructor(
    @Inject(MatDialogRef)
    protected readonly dialogRef: ColumnToggleDialogRef<I>,
    @Inject(MAT_DIALOG_DATA)
    protected readonly columns: Resource.TableColumn<I>[]
  ) {
    this.columnsBackup = cloneDeep(columns);
  }

  protected hasChanges(): boolean {
    return zipWith(
      this.columnsBackup,
      this.columns,
      (columnA, columnB) => !columnA.include != !columnB.include
    ).some(Boolean);
  }
}
