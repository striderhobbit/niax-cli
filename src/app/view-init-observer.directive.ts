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
  @Input() viewInitIgnored?: boolean;

  @Output() viewInit = new EventEmitter<HTMLElement>();

  constructor(private readonly host: ElementRef) {}

  ngAfterViewInit(): void {
    if (!this.viewInitIgnored) {
      this.viewInit.emit(this.host.nativeElement);
    }
  }
}
