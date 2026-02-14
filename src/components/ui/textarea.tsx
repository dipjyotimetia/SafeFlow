import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "placeholder:text-muted-foreground/70 flex min-h-20 w-full field-sizing-content rounded-xl border border-border/70 bg-card/65 px-4 py-2 text-sm shadow-sm outline-none",
        "transition-all duration-200",
        "focus-visible:border-primary/45 focus-visible:bg-card focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-0",
        "hover:border-border hover:bg-card/80",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
