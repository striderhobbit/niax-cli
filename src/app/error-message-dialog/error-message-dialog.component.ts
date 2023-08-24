import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';

export type ErrorMessageDialogRef = MatDialogRef<
  ErrorMessageDialogComponent,
  void
>;

@Component({
  selector: 'app-error-message-dialog',
  templateUrl: './error-message-dialog.component.html',
  styleUrls: [],
  standalone: true,
  imports: [MatButtonModule, MatDialogModule],
})
export class ErrorMessageDialogComponent {
  constructor(
    @Inject(MatDialogRef)
    protected readonly dialogRef: ErrorMessageDialogRef,
    @Inject(MAT_DIALOG_DATA)
    protected readonly message: string
  ) {}
}
