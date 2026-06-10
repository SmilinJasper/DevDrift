"use client";

type ViewCallback = () => void;

class ViewObserverSingleton {
  private observer: IntersectionObserver | null = null;
  private callbacks: Map<Element, ViewCallback> = new Map();
  private timeouts: Map<Element, NodeJS.Timeout> = new Map();

  private init() {
    if (typeof window === "undefined" || this.observer) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const target = entry.target;
          
          if (entry.isIntersecting) {
            const timeout = setTimeout(() => {
              const callback = this.callbacks.get(target);
              if (callback) {
                callback();
                // Unobserve after the view is tracked to prevent firing multiple times
                this.unobserve(target);
              }
            }, 1500);
            this.timeouts.set(target, timeout);
          } else {
            const timeout = this.timeouts.get(target);
            if (timeout) {
              clearTimeout(timeout);
              this.timeouts.delete(target);
            }
          }
        });
      },
      { threshold: 0.5 }
    );
  }

  observe(element: Element, callback: ViewCallback) {
    this.init();
    this.callbacks.set(element, callback);
    this.observer?.observe(element);
  }

  unobserve(element: Element) {
    this.callbacks.delete(element);
    const timeout = this.timeouts.get(element);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(element);
    }
    this.observer?.unobserve(element);
  }
}

export const viewObserver = new ViewObserverSingleton();
