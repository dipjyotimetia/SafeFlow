"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "@/types";
import { Bot, Check, Copy, RefreshCw, User } from "lucide-react";
import { useMemo, useState } from "react";

interface ChatMessageProps {
  message: ChatMessageType;
  isStreaming?: boolean;
}

/**
 * Simple markdown-like renderer for common patterns
 */
function renderContent(content: string): React.ReactNode {
  if (!content) return null;

  // Split by code blocks first
  const parts = content.split(/(```[\s\S]*?```)/g);

  return parts.map((part, index) => {
    // Handle code blocks
    if (part.startsWith("```") && part.endsWith("```")) {
      const codeContent = part.slice(3, -3);
      const firstNewline = codeContent.indexOf("\n");
      const language =
        firstNewline > 0 ? codeContent.slice(0, firstNewline).trim() : "";
      const code =
        firstNewline > 0 ? codeContent.slice(firstNewline + 1) : codeContent;

      return (
        <pre
          key={index}
          className="my-2 p-3 bg-muted rounded-md overflow-x-auto text-xs font-mono"
        >
          {language && (
            <div className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wide">
              {language}
            </div>
          )}
          <code>{code}</code>
        </pre>
      );
    }

    // Handle inline formatting
    return (
      <span key={index}>
        {part.split("\n").map((line, lineIndex, arr) => (
          <span key={lineIndex}>
            {renderLine(line)}
            {lineIndex < arr.length - 1 && <br />}
          </span>
        ))}
      </span>
    );
  });
}

function renderLine(line: string): React.ReactNode {
  // Handle headers
  if (line.startsWith("### ")) {
    return <strong className="text-sm font-semibold">{line.slice(4)}</strong>;
  }
  if (line.startsWith("## ")) {
    return <strong className="text-base font-semibold">{line.slice(3)}</strong>;
  }
  if (line.startsWith("# ")) {
    return <strong className="text-lg font-bold">{line.slice(2)}</strong>;
  }

  // Handle bullet points
  if (line.startsWith("- ") || line.startsWith("* ")) {
    return (
      <span className="flex gap-2">
        <span className="text-muted-foreground">•</span>
        <span>{renderInlineFormatting(line.slice(2))}</span>
      </span>
    );
  }

  // Handle numbered lists
  const numberedMatch = line.match(/^(\d+)\.\s/);
  if (numberedMatch) {
    return (
      <span className="flex gap-2">
        <span className="text-muted-foreground min-w-[1.5em]">
          {numberedMatch[1]}.
        </span>
        <span>
          {renderInlineFormatting(line.slice(numberedMatch[0].length))}
        </span>
      </span>
    );
  }

  return renderInlineFormatting(line);
}

function renderInlineFormatting(text: string): React.ReactNode {
  // Handle bold **text**
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    // Handle inline code `text`
    const codeParts = part.split(/(`[^`]+`)/g);
    return codeParts.map((codePart, j) => {
      if (codePart.startsWith("`") && codePart.endsWith("`")) {
        return (
          <code
            key={`${i}-${j}`}
            className="px-1 py-0.5 bg-muted rounded text-xs font-mono"
          >
            {codePart.slice(1, -1)}
          </code>
        );
      }
      return codePart;
    });
  });
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderedContent = useMemo(
    () => renderContent(message.content),
    [message.content]
  );

  return (
    <div
      className={cn(
        "group flex gap-3 px-4 py-4",
        isUser ? "bg-muted/30" : "bg-background"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div className="flex-1 space-y-1.5 overflow-hidden min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {isUser ? "You" : "SafeFlow AI"}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {message.timestamp.toLocaleTimeString("en-AU", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        <div className="text-sm leading-relaxed text-foreground/90">
          {renderedContent}
          {isStreaming && (
            <span className="inline-flex items-center ml-1">
              <RefreshCw className="h-3 w-3 animate-spin text-emerald-500" />
            </span>
          )}
        </div>

        {!isUser && message.content && !isStreaming && (
          <div className="pt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 mr-1 text-emerald-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
