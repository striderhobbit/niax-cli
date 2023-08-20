import {
  AfterViewInit,
  Directive,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
} from '@angular/core';
import { BehaviorSubject, Subject, debounceTime, filter } from 'rxjs';
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
  rootMarginSubject!: BehaviorSubject<CSSBoxMargin>;

  @Output() intersection = new EventEmitter<void>();

  private readonly delay: number = 100;
  private readonly threshold?: number;

  private instance?: IntersectionObserverInstance;

  constructor(private readonly host: ElementRef) {}

  ngAfterViewInit(): void {
    this.rootMarginSubject.subscribe({
      next: (margin) => {
        this.createInstance({
          threshold: this.threshold,
          rootMargin: [margin.top, margin.right, margin.bottom, margin.left]
            .map((px = 0) => `${px}px`)
            .join(' '),
        });

        this.observe(this.host.nativeElement);
      },
    });
  }

  ngOnDestroy(): void {
    this.destroyInstance();
  }

  private createInstance(options: IntersectionObserverInit): void {
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
        debounceTime(this.delay)
      )
      .subscribe(({ entry, observer }) => {
        if (entry.isIntersecting && !instance.subject.isStopped) {
          this.intersection.emit();

          observer.unobserve(entry.target);
        }
      });

    instance.observer.observe(element);
  }
}
