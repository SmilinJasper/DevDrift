import '@testing-library/jest-dom';

// Polyfill for IntersectionObserver which is missing in jsdom
class IntersectionObserverMock {
  readonly root: Element | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];
  
  constructor() {}
  
  disconnect() {}
  observe() {}
  takeRecords() { return []; }
  unobserve() {}
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: IntersectionObserverMock,
});
