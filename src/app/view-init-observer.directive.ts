import {
  AfterViewInit,
  Directive,
  ElementRef,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

@Directive({
  selector: '[observeViewInit]',
})
export class ViewInitObserverDirective implements AfterViewInit {
  @Input() ignoreViewInit?: boolean;

  @Output() viewInit = new EventEmitter<HTMLElement>();

  constructor(private readonly host: ElementRef) {}

  ngAfterViewInit(): void {
    if (!this.ignoreViewInit) {
      this.viewInit.emit(this.host.nativeElement);
    }
  }
}
