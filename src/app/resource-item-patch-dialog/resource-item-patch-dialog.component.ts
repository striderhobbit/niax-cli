import { NgSwitch, NgSwitchCase, NgSwitchDefault } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Resource } from '@shared/schema/resource';
import { cloneDeep, isEqual, set } from 'lodash';

export interface ResourceItemPatchDialog<I extends Resource.Item> {
  ref: MatDialogRef<
    ResourceItemPatchDialogComponent<I>,
    Resource.TableField<I>
  >;
  data: Resource.TableField<I>;
}

@Component({
  selector: 'app-resource-item-patch-dialog',
  templateUrl: './resource-item-patch-dialog.component.html',
  styleUrls: ['./resource-item-patch-dialog.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    NgSwitch,
    NgSwitchCase,
    NgSwitchDefault,
  ],
})
export class ResourceItemPatchDialogComponent<I extends Resource.Item> {
  protected readonly fieldBackup: Resource.TableField<I>;

  protected readonly set = set;

  constructor(
    @Inject(MatDialogRef)
    protected readonly dialogRef: ResourceItemPatchDialog<I>['ref'],
    @Inject(MAT_DIALOG_DATA)
    protected readonly field: ResourceItemPatchDialog<I>['data']
  ) {
    this.fieldBackup = cloneDeep(field);
  }

  protected hasChanges(): boolean {
    return !isEqual(this.fieldBackup, this.field);
  }
}
