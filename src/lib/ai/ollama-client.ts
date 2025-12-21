import type { ChatMessage } from "@/types";
import { Ollama } from "ollama/browser";

export interface OllamaConfig {
  host: string;
  model: string;
}

export interface HealthCheckResult {
  connected: boolean;
  modelReady: boolean;
  error?: string;
  availableModels?: string[];
}

export interface OllamaMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const DEFAULT_CONFIG: OllamaConfig = {
  host: "http://127.0.0.1:11434",
  model: "llama3.1:8b", // Default to a common model; user can change in settings
};

class OllamaClient {
  private client: Ollama | null = null;
  private config: OllamaConfig = { ...DEFAULT_CONFIG };
  private abortController: AbortController | null = null;
  private _isConnected: boolean = false;
  private _isModelReady: boolean = false;

  /**
   * Check if client is connected
   */
  get isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * Check if model is ready
   */
  get isModelReady(): boolean {
    return this._isModelReady;
  }

  /**
   * Initialize the Ollama client with optional configuration
   */
  initialize(config?: Partial<OllamaConfig>): void {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.client = new Ollama({ host: this.config.host });
  }

  /**
   * Get current configuration
   */
  getConfig(): OllamaConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<OllamaConfig>): void {
    this.config = { ...this.config, ...config };
    // Reinitialize client with new host if changed
    if (config.host) {
      this.client = new Ollama({ host: this.config.host });
    }
  }

  /**
   * Check if Ollama is running and the model is available
   */
  async checkHealth(): Promise<HealthCheckResult> {
    if (!this.client) {
      console.log("[Ollama] Initializing client...");
      this.initialize();
    }

    try {
      console.log("[Ollama] Checking health, listing models...");
      // Check if Ollama is running by listing models
      const response = await this.client!.list();
      const availableModels = response.models.map((m) => m.name);
      console.log("[Ollama] Available models:", availableModels);
      console.log("[Ollama] Target model:", this.config.model);

      // Check if our target model is available
      const modelReady = availableModels.some(
        (name) =>
          name === this.config.model ||
          name.startsWith(this.config.model.split(":")[0])
      );

      console.log("[Ollama] Model ready:", modelReady);

      // Update internal state
      this._isConnected = true;
      this._isModelReady = modelReady;

      return {
        connected: true,
        modelReady,
        availableModels,
      };
    } catch (error) {
      console.error("[Ollama] Health check failed:", error);
      // Update internal state
      this._isConnected = false;
      this._isModelReady = false;

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Check for common connection issues
      if (
        errorMessage.includes("fetch") ||
        errorMessage.includes("ECONNREFUSED")
      ) {
        return {
          connected: false,
          modelReady: false,
          error:
            "Cannot connect to Ollama. Please ensure Ollama is running on your machine.",
        };
      }

      return {
        connected: false,
        modelReady: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Chat with the model using streaming
   */
  async chat(
    messages: OllamaMessage[],
    systemPrompt: string,
    onChunk: (text: string) => void
  ): Promise<string> {
    if (!this.client) {
      this.initialize();
    }

    // If not connected yet, try to check health first
    if (!this._isConnected || !this._isModelReady) {
      const health = await this.checkHealth();
      if (!health.connected || !health.modelReady) {
        throw new Error(
          "Ollama not connected or model not ready. Please check connection in settings."
        );
      }
    }

    this.abortController = new AbortController();

    const allMessages: OllamaMessage[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    let fullResponse = "";

    try {
      const response = await this.client!.chat({
        model: this.config.model,
        messages: allMessages,
        stream: true,
      });

      for await (const part of response) {
        if (this.abortController.signal.aborted) {
          break;
        }
        const chunk = part.message.content;
        fullResponse += chunk;
        onChunk(chunk);
      }

      return fullResponse;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return fullResponse;
      }
      throw error;
    } finally {
      this.abortController = null;
    }
  }

  /**
   * Generate a single response (non-streaming, useful for categorization)
   */
  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    if (!this.client) {
      this.initialize();
    }

    // If not connected yet, try to check health first
    if (!this._isConnected || !this._isModelReady) {
      const health = await this.checkHealth();
      if (!health.connected || !health.modelReady) {
        throw new Error(
          "Ollama not connected or model not ready. Please check connection in settings."
        );
      }
    }

    try {
      const response = await this.client!.generate({
        model: this.config.model,
        prompt,
        system: systemPrompt,
        stream: false,
      });

      return response.response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Generation failed";
      throw new Error(`Failed to generate response: ${errorMessage}`);
    }
  }

  /**
   * Pull a model with progress tracking
   */
  async pullModel(
    modelName?: string,
    onProgress?: (percent: number, status: string) => void
  ): Promise<void> {
    if (!this.client) {
      this.initialize();
    }

    const model = modelName || this.config.model;

    try {
      const response = await this.client!.pull({
        model,
        stream: true,
      });

      for await (const part of response) {
        if (part.total && part.completed) {
          const percent = Math.round((part.completed / part.total) * 100);
          onProgress?.(percent, part.status);
        } else {
          onProgress?.(0, part.status);
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to pull model";
      throw new Error(`Failed to pull model: ${errorMessage}`);
    }
  }

  /**
   * Abort any ongoing streaming request
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Convert ChatMessage array to OllamaMessage array
   */
  static toOllamaMessages(messages: ChatMessage[]): OllamaMessage[] {
    return messages
      .filter((m) => m.role !== "system") // System prompt handled separately
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));
  }
}

// Singleton instance
export const ollamaClient = new OllamaClient();
