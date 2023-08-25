import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { WebSocket } from '@shared/schema/ws';

export interface TextMessageDialog {
  ref: MatDialogRef<TextMessageDialogComponent, void>;
  data: WebSocket.TextMessage;
}

@Component({
  selector: 'app-text-message-dialog',
  templateUrl: './text-message-dialog.component.html',
  styleUrls: [],
  standalone: true,
  imports: [MatButtonModule, MatDialogModule, MatIconModule],
})
export class TextMessageDialogComponent {
  constructor(
    @Inject(MatDialogRef)
    protected readonly dialogRef: TextMessageDialog['ref'],
    @Inject(MAT_DIALOG_DATA)
    protected readonly message: TextMessageDialog['data']
  ) {}
}
