import {
  AfterViewInit,
  Directive,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
} from '@angular/core';
import { isEqual } from 'lodash';
import {
  Observable,
  Subject,
  debounceTime,
  distinctUntilChanged,
  filter,
  tap,
} from 'rxjs';
import { CSSBoxMargin } from './resource-table/resource-table.component';

interface IntersectionEvent {
  entry: IntersectionObserverEntry;
  observer: IntersectionObserver;
}

interface IntersectionObserverInstance {
  subject: Subject<IntersectionEvent>;
  observer: IntersectionObserver;
}

@Directive({
  selector: '[observeIntersection]',
})
export class IntersectionObserverDirective implements AfterViewInit, OnDestroy {
  @Input({ alias: 'intersectionRootMargin', required: true })
  rootMargin!: Observable<CSSBoxMargin>;

  @Output() intersection = new EventEmitter<void>();

  private readonly delay: number = 100;
  private readonly threshold?: number;

  private hasEmitted?: boolean;

  private instance?: IntersectionObserverInstance;

  constructor(private readonly host: ElementRef) {}

  ngAfterViewInit(): void {
    this.rootMargin
      .pipe(
        distinctUntilChanged((a, b) => (console.log(a, b), isEqual(a, b))),
        tap((r) => console.log(performance.now(), 'observeIntersection', r)),
        debounceTime(500),
        tap((r) => console.log('coming through', r))
      )
      .subscribe({
        next: (margin) => {
          if (!this.hasEmitted) {
            this.createInstance({
              threshold: this.threshold,
              rootMargin: [margin.top, margin.right, margin.bottom, margin.left]
                .map((px = 0) => `${px}px`)
                .join(' '),
            });

            this.observe(this.host.nativeElement);
          }
        },
      });
  }

  ngOnDestroy(): void {
    this.destroyInstance();
  }

  private createInstance(options: IntersectionObserverInit): void {
    console.log(performance.now(), 'createInstance');
    this.destroyInstance();

    const subject = new Subject<IntersectionEvent>();

    this.instance = {
      subject,
      observer: new IntersectionObserver(
        (entries, observer) =>
          entries.forEach((entry) => subject.next({ entry, observer })),
        options
      ),
    };
  }

  private destroyInstance(): void {
    if (this.instance != null) {
      this.instance.subject.complete();
      this.instance.observer.disconnect();

      delete this.instance;
    }
  }

  private observe(element: Element): void {
    const { instance } = this;

    if (instance == null) {
      throw new Error('IntersectionObserver not instantiated');
    }

    instance.subject
      .pipe(
        filter(({ entry: { target } }) => target === element),
        tap((entry) =>
          console.log(performance.now(), 'intersectionEntry', entry)
        ),
        debounceTime(this.delay)
      )
      .subscribe(({ entry, observer }) => {
        if (
          entry.isIntersecting &&
          !instance.subject.isStopped &&
          !this.hasEmitted
        ) {
          console.log(performance.now(), 'emitting');
          this.hasEmitted = true;

          this.intersection.emit();

          observer.unobserve(entry.target);
        }
      });

    instance.observer.observe(element);
  }
}
