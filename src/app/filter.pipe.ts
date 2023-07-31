import { Injectable, Pipe, PipeTransform } from '@angular/core';
import { filter } from 'lodash';

@Pipe({ name: 'filter' })
@Injectable()
export class FilterPipe implements PipeTransform {
  transform<T>(items: T[], predicate: string): T[] {
    return filter(items, predicate);
  }
}
