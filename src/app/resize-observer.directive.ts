import {
  AfterViewInit,
  Directive,
  ElementRef,
  EventEmitter,
  OnDestroy,
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
export class ResizeObserverDirective implements AfterViewInit, OnDestroy {
  @Output() resize = new EventEmitter<ResizeObserverSize>();

  private readonly delay: number = 100;
  private readonly resizeEventSubject = new Subject<ResizeEvent>();

  private observer?: ResizeObserver;

  constructor(private readonly host: ElementRef) {}

  ngAfterViewInit(): void {
    this.createObserver();

    this.observe(this.host.nativeElement);
  }

  ngOnDestroy(): void {
    this.resizeEventSubject.complete();

    if (this.observer != null) {
      this.observer.disconnect();

      delete this.observer;
    }
  }

  private createObserver(): void {
    this.observer = new ResizeObserver((entries, observer) =>
      entries.forEach((entry) =>
        this.resizeEventSubject.next({ entry, observer })
      )
    );
  }

  private observe(element: Element): void {
    if (this.observer == null) {
      throw new Error('ResizeObserver not initialized');
    }

    this.resizeEventSubject
      .pipe(
        filter(({ entry: { target } }) => target === element),
        debounceTime(this.delay)
      )
      .subscribe(({ entry }) => this.resize.emit(entry.borderBoxSize[0]));

    this.observer.observe(element);
  }
}
