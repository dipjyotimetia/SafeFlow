import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import {
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

const metricCardVariants = cva(
  "card-trace group relative flex flex-col rounded-lg border p-5 transition-all duration-200 hover:-translate-y-px hover:border-border-strong",
  {
    variants: {
      variant: {
        default: "fintech-panel border-border/80",
        positive: "fintech-panel border-border/80",
        negative: "fintech-panel border-border/80",
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
    trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus;

  const valueColor =
    variant === "positive"
      ? "text-positive"
      : variant === "negative"
        ? "text-negative"
        : "text-foreground";

  return (
    <div
      data-slot="metric-card"
      className={cn(metricCardVariants({ variant }), className)}
      {...props}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="eyebrow">{title}</span>
        {Icon && (
          <Icon
            className={cn(
              "h-3.5 w-3.5",
              variant === "positive" && "text-positive",
              variant === "negative" && "text-negative",
              variant !== "positive" &&
                variant !== "negative" &&
                "text-[--text-subtle]",
            )}
            strokeWidth={1.5}
          />
        )}
      </div>

      <div className="mt-4">
        <p
          key={`${title}-${value}`}
          className={cn(
            "metric-value animate-wipe-in text-[34px] sm:text-[38px] tabular-nums",
            valueColor,
          )}
        >
          {value}
        </p>

        {(trend || description) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 animate-ticker">
            {trend && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg border px-1.5 py-0.5 text-[10px] font-mono font-medium uppercase tracking-[0.1em]",
                  trend === "up" &&
                    "border-success/40 bg-success/10 text-success",
                  trend === "down" &&
                    "border-destructive/40 bg-destructive/10 text-destructive",
                  trend === "neutral" &&
                    "border-border bg-muted/40 text-muted-foreground",
                )}
              >
                <TrendIcon className="h-3 w-3" strokeWidth={1.5} />
                {trendValue ?? "—"}
              </span>
            )}
            {description && (
              <span className="text-[10.5px] font-mono uppercase tracking-[0.14em] text-[--text-subtle]">
                {description}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export { MetricCard, metricCardVariants };
