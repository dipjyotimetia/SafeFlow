"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
}

export function Reveal({
  children,
  className,
  delayMs = 0,
}: RevealProps) {
  const [isVisible, setIsVisible] = useState(true);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    setIsVisible(false);

    if (!("IntersectionObserver" in window)) {
      setIsVisible(true);
      return;
    }

    const fallback = window.setTimeout(() => setIsVisible(true), 250);

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          window.clearTimeout(fallback);
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "0px 0px -8% 0px",
        threshold: 0.15,
      },
    );

    observer.observe(node);

    return () => {
      window.clearTimeout(fallback);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delayMs}ms` }}
      className={cn(
        "reveal-base transition-all duration-500 ease-out",
        isVisible && "reveal-visible",
        className,
      )}
    >
      {children}
    </div>
  );
}
