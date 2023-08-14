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
import { Subject, delay } from 'rxjs';

interface IntersectionEvent {
  target: HTMLElement;
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

  @Output() intersection = new EventEmitter<HTMLElement>();

  private observer?: IntersectionObserver;
  
  private readonly intersectionEventSubject = new Subject<IntersectionEvent>();

  constructor(private readonly host: ElementRef) {}

  ngOnInit(): void {
    this.createObserver({
      rootMargin: '0px',
      threshold: this.threshold,
    });
  }

  ngAfterViewInit(): void {
    this.startObservingElements();
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();

      delete this.observer;
    }

    this.intersectionEventSubject.complete();
  }

  private createObserver(options: IntersectionObserverInit): void {
    this.observer = new IntersectionObserver(
      (entries, observer) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.intersectionEventSubject.next({
              target: entry.target as HTMLElement,
              observer,
            });
          }
        }),
      options
    );
  }

  private isVisible(element: HTMLElement): Promise<boolean> {
    return new Promise((resolve) => {
      new IntersectionObserver(([entry], observer) => {
        resolve(entry.isIntersecting);

        observer.disconnect();
      }).observe(element);
    });
  }

  private startObservingElements(): void {
    if (this.observer) {
      this.observer.observe(this.host.nativeElement);

      this.intersectionEventSubject
        .pipe(delay(this.delay))
        .subscribe(async ({ target, observer }) => {
          if (await this.isVisible(target)) {
            this.intersection.emit(target);

            observer.unobserve(target);
          }
        });
    }
  }
}
