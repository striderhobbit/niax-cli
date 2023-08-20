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
  @Input() delay = 100;
  @Input() threshold = 0;

  @Output() intersection = new EventEmitter<void>();

  private observer?: IntersectionObserver;

  private readonly intersectionEventSubject = new Subject<IntersectionEvent>();

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
      .subscribe(async ({ entry: { isIntersecting, target }, observer }) => {
        if (isIntersecting) {
          this.intersection.emit();

          observer.unobserve(target);
        }
      });
  }
}
