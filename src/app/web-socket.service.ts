import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { WebSocket } from '@shared/schema/ws';
import { firstValueFrom } from 'rxjs';
import { webSocket } from 'rxjs/webSocket';
import {
  ErrorMessageDialogComponent,
  ErrorMessageDialogRef,
} from './error-message-dialog/error-message-dialog.component';

@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  constructor(private readonly dialog: MatDialog) {
    webSocket<WebSocket.Message>({
      url: 'ws://localhost:8080',
      openObserver: {
        next: () => console.info('[web-socket-server] Connected.'),
      },
    }).subscribe({
      next: async (message) => {
        switch (message.type) {
          case 'error':
            if (message.body) {
              const dialogRef: ErrorMessageDialogRef = this.dialog.open(
                ErrorMessageDialogComponent,
                {
                  data: message.body,
                }
              );

              await firstValueFrom(dialogRef.afterClosed());
            }

            break;
          case 'text':
            console.info(
              `[web-socket-server] %c${message.body}`,
              'color: lime'
            );
        }
      },
      error: (error) => {
        switch (error.type) {
          case 'close':
            console.info('[web-socket-server] Connection closed.');
        }
      },
    });
  }
}
