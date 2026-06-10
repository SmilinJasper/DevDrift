"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Hook for implementing infinite scroll via IntersectionObserver.
 * 
 * @param callback The function to call when the sentinel element intersects
 * @param options IntersectionObserver options
 * @returns A ref to attach to the sentinel element
 */
export function useInfiniteScroll(
  callback: () => void,
  options?: IntersectionObserverInit
) {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!node) return;

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry.isIntersecting) {
        callbackRef.current();
      }
    }, options || { rootMargin: "200px" });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [node, options]);

  return setNode;
}
