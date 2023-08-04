import { Injectable, Pipe, PipeTransform } from '@angular/core';
import { filter } from 'lodash';

@Pipe({ name: 'filter' })
@Injectable()
export class FilterPipe implements PipeTransform {
  transform<I>(items: I[], predicate: string): I[] {
    return filter(items, predicate);
  }
}
