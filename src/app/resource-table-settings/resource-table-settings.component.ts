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
  Input,
  Output,
  QueryList,
  ViewChildren,
} from '@angular/core';
import { Resource } from '@shared/schema/resource';
import { PropertyPath } from '@shared/schema/utility';
import { uniqueId } from 'lodash';

type TabKey = 'columns' | 'sort';

@Component({
  selector: 'app-resource-table-settings',
  templateUrl: './resource-table-settings.component.html',
  styleUrls: ['./resource-table-settings.component.scss'],
})
export class ResourceTableSettingsComponent<I extends Resource.Item>
  implements AfterViewInit
{
  @ViewChildren('tab') tabs!: QueryList<ElementRef<HTMLTableRowElement>>;

  @Input({ required: true }) resourceTable!: Resource.Table<I>;

  @Output() columnsChange = new EventEmitter();
  @Output() pathsChange = new EventEmitter();

  #tabKey?: TabKey;

  get tabKey(): TabKey | undefined {
    return this.#tabKey;
  }

  set tabKey(newValue: TabKey | undefined) {
    this.#tabKey = newValue;

    this.tabs
      .map((tab) => tab.nativeElement)
      .forEach((tab) =>
        tab.classList.toggle('selected', tab.dataset['key'] === this.tabKey)
      );
  }

  protected readonly uid = uniqueId();
  protected visible?: boolean;

  constructor() {}

  ngAfterViewInit(): void {
    this.tabs
      .map((tab) => tab.nativeElement)
      .forEach((tab) => {
        const tabHandle = tab.querySelector('.tab-handle') as HTMLElement;
        const tabKey = (tab.dataset['key'] = tabHandle.textContent as TabKey);

        tabHandle.addEventListener('click', () => (this.tabKey = tabKey));

        tab
          .querySelector('.tab-content')!
          .classList.add(`tab-content__${tabKey}`);
      });

    this.tabKey = 'columns';
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

  public toggle(): void {
    this.visible = !this.visible;
  }
}
