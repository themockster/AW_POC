/**
 * Base interface for LLM providers
 */

import { LLMResponse, ProviderCapabilities, TrackerConfig } from '../../types';

export interface BaseProvider {
  /**
   * Send a message to the LLM and get a response
   */
  sendMessage(
    message: string, 
    context?: {
      conversationHistory?: string[];
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
      model?: string;
    }
  ): Promise<LLMResponse>;

  /**
   * Get available models for this provider
   */
  getModels(): Promise<string[]>;

  /**
   * Get provider capabilities
   */
  getCapabilities(): Promise<ProviderCapabilities>;

  /**
   * Get provider configuration
   */
  getConfig(): TrackerConfig;

  /**
   * Test connection to the provider
   */
  testConnection(): Promise<boolean>;

  /**
   * Get provider name
   */
  getName(): string;
}

export interface ProviderConstructor {
  new (config: TrackerConfig): BaseProvider;
}

export abstract class AbstractProvider implements BaseProvider {
  protected config: TrackerConfig;

  constructor(config: TrackerConfig) {
    this.config = config;
  }

  abstract sendMessage(
    message: string, 
    context?: {
      conversationHistory?: string[];
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
      model?: string;
    }
  ): Promise<LLMResponse>;

  abstract getModels(): Promise<string[]>;

  abstract getCapabilities(): Promise<ProviderCapabilities>;

  getConfig(): TrackerConfig {
    return this.config;
  }

  abstract testConnection(): Promise<boolean>;

  abstract getName(): string;

  /**
   * Estimate token count for a given text
   */
  protected estimateTokenCount(text: string): number {
    // Simple estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Calculate cost for a given number of tokens and model
   */
  protected calculateCost(tokens: number, model: string): number {
    const costPer1K = this.getCostPer1KTokens(model);
    return (tokens / 1000) * costPer1K;
  }

  /**
   * Get cost per 1K tokens for a specific model
   */
  protected getCostPer1KTokens(model: string): number {
    // Default costs - should be overridden by specific providers
    const defaultCosts: Record<string, number> = {
      'gpt-4': 0.03,
      'gpt-4-turbo': 0.01,
      'gpt-3.5-turbo': 0.002,
      'claude-3-opus': 0.015,
      'claude-3-sonnet': 0.003,
      'claude-3-haiku': 0.00025,
      'llama-2-7b': 0.0001,
      'llama-2-13b': 0.0002,
      'llama-2-70b': 0.0007,
      'default': 0.001
    };

    return defaultCosts[model] || defaultCosts['default'];
  }

  /**
   * Validate configuration
   */
  protected validateConfig(): void {
    if (!this.config.apiEndpoint) {
      throw new Error('API endpoint is required');
    }

    if (this.config.provider === 'azure' || this.config.provider === 'openai') {
      if (!this.config.apiKey) {
        throw new Error('API key is required for this provider');
      }
    }
  }

  /**
   * Create a standardized LLM response
   */
  protected createLLMResponse(
    content: string,
    model: string,
    tokensUsed: number,
    responseTime: number,
    metadata?: Record<string, any>
  ): LLMResponse {
    return {
      content,
      model,
      provider: this.getName(),
      tokensUsed,
      responseTime,
      metadata
    };
  }
} 