import {
  CdkDragDrop,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  Output,
  QueryList,
  ViewChildren,
} from '@angular/core';
import { Resource } from '@shared/schema/resource';
import { PropertyPath } from '@shared/schema/utility';
import { uniqueId } from 'lodash';

@Component({
  selector: 'app-resource-table-columns',
  templateUrl: './resource-table-columns.component.html',
  styleUrls: ['./resource-table-columns.component.scss'],
})
export class ResourceTableColumnsComponent<
  I extends Resource.Item,
  K extends 'columns' | 'sort'
> implements AfterViewInit
{
  @HostBinding('tabindex') tabindex = -1;
  @ViewChildren('item') items!: QueryList<ElementRef<HTMLTableRowElement>>;

  @Input({ required: true }) resourceTable!: Resource.Table<I>;

  @Output() columnsChange = new EventEmitter();
  @Output() pathsChange = new EventEmitter();

  protected readonly uid = uniqueId();

  protected selectedKey?: K;

  constructor(private readonly host: ElementRef) {}

  ngAfterViewInit(): void {
    this.items
      .map((item) => item.nativeElement)
      .forEach((tr) => {
        ['focus', 'mouseenter'].forEach((event) =>
          tr.addEventListener(
            event,
            () => (this.selectedKey = tr.dataset['key'] as K)
          )
        );

        tr.setAttribute('tabindex', '0');
      });
  }

  protected onPathDropped(
    event: CdkDragDrop<PropertyPath<I>[]>,
    container: HTMLTableElement
  ): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }

    this.pathsChange.emit();

    container.blur();
  }

  public open(): boolean {
    delete this.selectedKey;

    this.host.nativeElement.focus();

    return false;
  }
}
