import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  [
    "inline-flex items-center justify-center rounded-[2px] border px-1.5 py-0.5",
    "text-[10px] font-mono font-medium uppercase tracking-[0.1em]",
    "w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none",
    "focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[2px]",
    "aria-invalid:border-destructive transition-colors duration-150 overflow-hidden",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "border-border-strong bg-foreground text-background",
        outline: "text-foreground border-border bg-transparent",
        success: "border-success/40 bg-success/10 text-success",
        destructive: "border-destructive/40 bg-destructive/10 text-destructive",
        accent: "border-primary/50 bg-primary/10 text-primary",
        warning: "border-warning/40 bg-warning/10 text-warning",
        // `secondary` retained — used in 16+ legacy callsites (badges throughout app).
        secondary: "text-foreground border-border bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
