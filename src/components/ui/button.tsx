import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold",
    "transition-all duration-150",
    "disabled:pointer-events-none disabled:opacity-40",
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0",
    "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
    "active:scale-[0.985]",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "bg-primary text-primary-foreground border border-primary shadow-[0_10px_24px_color-mix(in_oklab,var(--primary)_22%,transparent)]",
          "hover:-translate-y-px hover:bg-primary/92 hover:shadow-[0_14px_30px_color-mix(in_oklab,var(--primary)_28%,transparent)]",
        ].join(" "),
        outline: [
          "border border-border/80 bg-card/70 text-foreground shadow-sm backdrop-blur",
          "hover:-translate-y-px hover:border-border-strong hover:bg-card",
        ].join(" "),
        ghost: [
          "border border-transparent text-foreground",
          "hover:bg-muted/60",
        ].join(" "),
        destructive: [
          "bg-destructive text-white border border-destructive shadow-[0_10px_24px_color-mix(in_oklab,var(--destructive)_22%,transparent)]",
          "hover:-translate-y-px hover:bg-destructive/90",
          "focus-visible:ring-destructive/40",
        ].join(" "),
        accent: [
          "bg-accent text-accent-foreground border border-accent shadow-sm",
          "hover:-translate-y-px hover:bg-accent/90",
        ].join(" "),
        link: "text-primary underline-offset-4 hover:underline border border-transparent",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 text-xs has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        xl: "h-11 rounded-md px-8 text-base has-[>svg]:px-5",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
