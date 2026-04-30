/**
 * Centralized chart configuration and theming
 * Provides consistent styling, colors, and performance optimizations across all charts
 */

// Chart Color Palettes — VAULT: acid accent + monochrome ramp.
// Uses CSS custom properties so palette stays in sync with theme tokens.
export const CHART_COLORS = {
  primary: {
    emerald: "var(--primary)",
    teal: "var(--chart-3)",
    gold: "oklch(0.82 0.16 75)",
    slate: "var(--chart-4)",
    success: "var(--success)",
    cyan: "var(--chart-3)",
    purple: "var(--chart-5)",
    coral: "var(--destructive)",
    lime: "var(--primary)",
    indigo: "var(--chart-2)",
  },
  category: [
    "var(--primary)", // acid accent — primary series
    "oklch(0.7 0.005 240)", // mono 700
    "oklch(0.55 0.005 240)", // mono 550
    "oklch(0.4 0.005 240)", // mono 400
    "oklch(0.82 0.003 240)", // mono 850
    "oklch(0.62 0.005 240)", // mono 620
    "oklch(0.48 0.005 240)", // mono 480
    "oklch(0.75 0.003 240)", // mono 750
    "oklch(0.58 0.005 240)", // mono 580
    "oklch(0.42 0.005 240)", // mono 420
  ],
  semantic: {
    positive: "var(--success)",
    negative: "var(--destructive)",
    neutral: "oklch(0.55 0.005 240)",
    warning: "var(--warning)",
    info: "var(--primary)",
  },
  investment: {
    etf: "var(--primary)", // acid (primary holding)
    stock: "oklch(0.7 0.005 240)", // mono
    crypto: "oklch(0.82 0.16 75)", // amber accent
    "managed-fund": "oklch(0.5 0.005 240)", // mono dim
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
    strokeDasharray: "2 4",
    className: "stroke-border",
    vertical: false,
  },
  axis: {
    axisLine: false,
    tickLine: false,
    tickMargin: 8,
    tick: {
      fontSize: 10,
      fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
      fill: "var(--text-subtle)",
      letterSpacing: "0.08em",
    },
  },
} as const;

// Gradient Definitions Factory
export function createGradients(id: string) {
  return {
    income: {
      id: `incomeGradient-${id}`,
      stops: [
        { offset: "0%", color: "var(--success)", opacity: 0.95 },
        { offset: "100%", color: "var(--success)", opacity: 0.65 },
      ],
    },
    expense: {
      id: `expenseGradient-${id}`,
      stops: [
        { offset: "0%", color: "var(--destructive)", opacity: 0.85 },
        { offset: "100%", color: "var(--destructive)", opacity: 0.55 },
      ],
    },
    net: {
      id: `netGradient-${id}`,
      stops: [
        { offset: "0%", color: "var(--primary)", opacity: 1 },
        { offset: "100%", color: "var(--primary)", opacity: 0.85 },
      ],
    },
    area: {
      id: `areaGradient-${id}`,
      stops: [
        { offset: "0%", color: "var(--primary)", opacity: 0.28 },
        { offset: "100%", color: "var(--primary)", opacity: 0 },
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
