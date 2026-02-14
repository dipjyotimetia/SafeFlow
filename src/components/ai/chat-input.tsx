"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  PiggyBank,
  Receipt,
  Send,
  Square,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled: boolean;
}

const quickActions = [
  {
    label: "Spending",
    icon: TrendingUp,
    prompt: "How's my spending this month?",
    color: "text-primary",
  },
  {
    label: "Budget",
    icon: Wallet,
    prompt: "Help me create a budget based on my spending.",
    color: "text-success",
  },
  {
    label: "Tax",
    icon: Receipt,
    prompt: "What expenses might be tax deductible?",
    color: "text-warning",
  },
  {
    label: "Investments",
    icon: PiggyBank,
    prompt: "How is my investment portfolio performing?",
    color: "text-primary",
  },
];

export function ChatInput({
  onSend,
  onStop,
  isStreaming,
  disabled,
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120
      )}px`;
    }
  }, [input]);

  const handleSend = () => {
    if (!input.trim() || disabled) return;
    onSend(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (prompt: string) => {
    if (disabled || isStreaming) return;
    onSend(prompt);
  };

  return (
    <div className="border-t bg-muted/30 p-3 space-y-3">
      {/* Quick actions */}
      <div className="flex flex-wrap gap-1.5">
        {quickActions.map((action) => (
          <Button
            key={action.label}
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 text-xs gap-1.5 rounded-full px-3",
              "bg-background hover:bg-muted border border-border/50",
              "transition-all duration-150",
              disabled || isStreaming
                ? "opacity-50 cursor-not-allowed"
                : "hover:border-border hover:shadow-sm"
            )}
            onClick={() => handleQuickAction(action.prompt)}
            disabled={disabled || isStreaming}
          >
            <action.icon className={cn("h-3 w-3", action.color)} />
            {action.label}
          </Button>
        ))}
      </div>

      {/* Input area */}
      <div className="flex gap-2 items-end">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              disabled
                ? "Connect to Ollama to start chatting..."
                : "Ask about your finances..."
            }
            disabled={disabled || isStreaming}
            className={cn(
              "min-h-[44px] max-h-[120px] resize-none pr-2",
              "bg-background border-border/50 focus:border-success/50",
              "transition-colors duration-150",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            rows={1}
          />
        </div>

        {isStreaming ? (
          <Button
            variant="destructive"
            size="icon"
            onClick={onStop}
            className="shrink-0 h-[44px] w-[44px] rounded-lg"
          >
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || disabled}
            className={cn(
              "shrink-0 h-[44px] w-[44px] rounded-lg",
              "bg-success hover:bg-success/90",
              "disabled:bg-muted disabled:text-muted-foreground"
            )}
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
        <Zap className="h-3 w-3" />
        <span>Powered by local AI • Your data stays private</span>
      </div>
    </div>
  );
}
