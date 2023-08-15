import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Resource } from '@shared/schema/resource';

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

  private visible?: boolean;

  public get isVisible(): boolean {
    return Boolean(this.visible);
  }

  public toggle(): void {
    this.visible = !this.visible;
  }
}
