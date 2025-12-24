import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  [
    "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
    "w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1.5 [&>svg]:pointer-events-none",
    "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
    "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
    "transition-all duration-200 overflow-hidden",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "border-transparent bg-primary text-primary-foreground",
          "shadow-[0_1px_2px_rgba(0,0,0,0.1)]",
          "[a&]:hover:bg-primary/90",
        ].join(" "),
        secondary: [
          "border-transparent bg-secondary text-secondary-foreground",
          "shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
          "[a&]:hover:bg-secondary/90",
        ].join(" "),
        destructive: [
          "border-transparent bg-destructive text-white",
          "shadow-[0_1px_2px_rgba(0,0,0,0.1)]",
          "[a&]:hover:bg-destructive/90",
          "focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/80",
        ].join(" "),
        outline: [
          "text-foreground border-border/60",
          "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        ].join(" "),
        success: [
          "border-transparent bg-success/15 text-success",
          "dark:bg-success/20 dark:text-success",
        ].join(" "),
        warning: [
          "border-transparent bg-warning/15 text-warning",
          "dark:bg-warning/20 dark:text-warning",
        ].join(" "),
        premium: [
          "border-primary/20 bg-gradient-to-r from-primary/10 to-primary/5 text-primary",
          "dark:border-primary/30 dark:from-primary/20 dark:to-primary/10",
        ].join(" "),
        glow: [
          "border-transparent bg-primary text-primary-foreground",
          "shadow-[0_0_10px_oklch(0.55_0.18_265/0.3)]",
          "animate-pulse-subtle",
        ].join(" "),
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
