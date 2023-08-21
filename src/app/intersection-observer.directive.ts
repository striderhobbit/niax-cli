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

interface IntersectionObserverInstance {
  events: Subject<IntersectionEvent>;
  observer: IntersectionObserver;
}

@Directive({
  selector: '[observeIntersection]',
})
export class IntersectionObserverDirective
  implements OnInit, AfterViewInit, OnDestroy
{
  @Input('intersectionDelay') delay?: number;

  @Output() intersection = new EventEmitter<void>();

  private instance?: IntersectionObserverInstance;

  constructor(private readonly host: ElementRef) {}

  ngOnInit(): void {
    this.createInstance();
  }

  ngAfterViewInit(): void {
    this.observe(this.host.nativeElement);
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
      throw new Error('IntersectionObserver not instantiated');
    }

    instance.events
      .pipe(
        filter(({ entry: { target } }) => target === element),
        debounceTime(this.delay ?? 100)
      )
      .subscribe(({ entry, observer }) => {
        if (entry.isIntersecting) {
          this.intersection.emit();

          observer.unobserve(entry.target);
        }
      });

    instance.observer.observe(element);
  }
}
