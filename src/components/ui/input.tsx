import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground/60 selection:bg-primary selection:text-primary-foreground",
        "h-11 w-full min-w-0 rounded-lg border border-input bg-background/50 backdrop-blur-sm px-4 py-2 text-sm",
        "shadow-xs transition-all duration-200 outline-none",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2",
        "focus-visible:border-primary/50 focus-visible:bg-background focus-visible:shadow-sm",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "hover:border-border/80 hover:bg-background/80",
        "dark:bg-input/30 dark:focus-visible:bg-input/50",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
