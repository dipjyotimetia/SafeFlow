import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const metricCardVariants = cva(
  "relative overflow-hidden rounded-xl border p-6 transition-all duration-300 group",
  {
    variants: {
      variant: {
        default: [
          "bg-card",
          "shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.04)]",
          "hover:shadow-[0_2px_6px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.06)]",
          "hover:-translate-y-0.5",
          "border-border/40",
          "dark:shadow-[0_1px_3px_rgba(0,0,0,0.2),0_4px_12px_rgba(0,0,0,0.15)]",
          "dark:hover:shadow-[0_2px_6px_rgba(0,0,0,0.25),0_8px_24px_rgba(0,0,0,0.2)]",
        ].join(" "),
        gradient: [
          "gradient-card",
          "shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.04)]",
          "hover:shadow-[0_2px_6px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.06)]",
          "hover:-translate-y-0.5",
          "border-border/30",
        ].join(" "),
        positive: [
          "bg-gradient-to-br from-card via-card to-success/8",
          "shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.04)]",
          "hover:shadow-[0_2px_6px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.06),0_0_20px_-5px_rgba(34,197,94,0.15)]",
          "hover:-translate-y-0.5",
          "border-success/10",
          "dark:to-success/10",
          "dark:border-success/15",
        ].join(" "),
        negative: [
          "bg-gradient-to-br from-card via-card to-destructive/8",
          "shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.04)]",
          "hover:shadow-[0_2px_6px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.06),0_0_20px_-5px_rgba(239,68,68,0.15)]",
          "hover:-translate-y-0.5",
          "border-destructive/10",
          "dark:to-destructive/10",
          "dark:border-destructive/15",
        ].join(" "),
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface MetricCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof metricCardVariants> {
  title: string
  value: string
  description?: string
  icon?: LucideIcon
  trend?: "up" | "down" | "neutral"
  trendValue?: string
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
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus

  return (
    <div
      data-slot="metric-card"
      className={cn(metricCardVariants({ variant }), className)}
      {...props}
    >
      {/* Subtle gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/[0.02] pointer-events-none rounded-xl" />

      <div className="relative flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground tracking-wide">{title}</p>
        {Icon && (
          <div className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-300",
            variant === "positive" && "bg-success/10 group-hover:bg-success/15",
            variant === "negative" && "bg-destructive/10 group-hover:bg-destructive/15",
            variant !== "positive" && variant !== "negative" && "bg-primary/10 group-hover:bg-primary/15"
          )}>
            <Icon className={cn(
              "h-4 w-4 transition-transform duration-300 group-hover:scale-110",
              variant === "positive" && "text-success",
              variant === "negative" && "text-destructive",
              variant !== "positive" && variant !== "negative" && "text-primary"
            )} />
          </div>
        )}
      </div>

      <div className="relative mt-4">
        <p className={cn(
          "text-3xl font-bold tracking-tight font-display tabular-nums animate-number",
          variant === "positive" && "text-success",
          variant === "negative" && "text-destructive"
        )}>
          {value}
        </p>

        <div className="mt-2 flex items-center gap-2">
          {trend && (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full transition-colors",
                trend === "up" && "text-success bg-success/10",
                trend === "down" && "text-destructive bg-destructive/10",
                trend === "neutral" && "text-muted-foreground bg-muted"
              )}
            >
              <TrendIcon className="h-3 w-3" />
              {trendValue}
            </span>
          )}
          {description && (
            <span className="text-xs text-muted-foreground">{description}</span>
          )}
        </div>
      </div>
    </div>
  )
}

export { MetricCard, metricCardVariants }
