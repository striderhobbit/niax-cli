import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { WebSocket } from '@shared/schema/ws';
import { firstValueFrom } from 'rxjs';
import { webSocket } from 'rxjs/webSocket';
import {
  TextMessageDialog,
  TextMessageDialogComponent,
} from './text-message-dialog/text-message-dialog.component';

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
              const dialogRef: TextMessageDialog['ref'] = this.dialog.open<
                TextMessageDialogComponent,
                TextMessageDialog['data']
              >(TextMessageDialogComponent, {
                data: message,
              });

              await firstValueFrom(dialogRef.afterClosed());
            }

            break;
          case 'info':
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
