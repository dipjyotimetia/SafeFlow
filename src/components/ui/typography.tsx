import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const typographyVariants = cva("", {
  variants: {
    variant: {
      h1: "scroll-m-20 font-display text-4xl font-normal tracking-tight lg:text-5xl",
      h2: "scroll-m-20 font-display text-3xl font-normal tracking-tight lg:text-4xl",
      h3: "scroll-m-20 font-display text-2xl font-normal tracking-tight",
      h4: "scroll-m-20 text-lg font-semibold tracking-tight",
      p: "leading-7 text-[0.95rem]",
      lead: "text-base text-muted-foreground leading-7",
      large: "text-base font-semibold",
      small: "text-sm font-medium leading-none",
      muted: "text-sm text-muted-foreground",
      eyebrow: "eyebrow",
    },
    gradient: {
      none: "",
      // Back-compat — gradient utilities collapse to single colors.
      primary: "text-foreground",
      success: "text-success",
      brand: "text-primary",
    },
  },
  defaultVariants: {
    variant: "p",
    gradient: "none",
  },
});

interface TypographyProps
  extends React.HTMLAttributes<HTMLElement>,
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
  eyebrow: "span",
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

function TypographyH1({
  children,
  className,
  ...props
}: React.ComponentProps<"h1">) {
  return (
    <h1
      className={cn(
        "scroll-m-20 font-display text-4xl font-normal tracking-tight lg:text-5xl",
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
        "scroll-m-20 font-display text-3xl font-normal tracking-tight lg:text-4xl",
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
        "scroll-m-20 font-display text-2xl font-normal tracking-tight",
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
      className={cn("text-base text-muted-foreground leading-7", className)}
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
    <div className={cn("text-base font-semibold", className)} {...props}>
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
