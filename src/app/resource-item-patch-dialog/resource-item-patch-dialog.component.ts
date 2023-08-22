import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { Resource } from '@shared/schema/resource';
import { cloneDeep, isEqual } from 'lodash';

@Component({
  selector: 'app-resource-item-patch-dialog',
  templateUrl: './resource-item-patch-dialog.component.html',
  styleUrls: [],
  standalone: true,
  imports: [MatButtonModule, MatDialogModule],
})
export class ResourceItemPatchDialogComponent<I extends Resource.Item> {
  private readonly fieldBackup: Resource.TableField<I>;

  constructor(
    protected readonly dialogRef: MatDialogRef<
      ResourceItemPatchDialogComponent<I>
    >,
    @Inject(MAT_DIALOG_DATA)
    protected readonly field: Resource.TableField<I>
  ) {
    this.fieldBackup = cloneDeep(field);
  }

  protected hasChanges(): boolean {
    return !isEqual(this.fieldBackup, this.field);
  }
}
