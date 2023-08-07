import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import {
  Component,
  ElementRef,
  EventEmitter,
  HostBinding,
  Input,
  Output,
} from '@angular/core';
import { Resource } from '@shared/schema/resource';
import { PropertyPath } from '@shared/schema/utility';
import { uniqueId } from 'lodash';

@Component({
  selector: 'app-resource-table-columns',
  templateUrl: './resource-table-columns.component.html',
  styleUrls: ['./resource-table-columns.component.scss'],
})
export class ResourceTableColumnsComponent<I extends Resource.Item> {
  @HostBinding('tabindex') tabindex = -1;

  @Input({ required: true }) resourceTable!: Resource.Table<I>;

  @Output() columnsChange = new EventEmitter();
  @Output() primaryPathsChange = new EventEmitter();

  protected readonly uid = uniqueId();

  constructor(private readonly host: ElementRef) {}

  public focus(): boolean {
    this.host.nativeElement.focus();

    return false;
  }

  protected onPrimaryPathDropped(event: CdkDragDrop<PropertyPath<I>[]>): void {
    moveItemInArray(
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );

    this.primaryPathsChange.emit();
  }
}
