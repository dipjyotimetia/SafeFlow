'use client';

import { useEffect, useRef } from 'react';
import { Bot, X, Minus, Trash2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAIStore } from '@/stores/ai.store';
import { ChatMessage } from './chat-message';
import { ChatInput } from './chat-input';
import { ConnectionStatus, StatusIndicator } from './connection-status';

export function FloatingChatWidget() {
  const {
    connectionStatus,
    connectionError,
    isModelReady,
    messages,
    isStreaming,
    isWidgetOpen,
    isWidgetMinimized,
    isPullingModel,
    pullProgress,
    pullStatus,
    checkConnection,
    pullModel,
    sendMessage,
    clearChat,
    stopStreaming,
    toggleWidget,
    closeWidget,
    minimizeWidget,
  } = useAIStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isReady = connectionStatus === 'connected' && isModelReady;

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? 'smooth' : 'instant',
        block: 'end',
      });
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => scrollToBottom(true), 50);
    return () => clearTimeout(timer);
  }, [messages, isStreaming]);

  // Floating launcher (when closed)
  if (!isWidgetOpen) {
    return (
      <button
        onClick={toggleWidget}
        className={cn(
          'fixed bottom-6 right-6 z-50',
          'flex h-11 items-center gap-2 rounded-sm border border-border bg-card px-3',
          'transition-colors hover:border-border-strong hover:bg-muted/40',
        )}
        aria-label="Open SafeFlow AI"
      >
        <Bot className="h-4 w-4 text-primary" strokeWidth={1.5} />
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-foreground">
          AI · Assist
        </span>
        <StatusIndicator
          status={connectionStatus}
          isModelReady={isModelReady}
          className="ml-1"
        />
      </button>
    );
  }

  // Minimized
  if (isWidgetMinimized) {
    return (
      <button
        onClick={toggleWidget}
        className={cn(
          'fixed bottom-6 right-6 z-50',
          'flex items-center gap-2 rounded-sm border border-border bg-card px-3 py-2',
          'cursor-pointer transition-colors hover:border-border-strong hover:bg-muted/40',
        )}
        aria-label="Restore SafeFlow AI"
      >
        <Bot className="h-4 w-4 text-primary" strokeWidth={1.5} />
        <span className="font-mono text-[11px] uppercase tracking-[0.16em]">
          SafeFlow AI
        </span>
        <StatusIndicator
          status={connectionStatus}
          isModelReady={isModelReady}
        />
      </button>
    );
  }

  // Full panel
  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-50',
        'h-[600px] max-h-[80vh] w-[400px]',
        'flex flex-col overflow-hidden rounded-md border border-border bg-card',
        'animate-in slide-in-from-bottom-2 fade-in duration-200',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-surface-2 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-[2px] border border-primary/40 bg-primary/10">
            <Bot className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="font-display text-[15px] tracking-tight">
              SafeFlow AI
            </h3>
            <div className="mt-0.5 flex items-center gap-1.5">
              <StatusIndicator
                status={connectionStatus}
                isModelReady={isModelReady}
              />
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[--text-subtle]">
                {isReady ? 'READY' : 'OFFLINE'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={clearChat}
              title="Clear chat"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={minimizeWidget}
            title="Minimize"
          >
            <Minus className="h-3.5 w-3.5" strokeWidth={1.5} />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={closeWidget}
            title="Close"
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          </Button>
        </div>
      </div>

      {/* Connection status (when not ready) */}
      {!isReady && (
        <ConnectionStatus
          status={connectionStatus}
          isModelReady={isModelReady}
          error={connectionError}
          isPulling={isPullingModel}
          pullProgress={pullProgress}
          pullStatus={pullStatus}
          onRetry={checkConnection}
          onPullModel={pullModel}
        />
      )}

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth"
      >
        {messages.length === 0 ? (
          <div className="flex min-h-full flex-col items-center justify-center p-6 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[2px] border border-primary/40 bg-primary/10">
              <Sparkles
                className="h-5 w-5 text-primary"
                strokeWidth={1.5}
              />
            </div>
            <h4 className="font-display text-lg tracking-tight">
              Welcome to SafeFlow AI
            </h4>
            <p className="mt-2 max-w-[280px] text-[13px] leading-relaxed text-muted-foreground">
              Your personal finance assistant. Ask about spending, budgets,
              taxes, or investments.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <span className="rounded-[2px] border border-border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-[--text-subtle]">
                Spending
              </span>
              <span className="rounded-[2px] border border-border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-[--text-subtle]">
                Budgets
              </span>
              <span className="rounded-[2px] border border-border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-[--text-subtle]">
                Tax tips
              </span>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {messages.map((message, index) => (
              <ChatMessage
                key={message.id}
                message={message}
                isStreaming={
                  isStreaming &&
                  index === messages.length - 1 &&
                  message.role === 'assistant'
                }
              />
            ))}
            <div ref={messagesEndRef} className="h-px" />
          </div>
        )}
      </div>

      <ChatInput
        onSend={sendMessage}
        onStop={stopStreaming}
        isStreaming={isStreaming}
        disabled={!isReady}
      />
    </div>
  );
}
