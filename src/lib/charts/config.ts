/**
 * Centralized chart configuration and theming
 * Provides consistent styling, colors, and performance optimizations across all charts
 */

// Chart Color Palettes
export const CHART_COLORS = {
  primary: {
    emerald: "oklch(0.55 0.15 160)",
    teal: "oklch(0.6 0.12 180)",
    gold: "oklch(0.7 0.14 85)",
    slate: "oklch(0.5 0.08 220)",
    success: "oklch(0.65 0.18 145)",
    cyan: "oklch(0.6 0.1 200)",
    purple: "oklch(0.55 0.12 280)",
    coral: "oklch(0.65 0.15 30)",
    lime: "oklch(0.6 0.14 120)",
    indigo: "oklch(0.5 0.1 260)",
  },
  category: [
    "oklch(0.55 0.15 160)", // emerald primary
    "oklch(0.6 0.12 180)", // teal
    "oklch(0.7 0.14 85)", // gold accent
    "oklch(0.5 0.08 220)", // slate blue
    "oklch(0.65 0.18 145)", // success green
    "oklch(0.6 0.1 200)", // cyan
    "oklch(0.55 0.12 280)", // purple
    "oklch(0.65 0.15 30)", // coral
    "oklch(0.6 0.14 120)", // lime
    "oklch(0.5 0.1 260)", // indigo
  ],
  semantic: {
    positive: "oklch(0.65 0.18 145)", // green
    negative: "oklch(0.65 0.2 25)", // red
    neutral: "oklch(0.6 0.02 160)", // muted
    warning: "oklch(0.7 0.14 85)", // amber
    info: "oklch(0.6 0.12 220)", // blue
  },
  investment: {
    etf: "oklch(0.55 0.15 160)", // emerald
    stock: "oklch(0.6 0.12 220)", // blue
    crypto: "oklch(0.65 0.18 45)", // orange
    "managed-fund": "oklch(0.55 0.12 280)", // purple
  },
} as const;

// Animation Configurations
export const CHART_ANIMATIONS = {
  duration: {
    fast: 300,
    medium: 600,
    slow: 800,
  },
  easing: "ease-out" as const,
  // Disable animations for large datasets to improve performance
  threshold: 100,
} as const;

// Responsive Configurations
export const CHART_RESPONSIVE = {
  minHeight: {
    compact: 160,
    standard: 200,
    large: 300,
  },
  breakpoints: {
    mobile: 640,
    tablet: 768,
    desktop: 1024,
  },
} as const;

// Common Chart Props
export const CHART_DEFAULTS = {
  margin: { top: 10, right: 10, left: 10, bottom: 10 },
  grid: {
    strokeDasharray: "3 3",
    className: "stroke-muted",
  },
  axis: {
    tick: {
      fontSize: 11,
      fill: "hsl(var(--muted-foreground))",
    },
  },
} as const;

// Gradient Definitions Factory
export function createGradients(id: string) {
  return {
    income: {
      id: `incomeGradient-${id}`,
      stops: [
        { offset: "0%", color: CHART_COLORS.semantic.positive, opacity: 1 },
        { offset: "100%", color: "oklch(0.55 0.16 145)", opacity: 1 },
      ],
    },
    expense: {
      id: `expenseGradient-${id}`,
      stops: [
        { offset: "0%", color: CHART_COLORS.semantic.negative, opacity: 1 },
        { offset: "100%", color: "oklch(0.55 0.18 25)", opacity: 1 },
      ],
    },
    net: {
      id: `netGradient-${id}`,
      stops: [
        { offset: "0%", color: "oklch(0.55 0.18 265)", opacity: 1 },
        { offset: "100%", color: "oklch(0.60 0.16 280)", opacity: 1 },
      ],
    },
    area: {
      id: `areaGradient-${id}`,
      stops: [
        { offset: "0%", color: CHART_COLORS.primary.emerald, opacity: 0.3 },
        { offset: "100%", color: CHART_COLORS.primary.emerald, opacity: 0 },
      ],
    },
  };
}

// Performance Optimization Settings
export const CHART_PERFORMANCE = {
  // Debounce resize events
  resizeDebounce: 200,
  // Limit animation when many data points
  animationThreshold: 100,
  // Maximum data points before sampling
  maxDataPoints: 500,
  // Sample data points for performance
  sampleSize: 100,
} as const;

// Accessibility defaults
export const CHART_ACCESSIBILITY = {
  role: "img",
  focusable: "false",
  tabIndex: -1,
} as const;

// Data sampling utility for performance
export function sampleData<T>(data: T[], targetSize: number): T[] {
  if (data.length <= targetSize) return data;

  const step = Math.floor(data.length / targetSize);
  const sampled: T[] = [];

  // Always include first and last points
  sampled.push(data[0]);

  for (let i = step; i < data.length - 1; i += step) {
    sampled.push(data[i]);
  }

  sampled.push(data[data.length - 1]);
  return sampled;
}

// Responsive height hook utility
export function getResponsiveHeight(
  baseHeight: number,
  screenWidth?: number,
): number {
  if (typeof window === "undefined") return baseHeight;

  const width = screenWidth || window.innerWidth;

  if (width < CHART_RESPONSIVE.breakpoints.mobile) {
    return Math.max(CHART_RESPONSIVE.minHeight.compact, baseHeight * 0.7);
  }

  if (width < CHART_RESPONSIVE.breakpoints.desktop) {
    return Math.max(CHART_RESPONSIVE.minHeight.standard, baseHeight * 0.85);
  }

  return baseHeight;
}

export type ChartColorPalette = keyof typeof CHART_COLORS;
export type ChartColorKey = keyof typeof CHART_COLORS.primary;
export type SemanticColor = keyof typeof CHART_COLORS.semantic;
export type InvestmentType = keyof typeof CHART_COLORS.investment;
