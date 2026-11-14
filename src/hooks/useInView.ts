import { useEffect, useRef, useState, MutableRefObject } from "react";

interface UseInViewOptions {
  threshold?: number | number[];
  rootMargin?: string;
  once?: boolean;
  initialInView?: boolean;
}

/**
 * Lightweight, zero-dependency IntersectionObserver hook for high-performance,
 * GPU-accelerated entrance choreography and scroll-driven reveals.
 * Zero hydration mismatch: initializes consistently on server and client.
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(
  options: UseInViewOptions = {}
): [MutableRefObject<T | null>, boolean] {
  const { threshold = 0.15, rootMargin = "0px", once = true, initialInView = false } = options;
  const ref = useRef<T | null>(null);
  
  // Initialize with initialInView (false by default) to guarantee identical server and client HTML
  const [isInView, setIsInView] = useState<boolean>(initialInView);

  useEffect(() => {
    // In environments without IntersectionObserver (e.g. test or legacy), reveal immediately
    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") {
      setIsInView(true);
      return;
    }

    const node = ref.current;
    if (!node) return;

    if (once && isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (once) {
            observer.disconnect();
          }
        } else if (!once) {
          setIsInView(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, once, isInView]);

  return [ref, isInView];
}
