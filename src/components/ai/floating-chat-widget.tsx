'use client';

import { useEffect, useRef } from 'react';
import { Bot, X, Minus, Trash2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAIStore } from '@/stores/ai.store';
import { ChatMessage } from './chat-message';
import { ChatInput } from './chat-input';
import { ConnectionStatus, StatusIndicator } from './connection-status';

export function FloatingChatWidget() {
  const {
    // State
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
    // Actions
    checkConnection,
    pullModel,
    sendMessage,
    clearChat,
    stopStreaming,
    toggleWidget,
    closeWidget,
    minimizeWidget,
  } = useAIStore();

  const scrollRef = useRef<HTMLDivElement>(null);
  const isReady = connectionStatus === 'connected' && isModelReady;

  // Check connection on mount
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  // Floating button (when closed)
  if (!isWidgetOpen) {
    return (
      <Button
        onClick={toggleWidget}
        className={cn(
          'fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50',
          'bg-emerald-600 hover:bg-emerald-700 text-white',
          'transition-transform hover:scale-105'
        )}
      >
        <Bot className="h-6 w-6" />
        <StatusIndicator
          status={connectionStatus}
          isModelReady={isModelReady}
          className="absolute -top-1 -right-1"
        />
      </Button>
    );
  }

  // Minimized state
  if (isWidgetMinimized) {
    return (
      <div
        className={cn(
          'fixed bottom-6 right-6 z-50',
          'bg-background border rounded-full shadow-lg',
          'flex items-center gap-2 px-4 py-2 cursor-pointer',
          'hover:bg-muted transition-colors'
        )}
        onClick={toggleWidget}
      >
        <Bot className="h-5 w-5 text-emerald-600" />
        <span className="text-sm font-medium">SafeFlow AI</span>
        <StatusIndicator
          status={connectionStatus}
          isModelReady={isModelReady}
        />
      </div>
    );
  }

  // Full chat panel
  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-50',
        'w-[400px] h-[600px] max-h-[80vh]',
        'bg-background border rounded-lg shadow-2xl',
        'flex flex-col overflow-hidden',
        'animate-in slide-in-from-bottom-4 fade-in duration-200'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-emerald-600 flex items-center justify-center">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">SafeFlow AI</h3>
            <div className="flex items-center gap-1">
              <StatusIndicator
                status={connectionStatus}
                isModelReady={isModelReady}
              />
              <span className="text-xs text-muted-foreground">
                {isReady ? 'Ready' : 'Offline'}
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
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={minimizeWidget}
            title="Minimize"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={closeWidget}
            title="Close"
          >
            <X className="h-4 w-4" />
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
      <ScrollArea className="flex-1" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
              <MessageSquare className="h-8 w-8 text-emerald-600" />
            </div>
            <h4 className="font-medium mb-2">Welcome to SafeFlow AI</h4>
            <p className="text-sm text-muted-foreground max-w-[280px]">
              Your personal finance assistant. Ask me about your spending,
              budgets, taxes, or investments.
            </p>
          </div>
        ) : (
          <div className="divide-y">
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
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <ChatInput
        onSend={sendMessage}
        onStop={stopStreaming}
        isStreaming={isStreaming}
        disabled={!isReady}
      />
    </div>
  );
}
