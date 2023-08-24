import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';

@Component({
  selector: 'app-error-message-dialog',
  templateUrl: './error-message-dialog.component.html',
  styleUrls: [],
  standalone: true,
  imports: [MatButtonModule, MatDialogModule],
})
export class ErrorMessageDialogComponent {
  constructor(
    protected readonly dialogRef: MatDialogRef<ErrorMessageDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    protected readonly message: string
  ) {}
}
