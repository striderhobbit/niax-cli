import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { UniqItem } from '@shared/schema';
import { Request } from '@shared/schema/request';
import { Observable, OperatorFunction, catchError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ApiService<T extends UniqItem> {
  constructor(private readonly httpClient: HttpClient) {}

  public getResourceTable<R extends Request.GetResourceTable<T>['ResBody']>(
    params: Request.GetResourceTable<T>['ReqParams'],
    query: Request.GetResourceTable<T>['ReqQuery']
  ): Observable<R> {
    return this.httpClient
      .get<R>(`http://localhost:3000/api/resource/table/${params.resource}`, {
        params: query,
      })
      .pipe(this.pipeError());
  }

  public getResourceTableRowsPage<
    R extends Request.GetResourceTableRowsPage<T>['ResBody']
  >(
    params: Request.GetResourceTableRowsPage<T>['ReqParams'],
    query: Request.GetResourceTableRowsPage<T>['ReqQuery']
  ): Observable<R> {
    return this.httpClient
      .get<R>(
        `http://localhost:3000/api/resource/table/rows/page/${params.resource}`,
        { params: query }
      )
      .pipe(this.pipeError());
  }

  public patchResourceItem<R extends Request.PatchResourceItem<T>['ResBody']>(
    params: Request.PatchResourceItem<T>['ReqParams'],
    body: Request.PatchResourceItem<T>['ReqBody']
  ): Observable<R> {
    return this.httpClient
      .patch<R>(`http://localhost:3000/api/${params.resource}/item`, body)
      .pipe(this.pipeError());
  }

  private pipeError<R>(): OperatorFunction<R, R> {
    return catchError((error) => {
      alert(error.message);

      throw error;
    });
  }
}
