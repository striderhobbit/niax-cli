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

type DrilldownKey = 'columns' | 'sort';

@Component({
  selector: 'app-resource-table-columns',
  templateUrl: './resource-table-columns.component.html',
  styleUrls: ['./resource-table-columns.component.scss'],
})
export class ResourceTableColumnsComponent<I extends Resource.Item>
  implements AfterViewInit
{
  @HostBinding('tabindex') tabindex = -1;
  @ViewChildren('drilldownHandle')
  drilldownHandles!: QueryList<ElementRef<HTMLTableCellElement>>;

  @Input({ required: true }) resourceTable!: Resource.Table<I>;

  @Output() columnsChange = new EventEmitter();
  @Output() pathsChange = new EventEmitter();

  protected readonly uid = uniqueId();

  protected drilldownKey?: DrilldownKey;

  constructor(private readonly host: ElementRef) {}

  ngAfterViewInit(): void {
    this.drilldownHandles
      .map((handle) => handle.nativeElement)
      .forEach((handle) => {
        ['focus', 'mouseenter'].forEach((event) =>
          handle.addEventListener(
            event,
            () =>
              (this.drilldownKey = handle.dataset[
                'drilldownKey'
              ] as DrilldownKey)
          )
        );

        handle.setAttribute('tabindex', '0');
      });
  }

  protected onPathDropped(event: CdkDragDrop<PropertyPath<I>[]>): void {
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
  }

  public open(): boolean {
    delete this.drilldownKey;

    this.host.nativeElement.focus();

    return false;
  }
}
