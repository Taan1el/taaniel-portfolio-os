import { useEffect, useRef, useState } from "react";
import {
  createDesktopGridMetrics,
  getGridPixelPosition,
  getGridPositionFromPixels,
} from "@/lib/desktop-grid";
import type { DesktopGridMetrics, DesktopGridPosition } from "@/types/system";

function getFallbackMetrics() {
  if (typeof window === "undefined") {
    return createDesktopGridMetrics(1280, 720);
  }

  return createDesktopGridMetrics(window.innerWidth, Math.max(480, window.innerHeight - 84));
}

export function useGridSystem<T extends HTMLElement>() {
  const containerRef = useRef<T | null>(null);
  const [metrics, setMetrics] = useState<DesktopGridMetrics>(() => getFallbackMetrics());

  useEffect(() => {
    const element = containerRef.current;

    if (!element) {
      return;
    }

    const updateMetrics = () => {
      const nextMetrics = createDesktopGridMetrics(element.clientWidth, element.clientHeight);
      setMetrics((currentMetrics) => {
        if (
          currentMetrics.columns === nextMetrics.columns &&
          currentMetrics.rows === nextMetrics.rows &&
          currentMetrics.width === nextMetrics.width &&
          currentMetrics.height === nextMetrics.height
        ) {
          return currentMetrics;
        }

        return nextMetrics;
      });
    };

    updateMetrics();
    const resizeObserver = new ResizeObserver(updateMetrics);
    resizeObserver.observe(element);

    return () => resizeObserver.disconnect();
  }, []);

  return {
    containerRef,
    ...metrics,
    toPixels: (position: DesktopGridPosition) => getGridPixelPosition(position, metrics),
    fromPixels: (x: number, y: number) => getGridPositionFromPixels(x, y, metrics),
  };
}
