import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground/70 selection:bg-primary selection:text-primary-foreground",
        "h-11 w-full min-w-0 rounded-xl border border-border/70 bg-card/65 px-4 py-2 text-sm shadow-sm",
        "transition-all duration-200 outline-none",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "focus-visible:border-primary/45 focus-visible:bg-card focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-0",
        "hover:border-border hover:bg-card/80",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
