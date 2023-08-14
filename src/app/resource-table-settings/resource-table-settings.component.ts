import {
  CdkDragDrop,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Resource } from '@shared/schema/resource';
import { PropertyPath } from '@shared/schema/utility';

type TabKey = 'columns' | 'sort';

@Component({
  host: {
    '[hidden]': '!visible',
  },
  selector: 'app-resource-table-settings',
  templateUrl: './resource-table-settings.component.html',
  styleUrls: ['./resource-table-settings.component.scss'],
})
export class ResourceTableSettingsComponent<I extends Resource.Item> {
  @Input({ required: true }) resourceTable!: Resource.Table<I>;

  @Output() columnsChange = new EventEmitter();
  @Output() pathsChange = new EventEmitter();

  private visible?: boolean;

  protected readonly tabKeys: TabKey[] = ['columns', 'sort'];

  protected tabKey: TabKey = 'columns';

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
