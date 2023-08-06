import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Resource } from '@shared/schema/resource';
import { PropertyPath } from '@shared/schema/utility';
import { pull } from 'lodash';

@Component({
  selector: 'app-resource-table-columns',
  templateUrl: './resource-table-columns.component.html',
  styleUrls: ['./resource-table-columns.component.scss'],
})
export class ResourceTableColumnsComponent<I extends Resource.Item> {
  @Input() resourceTable!: Resource.Table<I>;

  @Output() change = new EventEmitter();

  private onPrimaryPathsChanged(): void {
    this.resourceTable.columns.forEach((resourceTableColumn) => {
      if (
        (resourceTableColumn.sortIndex =
          this.resourceTable.primaryPaths.indexOf(resourceTableColumn.path)) ===
        -1
      ) {
        delete resourceTableColumn.sortIndex;
      }
    });
  }

  protected onPrimaryPathDropped(event: CdkDragDrop<PropertyPath<I>[]>): void {
    moveItemInArray(
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );

    this.onPrimaryPathsChanged();
  }

  protected onPrimaryPathToggled(event: {
    item: PropertyPath<I>;
    state: boolean;
  }): void {
    if (event.state) {
      this.resourceTable.primaryPaths.push(event.item);
    } else {
      pull(this.resourceTable.primaryPaths, event.item);
    }

    this.onPrimaryPathsChanged();
  }
}
