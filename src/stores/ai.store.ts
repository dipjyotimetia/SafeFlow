import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db';
import { ollamaClient, type OllamaMessage } from '@/lib/ai/ollama-client';
import { SYSTEM_PROMPTS } from '@/lib/ai/prompts';
import { buildContextString } from '@/lib/ai/context-builder';
import type {
  ChatMessage,
  ChatConversation,
  AIConnectionStatus,
  AISettings,
} from '@/types';

interface AIStore {
  // Connection state
  connectionStatus: AIConnectionStatus;
  connectionError: string | null;
  isModelReady: boolean;
  availableModels: string[];

  // Chat state
  messages: ChatMessage[];
  isStreaming: boolean;
  currentStreamingContent: string;
  conversationId: string | null;

  // Widget state
  isWidgetOpen: boolean;
  isWidgetMinimized: boolean;

  // Model pull state
  isPullingModel: boolean;
  pullProgress: number;
  pullStatus: string;

  // Settings (persisted)
  settings: AISettings;

  // Connection actions
  checkConnection: () => Promise<void>;
  pullModel: () => Promise<void>;

  // Chat actions
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;
  loadConversation: (id: string) => Promise<void>;
  saveConversation: () => Promise<void>;
  stopStreaming: () => void;

  // Widget actions
  toggleWidget: () => void;
  openWidget: () => void;
  closeWidget: () => void;
  minimizeWidget: () => void;

  // Settings actions
  updateSettings: (settings: Partial<AISettings>) => void;
}

const DEFAULT_SETTINGS: AISettings = {
  ollamaHost: 'http://127.0.0.1:11434',
  model: 'martain7r/finance-llama-8b:q4_k_m',
  autoCategorize: true,
};

export const useAIStore = create<AIStore>()(
  persist(
    (set, get) => ({
      // Initial state
      connectionStatus: 'disconnected',
      connectionError: null,
      isModelReady: false,
      availableModels: [],

      messages: [],
      isStreaming: false,
      currentStreamingContent: '',
      conversationId: null,

      isWidgetOpen: false,
      isWidgetMinimized: false,

      isPullingModel: false,
      pullProgress: 0,
      pullStatus: '',

      settings: DEFAULT_SETTINGS,

      // Check connection to Ollama
      checkConnection: async () => {
        const { settings } = get();
        set({ connectionStatus: 'connecting', connectionError: null });

        try {
          ollamaClient.updateConfig({
            host: settings.ollamaHost,
            model: settings.model,
          });

          const health = await ollamaClient.checkHealth();

          if (!health.connected) {
            set({
              connectionStatus: 'error',
              connectionError: health.error || 'Cannot connect to Ollama',
              isModelReady: false,
            });
            return;
          }

          set({
            connectionStatus: 'connected',
            connectionError: null,
            isModelReady: health.modelReady,
            availableModels: health.availableModels || [],
          });
        } catch (error) {
          set({
            connectionStatus: 'error',
            connectionError:
              error instanceof Error ? error.message : 'Connection failed',
            isModelReady: false,
          });
        }
      },

      // Pull model from Ollama
      pullModel: async () => {
        const { settings } = get();
        set({ isPullingModel: true, pullProgress: 0, pullStatus: 'Starting...' });

        try {
          await ollamaClient.pullModel(settings.model, (percent, status) => {
            set({ pullProgress: percent, pullStatus: status });
          });

          set({
            isPullingModel: false,
            pullProgress: 100,
            pullStatus: 'Complete',
            isModelReady: true,
          });

          // Refresh connection status
          await get().checkConnection();
        } catch (error) {
          set({
            isPullingModel: false,
            pullProgress: 0,
            pullStatus: '',
            connectionError:
              error instanceof Error ? error.message : 'Failed to pull model',
          });
        }
      },

      // Send a message to the AI
      sendMessage: async (content: string) => {
        const { messages, connectionStatus, isModelReady, conversationId } = get();

        if (connectionStatus !== 'connected' || !isModelReady) {
          return;
        }

        // Create user message
        const userMessage: ChatMessage = {
          id: uuidv4(),
          role: 'user',
          content,
          timestamp: new Date(),
        };

        // Create placeholder for assistant message
        const assistantMessage: ChatMessage = {
          id: uuidv4(),
          role: 'assistant',
          content: '',
          timestamp: new Date(),
        };

        // Generate new conversation ID if needed
        const newConversationId = conversationId || uuidv4();

        set({
          messages: [...messages, userMessage, assistantMessage],
          isStreaming: true,
          currentStreamingContent: '',
          conversationId: newConversationId,
        });

        try {
          // Build context from user's financial data
          const context = await buildContextString();

          // Prepare messages for Ollama
          const ollamaMessages: OllamaMessage[] = messages
            .filter((m) => m.role !== 'system')
            .map((m) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
            }));

          ollamaMessages.push({ role: 'user', content });

          // Build system prompt with context
          const systemPrompt = `${SYSTEM_PROMPTS.financialAssistant}

Current user context:
${context}`;

          // Stream the response
          let fullResponse = '';

          await ollamaClient.chat(ollamaMessages, systemPrompt, (chunk) => {
            fullResponse += chunk;
            set({ currentStreamingContent: fullResponse });

            // Update the assistant message in place
            set((state) => ({
              messages: state.messages.map((m) =>
                m.id === assistantMessage.id
                  ? { ...m, content: fullResponse }
                  : m
              ),
            }));
          });

          set({ isStreaming: false, currentStreamingContent: '' });

          // Auto-save conversation
          await get().saveConversation();
        } catch (error) {
          // Remove the empty assistant message on error
          set((state) => ({
            messages: state.messages.filter((m) => m.id !== assistantMessage.id),
            isStreaming: false,
            currentStreamingContent: '',
            connectionError:
              error instanceof Error ? error.message : 'Failed to get response',
          }));
        }
      },

      // Clear the current chat
      clearChat: () => {
        set({
          messages: [],
          conversationId: null,
          currentStreamingContent: '',
        });
      },

      // Load a previous conversation
      loadConversation: async (id: string) => {
        try {
          const conversation = await db.chatConversations.get(id);
          if (conversation) {
            set({
              messages: conversation.messages,
              conversationId: conversation.id,
            });
          }
        } catch (error) {
          console.error('Failed to load conversation:', error);
        }
      },

      // Save the current conversation
      saveConversation: async () => {
        const { messages, conversationId } = get();

        if (messages.length === 0 || !conversationId) return;

        try {
          const now = new Date();
          const existing = await db.chatConversations.get(conversationId);

          // Generate title from first user message
          const firstUserMessage = messages.find((m) => m.role === 'user');
          const title = firstUserMessage
            ? firstUserMessage.content.slice(0, 50) +
              (firstUserMessage.content.length > 50 ? '...' : '')
            : 'New conversation';

          if (existing) {
            await db.chatConversations.update(conversationId, {
              messages,
              updatedAt: now,
            });
          } else {
            await db.chatConversations.add({
              id: conversationId,
              title,
              messages,
              createdAt: now,
              updatedAt: now,
            });
          }
        } catch (error) {
          console.error('Failed to save conversation:', error);
        }
      },

      // Stop streaming
      stopStreaming: () => {
        ollamaClient.abort();
        set({ isStreaming: false, currentStreamingContent: '' });
      },

      // Widget actions
      toggleWidget: () =>
        set((state) => ({
          isWidgetOpen: !state.isWidgetOpen,
          isWidgetMinimized: false,
        })),

      openWidget: () => set({ isWidgetOpen: true, isWidgetMinimized: false }),

      closeWidget: () =>
        set({ isWidgetOpen: false, isWidgetMinimized: false }),

      minimizeWidget: () => set({ isWidgetMinimized: true }),

      // Update settings
      updateSettings: (newSettings: Partial<AISettings>) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));

        // If host or model changed, reconnect
        if (newSettings.ollamaHost || newSettings.model) {
          ollamaClient.updateConfig({
            host: newSettings.ollamaHost,
            model: newSettings.model,
          });
          get().checkConnection();
        }
      },
    }),
    {
      name: 'safeflow-ai',
      version: 1,
      partialize: (state) => ({
        // Only persist settings, not chat state
        settings: state.settings,
      }),
      migrate: (persistedState, version) => {
        const state = persistedState as { settings?: AISettings };

        if (version === 0) {
          // Fix model name to include quantization tag if missing
          if (state.settings?.model === 'martain7r/finance-llama-8b') {
            state.settings.model = 'martain7r/finance-llama-8b:q4_k_m';
          }
        }

        return state;
      },
    }
  )
);
