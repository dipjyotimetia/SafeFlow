"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ValueType = "currency" | "percentage" | "number";

interface EditableValueProps {
  value: number;
  onChange: (value: number) => void;
  type?: ValueType;
  formatter?: (value: number) => string;
  parser?: (value: string) => number;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  decimals?: number;
}

export function EditableValue({
  value,
  onChange,
  type = "number",
  formatter,
  parser,
  className,
  inputClassName,
  disabled = false,
  min,
  max,
  step = 1,
  decimals = 2,
}: EditableValueProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Default formatters based on type
  const defaultFormatter = useCallback(
    (val: number) => {
      switch (type) {
        case "currency":
          return (val / 100).toFixed(decimals);
        case "percentage":
          return val.toFixed(decimals);
        case "number":
        default:
          return val.toFixed(decimals);
      }
    },
    [type, decimals]
  );

  // Default parsers based on type
  const defaultParser = useCallback(
    (val: string) => {
      const parsed = parseFloat(val) || 0;
      switch (type) {
        case "currency":
          return Math.round(parsed * 100);
        case "percentage":
        case "number":
        default:
          return parsed;
      }
    },
    [type]
  );

  const displayFormatter = formatter || defaultFormatter;
  const editFormatter = defaultFormatter; // Always use plain numbers for editing
  const parse = parser || defaultParser;

  const startEditing = () => {
    if (disabled) return;
    // Use editFormatter (plain numbers) for the input, not displayFormatter
    setEditValue(editFormatter(value));
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditValue("");
  };

  const saveValue = () => {
    let newValue = parse(editValue);
    if (min !== undefined) newValue = Math.max(min, newValue);
    if (max !== undefined) newValue = Math.min(max, newValue);
    onChange(newValue);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveValue();
    } else if (e.key === "Escape") {
      cancelEditing();
    }
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          type="number"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={saveValue}
          className={cn("h-7 w-24 text-right text-sm", inputClassName)}
          step={step}
          min={min}
          max={max}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={saveValue}
        >
          <Check className="h-3 w-3 text-success" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onMouseDown={(e) => e.preventDefault()}
          onClick={cancelEditing}
        >
          <X className="h-3 w-3 text-destructive" />
        </Button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={startEditing}
      disabled={disabled}
      className={cn(
        "group inline-flex items-center gap-1 rounded px-1 -mx-1",
        "transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        disabled && "cursor-default hover:bg-transparent",
        className
      )}
    >
      <span>{displayFormatter(value)}</span>
      {!disabled && (
        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </button>
  );
}
