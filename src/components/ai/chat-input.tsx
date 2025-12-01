'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Send,
  Square,
  TrendingUp,
  Wallet,
  Receipt,
  PiggyBank,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled: boolean;
}

const quickActions = [
  {
    label: 'Spending',
    icon: TrendingUp,
    prompt: "How's my spending this month?",
  },
  {
    label: 'Budget',
    icon: Wallet,
    prompt: 'Help me create a budget based on my spending.',
  },
  {
    label: 'Tax',
    icon: Receipt,
    prompt: 'What expenses might be tax deductible?',
  },
  {
    label: 'Investments',
    icon: PiggyBank,
    prompt: 'How is my investment portfolio performing?',
  },
];

export function ChatInput({
  onSend,
  onStop,
  isStreaming,
  disabled,
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSend = () => {
    if (!input.trim() || disabled) return;
    onSend(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (prompt: string) => {
    if (disabled) return;
    onSend(prompt);
  };

  return (
    <div className="border-t bg-background p-4 space-y-3">
      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        {quickActions.map((action) => (
          <Button
            key={action.label}
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => handleQuickAction(action.prompt)}
            disabled={disabled || isStreaming}
          >
            <action.icon className="h-3 w-3" />
            {action.label}
          </Button>
        ))}
      </div>

      {/* Input area */}
      <div className="flex gap-2">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            disabled
              ? 'Connect to Ollama to start chatting...'
              : 'Ask about your finances...'
          }
          disabled={disabled || isStreaming}
          className={cn(
            'min-h-[44px] max-h-[120px] resize-none',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          rows={1}
        />

        {isStreaming ? (
          <Button
            variant="destructive"
            size="icon"
            onClick={onStop}
            className="shrink-0"
          >
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || disabled}
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        All AI processing happens locally on your machine.
      </p>
    </div>
  );
}
