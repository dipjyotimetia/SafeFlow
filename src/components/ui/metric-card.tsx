import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const metricCardVariants = cva(
  "relative overflow-hidden rounded-xl border p-6 transition-all duration-200",
  {
    variants: {
      variant: {
        default: "bg-card shadow-sm hover:shadow-md",
        gradient: "gradient-card shadow-sm hover:shadow-md",
        positive: "bg-gradient-to-br from-card to-success/5 shadow-sm hover:shadow-md",
        negative: "bg-gradient-to-br from-card to-destructive/5 shadow-sm hover:shadow-md",
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
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {Icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        )}
      </div>

      <div className="mt-3">
        <p className="text-2xl font-bold tabular-nums tracking-tight">{value}</p>

        <div className="mt-1 flex items-center gap-2">
          {trend && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-xs font-medium",
                trend === "up" && "text-success",
                trend === "down" && "text-destructive",
                trend === "neutral" && "text-muted-foreground"
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
