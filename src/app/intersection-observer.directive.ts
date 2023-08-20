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

interface IntersectionEvent {
  entry: IntersectionObserverEntry;
  observer: IntersectionObserver;
}

@Directive({
  selector: '[observeIntersection]',
})
export class IntersectionObserverDirective
  implements OnInit, AfterViewInit, OnDestroy
{
  @Input('intersectionDelay') delay = 100;
  @Input('intersectionThreshold') threshold = 0;

  @Output() intersection = new EventEmitter<void>();

  private readonly intersectionEventSubject = new Subject<IntersectionEvent>();

  private observer?: IntersectionObserver;

  constructor(private readonly host: ElementRef) {}

  ngOnInit(): void {
    this.createObserver({
      threshold: this.threshold,
    });
  }

  ngAfterViewInit(): void {
    this.observe(this.host.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer!.disconnect();

    delete this.observer;

    this.intersectionEventSubject.complete();
  }

  private createObserver(options: IntersectionObserverInit): void {
    this.observer = new IntersectionObserver(
      (entries, observer) =>
        entries.forEach((entry) =>
          this.intersectionEventSubject.next({ entry, observer })
        ),
      options
    );
  }

  private observe(element: Element): void {
    this.observer!.observe(element);

    this.intersectionEventSubject
      .pipe(
        filter(({ entry: { target } }) => target === element),
        debounceTime(this.delay)
      )
      .subscribe(({ entry: { isIntersecting, target }, observer }) => {
        if (isIntersecting) {
          this.intersection.emit();

          observer.unobserve(target);
        }
      });
  }
}
