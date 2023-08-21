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
import { ReplaySubject, Subject, debounceTime, filter, first } from 'rxjs';

interface IntersectionEvent {
  entry: IntersectionObserverEntry;
  observer: IntersectionObserver;
}

interface IntersectionObserverInstance {
  events: Subject<IntersectionEvent>;
  observer: IntersectionObserver;
}

@Directive({
  selector: '[observeIntersection]',
})
export class IntersectionObserverDirective
  implements OnInit, AfterViewInit, OnChanges, OnDestroy
{
  @Input('intersectionDelay') delay?: number;
  @Input('intersectionIgnored') ignored?: boolean;

  @Output() intersection = new EventEmitter<void>();

  private readonly emissions = new ReplaySubject<
    IntersectionEvent | undefined
  >();

  private currentEvent?: IntersectionEvent;

  private instance?: IntersectionObserverInstance;

  constructor(private readonly host: ElementRef) {}

  ngOnInit(): void {
    this.emissions
      .pipe(
        filter((event): event is IntersectionEvent => event != null),
        filter(({ entry }) => entry.isIntersecting),
        first()
      )
      .subscribe({
        next: ({ entry, observer }) => {
          this.intersection.emit();

          observer.unobserve(entry.target);
        },
      });

    this.createInstance();
  }

  ngAfterViewInit(): void {
    this.observe(this.host.nativeElement);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['ignored']?.previousValue) {
      this.emissions.next(this.currentEvent);
    }
  }

  ngOnDestroy(): void {
    this.destroyInstance();
  }

  private createInstance(): void {
    const events = new Subject<IntersectionEvent>();

    this.instance = {
      events,
      observer: new IntersectionObserver(
        (entries, observer) =>
          entries.forEach((entry) => events.next({ entry, observer })),
        {
          rootMargin: '-1px',
        }
      ),
    };
  }

  private destroyInstance(): void {
    if (this.instance != null) {
      this.instance.events.complete();
      this.instance.observer.disconnect();

      delete this.instance;
    }
  }

  private observe(element: Element): void {
    const { instance } = this;

    if (instance == null) {
      throw new Error(`${IntersectionObserver.name} not instantiated`);
    }

    instance.events
      .pipe(
        filter(({ entry: { target } }) => target === element),
        debounceTime(this.delay ?? 5e2)
      )
      .subscribe((event) => {
        this.currentEvent = event;

        if (!this.ignored) {
          this.emissions.next(event);
        }
      });

    instance.observer.observe(element);
  }
}
