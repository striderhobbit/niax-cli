import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Resource } from '@shared/schema/resource';
import { PropertyPath } from '@shared/schema/utility';

@Component({
  selector: 'app-resource-table-columns',
  templateUrl: './resource-table-columns.component.html',
  styleUrls: ['./resource-table-columns.component.scss'],
})
export class ResourceTableColumnsComponent<I extends Resource.Item> {
  @Input() resourceTable!: Resource.Table<I>;

  @Output() columnsChange = new EventEmitter();
  @Output() primaryPathsChange = new EventEmitter();

  protected onPrimaryPathDropped(event: CdkDragDrop<PropertyPath<I>[]>): void {
    moveItemInArray(
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );

    this.primaryPathsChange.emit();
  }
}
