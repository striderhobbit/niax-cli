import { Component, EventEmitter, Input, Output } from '@angular/core';
import { uniqueId } from 'lodash';

@Component({
  selector: 'app-checkbox',
  templateUrl: './checkbox.component.html',
  styleUrls: ['./checkbox.component.scss'],
})
export class CheckboxComponent {
  @Input() label?: string;
  @Input() value?: boolean;

  @Output('value') valueChange = new EventEmitter<boolean>();

  protected readonly id = `checkbox-${uniqueId()}`;
}
