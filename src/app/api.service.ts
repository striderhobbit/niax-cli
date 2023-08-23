import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Request } from '@shared/schema/request';
import { Resource } from '@shared/schema/resource';
import { Observable, OperatorFunction, catchError } from 'rxjs';
import { WebSocketService } from './web-socket.service';

@Injectable({
  providedIn: 'root',
})
export class ApiService<I extends Resource.Item> {
  constructor(
    private readonly httpClient: HttpClient,
    private readonly webSocketService: WebSocketService
  ) {}

  public getResourceTable<T extends Request.GetResourceTable<I>['ResBody']>(
    query: Request.GetResourceTable<I>['ReqQuery']
  ): Observable<T> {
    return this.httpClient
      .get<T>(`http://localhost:3000/api/resource/table`, {
        params: query,
      })
      .pipe(this.pipeError());
  }

  public getResourceTableRowsPage<
    T extends Request.GetResourceTableRowsPage<I>['ResBody']
  >(query: Request.GetResourceTableRowsPage<I>['ReqQuery']): Observable<T> {
    return this.httpClient
      .get<T>(`http://localhost:3000/api/resource/table/rows/page`, {
        params: query,
      })
      .pipe(this.pipeError());
  }

  public patchResourceItem<T extends Request.PatchResourceItem<I>['ResBody']>(
    query: Request.PatchResourceItem<I>['ReqQuery'],
    body: Request.PatchResourceItem<I>['ReqBody']
  ): Observable<T> {
    return this.httpClient
      .patch<T>(`http://localhost:3000/api/resource/item`, body, {
        params: query,
      })
      .pipe(this.pipeError());
  }

  private pipeError<T>(): OperatorFunction<T, T> {
    return catchError((error) => {
      alert(error.message);

      throw error;
    });
  }
}
