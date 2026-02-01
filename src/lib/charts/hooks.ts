/**
 * Responsive chart hooks for adaptive sizing and performance optimizations
 */

import { useEffect, useId, useMemo, useState } from "react";
import {
  CHART_ANIMATIONS,
  CHART_PERFORMANCE,
  createGradients,
  getResponsiveHeight,
  sampleData,
} from "./config";

/**
 * Hook for responsive chart height based on screen size
 */
export function useResponsiveHeight(baseHeight: number) {
  const [height, setHeight] = useState(baseHeight);

  useEffect(() => {
    const updateHeight = () => {
      setHeight(getResponsiveHeight(baseHeight));
    };

    updateHeight();

    // Debounced resize handler
    let timeoutId: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateHeight, CHART_PERFORMANCE.resizeDebounce);
    };

    window.addEventListener("resize", debouncedResize);
    return () => {
      window.removeEventListener("resize", debouncedResize);
      clearTimeout(timeoutId);
    };
  }, [baseHeight]);

  return height;
}

/**
 * Hook for optimized chart data with performance considerations
 */
export function useOptimizedChartData<T>(data: T[], enabled: boolean = true) {
  return useMemo(() => {
    if (!enabled || data.length <= CHART_PERFORMANCE.animationThreshold) {
      return {
        data,
        isAnimationEnabled: true,
        isSampled: false,
      };
    }

    // For large datasets, sample data and disable animations
    const sampledData =
      data.length > CHART_PERFORMANCE.maxDataPoints
        ? sampleData(data, CHART_PERFORMANCE.sampleSize)
        : data;

    return {
      data: sampledData,
      isAnimationEnabled: data.length <= CHART_PERFORMANCE.animationThreshold,
      isSampled: sampledData.length < data.length,
    };
  }, [data, enabled]);
}

/**
 * Hook for chart gradients with unique IDs to prevent conflicts
 */
export function useChartGradients() {
  const id = useId();
  return useMemo(() => createGradients(id), [id]);
}

/**
 * Hook for chart animation configuration based on data size
 */
export function useChartAnimations(dataLength: number) {
  return useMemo(() => {
    const shouldAnimate = dataLength <= CHART_ANIMATIONS.threshold;

    return {
      isAnimationActive: shouldAnimate,
      animationDuration: shouldAnimate ? CHART_ANIMATIONS.duration.medium : 0,
      animationEasing: CHART_ANIMATIONS.easing,
    };
  }, [dataLength]);
}

/**
 * Hook for chart accessibility props
 */
export function useChartAccessibility(ariaLabel: string, description?: string) {
  return useMemo(
    () => ({
      role: "img" as const,
      "aria-label": ariaLabel,
      "aria-description": description,
      focusable: false,
      tabIndex: -1,
    }),
    [ariaLabel, description],
  );
}
