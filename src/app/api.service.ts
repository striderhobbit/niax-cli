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
    params: Request.GetResourceTable<I>['ReqParams'],
    query: Request.GetResourceTable<I>['ReqQuery']
  ): Observable<R> {
    return this.httpClient
      .get<R>(
        `http://localhost:3000/api/${params.resourceName}/resource/table`,
        {
          params: query,
        }
      )
      .pipe(this.pipeError());
  }

  public getResourceTableRowsPage<
    R extends Request.GetResourceTableRowsPage<I>['ResBody']
  >(
    params: Request.GetResourceTableRowsPage<I>['ReqParams'],
    query: Request.GetResourceTableRowsPage<I>['ReqQuery']
  ): Observable<R> {
    return this.httpClient
      .get<R>(
        `http://localhost:3000/api/${params.resourceName}/resource/table/rows/page`,
        { params: query }
      )
      .pipe(this.pipeError());
  }

  public patchResourceItem<R extends Request.PatchResourceItem<I>['ResBody']>(
    params: Request.PatchResourceItem<I>['ReqParams'],
    body: Request.PatchResourceItem<I>['ReqBody']
  ): Observable<R> {
    return this.httpClient
      .patch<R>(
        `http://localhost:3000/api/${params.resourceName}/resource/item`,
        body
      )
      .pipe(this.pipeError());
  }

  private pipeError<R>(): OperatorFunction<R, R> {
    return catchError((error) => {
      alert(error.message);

      throw error;
    });
  }
}
