import { Injectable } from '@angular/core';
import { WebSocket } from '@shared/schema/ws';
import { webSocket } from 'rxjs/webSocket';

@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  constructor() {
    webSocket<WebSocket.Message>({
      url: 'ws://localhost:8080',
      openObserver: {
        next: () => console.info('[web-socket-server] Connected.'),
      },
    }).subscribe({
      next: (message) => {
        switch (message.type) {
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
