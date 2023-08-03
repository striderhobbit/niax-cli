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

@Directive({
  selector: '[observeIntersection]',
})
export class IntersectionObserverDirective
  implements OnDestroy, OnInit, AfterViewInit
{
  @Input() debounceTime = 300;
  @Input() ignoreIntersection?: boolean;
  @Input() threshold = 0;

  @Output() intersection = new EventEmitter<HTMLElement>();

  private observer?: IntersectionObserver;
  private readonly subject = new Subject<{
    target: HTMLElement;
    observer: IntersectionObserver;
  }>();

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
    if (this.observer != null) {
      this.observer.disconnect();

      delete this.observer;
    }

    this.subject.complete();
  }

  private createObserver(options: IntersectionObserverInit): void {
    this.observer = new IntersectionObserver(
      (entries, observer) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.subject.next({
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
    if (this.observer != null) {
      this.observer.observe(this.host.nativeElement);

      this.subject
        .pipe(delay(this.debounceTime))
        .subscribe(async ({ target, observer }) => {
          if (!this.ignoreIntersection && (await this.isVisible(target))) {
            this.intersection.emit(target);

            observer.unobserve(target);
          }
        });
    }
  }
}
