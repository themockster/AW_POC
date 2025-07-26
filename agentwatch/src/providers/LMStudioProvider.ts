/**
 * LM Studio Provider implementation
 */

import { AbstractProvider } from "./BaseProvider";
import { LLMResponse, ProviderCapabilities, TrackerConfig } from "../../types";

export class LMStudioProvider extends AbstractProvider {
  constructor(config: TrackerConfig) {
    super(config);
    this.validateConfig();
  }

  async sendMessage(
    message: string,
    context?: {
      conversationHistory?: string[];
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
      model?: string;
    }
  ): Promise<LLMResponse> {
    const startTime = Date.now();

    try {
      // Prepare messages for LM Studio API
      const messages = [];

      // Add system prompt if provided
      if (context?.systemPrompt) {
        messages.push({
          role: "system",
          content: context.systemPrompt,
        });
      }

      // Add conversation history
      if (context?.conversationHistory) {
        for (let i = 0; i < context.conversationHistory.length; i += 2) {
          if (i + 1 < context.conversationHistory.length) {
            messages.push({
              role: "user",
              content: context.conversationHistory[i],
            });
            messages.push({
              role: "assistant",
              content: context.conversationHistory[i + 1],
            });
          }
        }
      }

      // Add current message
      messages.push({
        role: "user",
        content: message,
      });

      // Prepare request payload
      const payload = {
        messages,
        temperature: context?.temperature || 0.7,
        max_tokens: context?.maxTokens || 1000,
        stream: false,
      };

      // Make request to LM Studio
      const response = await fetch(
        `${this.config.apiEndpoint}/v1/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error(
          `LM Studio API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      const responseTime = Date.now() - startTime;

      // Extract response content
      const content = data.choices[0]?.message?.content || "";
      const model = data.model || "unknown";
      const tokensUsed =
        data.usage?.total_tokens || this.estimateTokenCount(message + content);
      const cost = this.calculateCost(tokensUsed, model);

      return this.createLLMResponse(content, model, tokensUsed, responseTime, {
        finishReason: data.choices[0]?.finish_reason,
        usage: data.usage,
        cost,
      });
    } catch (error) {
      throw new Error(
        `LM Studio request failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async getModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.apiEndpoint}/v1/models`);

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }

      const data = await response.json();
      return data.data?.map((model: any) => model.id) || [];
    } catch (error) {
      console.warn("Failed to fetch models from LM Studio:", error);
      return [
        "llama-2-7b",
        "llama-2-13b",
        "llama-2-70b",
        "codellama-7b",
        "codellama-13b",
      ];
    }
  }

  async getCapabilities(): Promise<ProviderCapabilities> {
    return {
      supportsStreaming: true,
      supportsFunctionCalling: false,
      supportsVision: false,
      maxTokens: 4096,
      availableModels: await this.getModels(),
      costPerToken: {
        "llama-2-7b": 0.0001,
        "llama-2-13b": 0.0002,
        "llama-2-70b": 0.0007,
        "codellama-7b": 0.0001,
        "codellama-13b": 0.0002,
        default: 0.0001,
      },
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.apiEndpoint}/v1/models`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  getName(): string {
    return "lm-studio";
  }

  protected getCostPer1KTokens(model: string): number {
    const costs: Record<string, number> = {
      "llama-2-7b": 0.0001,
      "llama-2-13b": 0.0002,
      "llama-2-70b": 0.0007,
      "codellama-7b": 0.0001,
      "codellama-13b": 0.0002,
      default: 0.0001,
    };

    return costs[model] || costs["default"];
  }
}
