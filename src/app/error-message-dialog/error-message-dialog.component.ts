import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { WebSocket } from '@shared/schema/ws';

export interface ErrorMessageDialog {
  ref: MatDialogRef<ErrorMessageDialogComponent, void>;
  data: WebSocket.ErrorMessage;
}

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
    protected readonly dialogRef: ErrorMessageDialog['ref'],
    @Inject(MAT_DIALOG_DATA)
    protected readonly message: ErrorMessageDialog['data']
  ) {}
}
