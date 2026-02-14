import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const metricCardVariants = cva(
  "group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300",
  {
    variants: {
      variant: {
        default:
          "border-border/70 bg-card/90 shadow-premium hover:-translate-y-0.5 hover:shadow-premium-lg",
        glass:
          "glass border-border/70 shadow-premium hover:-translate-y-0.5 hover:shadow-premium-lg",
        gradient:
          "gradient-card border-border/70 shadow-premium hover:-translate-y-0.5 hover:shadow-premium-lg",
        positive:
          "border-success/30 bg-linear-to-b from-card to-success/8 shadow-premium hover:-translate-y-0.5 hover:shadow-premium-lg",
        negative:
          "border-destructive/25 bg-linear-to-b from-card to-destructive/8 shadow-premium hover:-translate-y-0.5 hover:shadow-premium-lg",
        luxury:
          "glass-luxury border-border/70 shadow-premium-lg hover:-translate-y-1",
        floating:
          "border-border/70 bg-card/90 shadow-premium-lg hover:-translate-y-1 animate-float-slow",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface MetricCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof metricCardVariants> {
  title: string;
  value: string;
  description?: string;
  icon?: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}

function MetricCard({
  className,
  variant,
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendValue,
  ...props
}: MetricCardProps) {
  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  return (
    <div
      data-slot="metric-card"
      className={cn(metricCardVariants({ variant }), className)}
      {...props}
    >
      <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-transparent via-transparent to-primary/5" />

      <div className="relative flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {Icon && (
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl",
              variant === "positive" && "bg-success/15",
              variant === "negative" && "bg-destructive/15",
              variant !== "positive" && variant !== "negative" && "bg-primary/15",
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4",
                variant === "positive" && "text-success",
                variant === "negative" && "text-destructive",
                variant !== "positive" && variant !== "negative" && "text-primary",
              )}
            />
          </div>
        )}
      </div>

      <div className="relative mt-3">
        <p
          className={cn(
            "metric-value animate-number text-3xl font-semibold leading-tight tabular-nums",
            variant === "positive" && "text-success",
            variant === "negative" && "text-destructive",
          )}
        >
          {value}
        </p>

        {(trend || description) && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {trend && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  trend === "up" && "bg-success/15 text-success",
                  trend === "down" && "bg-destructive/15 text-destructive",
                  trend === "neutral" && "bg-muted text-muted-foreground",
                )}
              >
                <TrendIcon className="h-3 w-3" />
                {trendValue ?? "Change"}
              </span>
            )}
            {description && (
              <span className="text-xs text-muted-foreground">{description}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export { MetricCard, metricCardVariants };
