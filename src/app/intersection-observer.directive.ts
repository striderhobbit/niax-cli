import {
  AfterViewInit,
  Directive,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
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
  implements OnInit, AfterViewInit, OnChanges, OnDestroy
{
  @Input('intersectionDelay') delay?: number;
  @Input('intersectionRootMargin') intersectionRootMargin?: number[];
  @Input('intersectionThreshold') threshold?: number;

  @Output() intersection = new EventEmitter<void>();

  private intersectionEventSubject?: Subject<IntersectionEvent>;

  private observer?: IntersectionObserver;

  constructor(private readonly host: ElementRef) {}

  ngOnInit(): void {
    this.createObserver();
  }

  ngAfterViewInit(): void {
    this.observe(this.host.nativeElement);
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.createObserver();

    this.observe(this.host.nativeElement);
  }

  ngOnDestroy(): void {
    this.destroyObserver();

    this.intersectionEventSubject?.complete();
  }

  private createObserver(): void {
    this.destroyObserver();

    const intersectionEventSubject = (this.intersectionEventSubject =
      new Subject<IntersectionEvent>());

    this.observer = new IntersectionObserver(
      (entries, observer) =>
        entries.forEach((entry) =>
          intersectionEventSubject.next({ entry, observer })
        ),
      {
        threshold: this.threshold,
        rootMargin:
          this.intersectionRootMargin &&
          this.intersectionRootMargin.map((px) => `${px}px`).join(' '),
      }
    );
  }

  private destroyObserver(): void {
    if (this.observer != null) {
      this.observer.disconnect();

      delete this.observer;
    }
  }

  private observe(element: Element): void {
    this.intersectionEventSubject!.pipe(
      filter(({ entry: { target } }) => target === element),
      debounceTime(this.delay ?? 100)
    ).subscribe(({ entry, observer }) => {
      if (entry.isIntersecting) {
        this.intersection.emit();

        observer.unobserve(entry.target);
      }
    });

    this.observer!.observe(element);
  }
}
