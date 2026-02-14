import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const typographyVariants = cva("", {
  variants: {
    variant: {
      h1: "scroll-m-20 text-4xl font-bold tracking-tight lg:text-5xl",
      h2: "scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0",
      h3: "scroll-m-20 text-2xl font-semibold tracking-tight",
      h4: "scroll-m-20 text-xl font-semibold tracking-tight",
      p: "leading-7 [&:not(:first-child)]:mt-6",
      lead: "text-xl text-muted-foreground/80 leading-7",
      large: "text-lg font-semibold",
      small: "text-sm font-medium leading-none",
      muted: "text-sm text-muted-foreground",
    },
    gradient: {
      none: "",
      primary:
        "bg-linear-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent",
      success:
        "bg-linear-to-r from-success via-success/90 to-success/70 bg-clip-text text-transparent",
      brand:
        "bg-linear-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent",
    },
  },
  defaultVariants: {
    variant: "p",
    gradient: "none",
  },
});

interface TypographyProps
  extends
    React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof typographyVariants> {
  as?: React.ElementType;
}

const DEFAULT_VARIANT_ELEMENT: Record<
  NonNullable<TypographyProps["variant"]>,
  keyof React.JSX.IntrinsicElements
> = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  p: "p",
  lead: "p",
  large: "div",
  small: "small",
  muted: "p",
};

function Typography({
  className,
  variant,
  gradient,
  as,
  ...props
}: TypographyProps) {
  const defaultElement = DEFAULT_VARIANT_ELEMENT[variant ?? "p"];
  const Component = as ?? defaultElement;

  return (
    <Component
      className={cn(typographyVariants({ variant, gradient }), className)}
      {...props}
    />
  );
}

// Convenience components
function TypographyH1({
  children,
  className,
  ...props
}: React.ComponentProps<"h1">) {
  return (
    <h1
      className={cn(
        "scroll-m-20 text-4xl font-bold tracking-tight lg:text-5xl",
        "bg-linear-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent",
        className,
      )}
      {...props}
    >
      {children}
    </h1>
  );
}

function TypographyH2({
  children,
  className,
  ...props
}: React.ComponentProps<"h2">) {
  return (
    <h2
      className={cn(
        "scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0",
        className,
      )}
      {...props}
    >
      {children}
    </h2>
  );
}

function TypographyH3({
  children,
  className,
  ...props
}: React.ComponentProps<"h3">) {
  return (
    <h3
      className={cn(
        "scroll-m-20 text-2xl font-semibold tracking-tight",
        className,
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

function TypographyLead({
  children,
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("text-xl text-muted-foreground/80 leading-7", className)}
      {...props}
    >
      {children}
    </p>
  );
}

function TypographyLarge({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("text-lg font-semibold", className)} {...props}>
      {children}
    </div>
  );
}

function TypographySmall({
  children,
  className,
  ...props
}: React.ComponentProps<"small">) {
  return (
    <small
      className={cn("text-sm font-medium leading-none", className)}
      {...props}
    >
      {children}
    </small>
  );
}

function TypographyMuted({
  children,
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)} {...props}>
      {children}
    </p>
  );
}

export {
  Typography,
  TypographyH1,
  TypographyH2,
  TypographyH3,
  TypographyLead,
  TypographyLarge,
  TypographySmall,
  TypographyMuted,
  typographyVariants,
};
