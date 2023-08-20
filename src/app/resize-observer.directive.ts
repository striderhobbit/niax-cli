import {
  AfterViewInit,
  Directive,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { Subject, debounceTime, filter } from 'rxjs';

interface ResizeEvent {
  entry: ResizeObserverEntry;
  observer: ResizeObserver;
}

@Directive({
  selector: '[observeResize]',
})
export class ResizeObserverDirective
  implements OnInit, AfterViewInit, OnDestroy
{
  @Input('resizeDelay') delay = 100;

  @Output() resize = new EventEmitter<ResizeObserverSize>();

  private readonly resizeEventSubject = new Subject<ResizeEvent>();

  private observer?: ResizeObserver;

  constructor(private readonly host: ElementRef) {}

  ngOnInit(): void {
    this.createObserver();
  }

  ngAfterViewInit(): void {
    this.observe(this.host.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer!.disconnect();

    delete this.observer;

    this.resizeEventSubject.complete();
  }

  private createObserver(): void {
    this.observer = new ResizeObserver((entries, observer) =>
      entries.forEach((entry) =>
        this.resizeEventSubject.next({ entry, observer })
      )
    );
  }

  private observe(element: Element): void {
    this.observer!.observe(element);

    this.resizeEventSubject
      .pipe(
        filter(({ entry: { target } }) => target === element),
        debounceTime(this.delay)
      )
      .subscribe(({ entry }) => this.resize.emit(entry.borderBoxSize[0]));
  }
}
