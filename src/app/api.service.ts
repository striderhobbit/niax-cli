import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Request } from '@shared/schema/request';
import { Resource } from '@shared/schema/resource';
import { Observable, OperatorFunction, catchError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ApiService<I extends Resource.Item> {
  constructor(private readonly httpClient: HttpClient) {}

  public getResourceTable<R extends Request.GetResourceTable<I>['ResBody']>(
    query: Request.GetResourceTable<I>['ReqQuery']
  ): Observable<R> {
    return this.httpClient
      .get<R>(`http://localhost:3000/api/resource/table`, {
        params: query,
      })
      .pipe(this.pipeError());
  }

  public getResourceTableRowsPage<
    R extends Request.GetResourceTableRowsPage<I>['ResBody']
  >(query: Request.GetResourceTableRowsPage<I>['ReqQuery']): Observable<R> {
    return this.httpClient
      .get<R>(`http://localhost:3000/api/resource/table/rows/page`, {
        params: query,
      })
      .pipe(this.pipeError());
  }

  public patchResourceItem<R extends Request.PatchResourceItem<I>['ResBody']>(
    query: Request.PatchResourceItem<I>['ReqQuery'],
    body: Request.PatchResourceItem<I>['ReqBody']
  ): Observable<R> {
    return this.httpClient
      .patch<R>(`http://localhost:3000/api/resource/item`, body, {
        params: query,
      })
      .pipe(this.pipeError());
  }

  private pipeError<R>(): OperatorFunction<R, R> {
    return catchError((error) => {
      alert(error.message);

      throw error;
    });
  }
}
