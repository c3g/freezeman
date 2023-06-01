import { useRef, useCallback, useEffect, useState } from 'react';

/**
 * https://gist.github.com/DominicTobias/c8579667e8a8bd7817c1b4d5b274eb4c
 * */
export function useResizeObserver(width: number, height: number) {
  const ResizeObserver = window.ResizeObserver;
  const [size, setSize] = useState({ width, height });
  const resizeObserver = useRef<ResizeObserver | null>(null);

  const onResize: ResizeObserverCallback = useCallback((entries) => {
    const { width, height } = entries[0].contentRect;
    setSize({ width, height });
  }, []);

  const ref: React.LegacyRef<HTMLElement> = useCallback(
    (node: HTMLElement) => {
      if (node !== null) {
        if (resizeObserver.current) {
          resizeObserver.current.disconnect();
        }
        resizeObserver.current = new ResizeObserver(onResize);
        resizeObserver.current.observe(node);
      }
    },
    [ResizeObserver, onResize]
  );

  useEffect(() => () => {
    resizeObserver.current?.disconnect();
  }, []);

  return { ref, size };
}
