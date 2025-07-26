/**
 * Main Chatbot Tracker class
 */

import { v4 as uuidv4 } from "uuid";
import {
  ChatEvent,
  TrackerConfig,
  SessionMetrics,
  UserMetrics,
  ProviderMetrics,
  MetricsQuery,
  TrackingReport,
  TrackingResult,
  TrackingContext,
} from "../../types";
import { BaseProvider } from "../providers/BaseProvider";
import { BaseStorage } from "../storage/BaseStorage";
import { EventType, Role } from "./EventTypes";
import { DEFAULT_CONFIG } from "./EventTypes";

export class ChatbotTracker {
  private config: TrackerConfig;
  private provider: BaseProvider;
  private storage: BaseStorage;
  private eventQueue: ChatEvent[] = [];
  private flushTimer?: ReturnType<typeof setInterval>;
  private isInitialized = false;

  constructor(
    provider: BaseProvider,
    storage: BaseStorage,
    config?: Partial<TrackerConfig>
  ) {
    this.provider = provider;
    this.storage = storage;
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      provider: config?.provider || "lm-studio", // Ensure provider is always set
      apiEndpoint: config?.apiEndpoint || "http://localhost:8080", // Ensure apiEndpoint is always set
      storage: config?.storage || { type: "memory", config: {} }, // Ensure storage is always set
    };

    // Start flush timer if batch processing is enabled
    if (this.config.batchSize && this.config.flushInterval) {
      this.startFlushTimer();
    }
  }

  /**
   * Initialize the tracker
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize storage
      await this.storage.initialize();

      // Test connections
      const [storageConnected, providerConnected] = await Promise.all([
        this.storage.testConnection(),
        this.provider.testConnection(),
      ]);

      if (!storageConnected) {
        throw new Error("Storage connection failed");
      }

      if (!providerConnected) {
        throw new Error("Provider connection failed");
      }

      this.isInitialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize tracker: ${error}`);
    }
  }

  /**
   * Track a user message
   */
  async trackUserMessage(
    sessionId: string,
    content: string,
    context?: Partial<TrackingContext>
  ): Promise<TrackingResult> {
    console.log(`👤 trackUserMessage using sessionId: ${sessionId}`);
    const eventId = uuidv4();
    const timestamp = new Date();

    try {
      const event: ChatEvent = {
        id: eventId,
        timestamp,
        sessionId,
        userId: context?.userId,
        eventType: "user_message",
        content,
        role: "user",
        context: context
          ? {
              conversationHistory:
                context.conversationHistory?.map((e) => e.content) || [],
              systemPrompt: context.systemPrompt,
            }
          : undefined,
        metadata: {
          apiEndpoint: this.provider.getConfig().apiEndpoint,
        },
      };

      await this.storeEvent(event);

      return {
        success: true,
        eventId,
        timestamp,
      };
    } catch (error) {
      return {
        success: false,
        eventId,
        timestamp,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Track an LLM response
   */
  async trackLLMResponse(
    sessionId: string,
    response: any,
    context?: Partial<TrackingContext>
  ): Promise<TrackingResult> {
    console.log(`🤖 trackLLMResponse using sessionId: ${sessionId}`);
    const eventId = uuidv4();
    const timestamp = new Date();

    try {
      const event: ChatEvent = {
        id: eventId,
        timestamp,
        sessionId,
        userId: context?.userId,
        eventType: "llm_response",
        content: response.content,
        role: "assistant",
        model: response.model,
        provider: response.provider,
        tokensUsed: response.tokensUsed,
        responseTime: response.responseTime,
        context: context
          ? {
              conversationHistory:
                context.conversationHistory?.map((e) => e.content) || [],
              systemPrompt: context.systemPrompt,
              temperature: context.metadata?.temperature,
              maxTokens: context.metadata?.maxTokens,
            }
          : undefined,
        metadata: {
          apiEndpoint: this.provider.getConfig().apiEndpoint,
          cost: response.metadata?.cost,
          latency: response.responseTime,
        },
      };

      await this.storeEvent(event);

      return {
        success: true,
        eventId,
        timestamp,
      };
    } catch (error) {
      return {
        success: false,
        eventId,
        timestamp,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Track a system instruction
   */
  async trackSystemInstruction(
    sessionId: string,
    instruction: string,
    context?: Partial<TrackingContext>
  ): Promise<TrackingResult> {
    const eventId = uuidv4();
    const timestamp = new Date();

    try {
      const event: ChatEvent = {
        id: eventId,
        timestamp,
        sessionId,
        userId: context?.userId,
        eventType: "system_instruction",
        content: instruction,
        role: "system",
        context: context
          ? {
              conversationHistory:
                context.conversationHistory?.map((e) => e.content) || [],
            }
          : undefined,
        metadata: {
          apiEndpoint: this.provider.getConfig().apiEndpoint,
        },
      };

      await this.storeEvent(event);

      return {
        success: true,
        eventId,
        timestamp,
      };
    } catch (error) {
      return {
        success: false,
        eventId,
        timestamp,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Track an error
   */
  async trackError(
    sessionId: string,
    error: Error,
    context?: Partial<TrackingContext>
  ): Promise<TrackingResult> {
    const eventId = uuidv4();
    const timestamp = new Date();

    try {
      const event: ChatEvent = {
        id: eventId,
        timestamp,
        sessionId,
        userId: context?.userId,
        eventType: "error",
        content: error.message,
        role: "system",
        metadata: {
          apiEndpoint: this.provider.getConfig().apiEndpoint,
          error: error.message,
        },
      };

      await this.storeEvent(event);

      return {
        success: true,
        eventId,
        timestamp,
      };
    } catch (storageError) {
      return {
        success: false,
        eventId,
        timestamp,
        error:
          storageError instanceof Error
            ? storageError.message
            : "Unknown error",
      };
    }
  }

  /**
   * Send message through provider with automatic tracking
   */
  async sendMessage(
    message: string,
    context?: Partial<TrackingContext>
  ): Promise<any> {
    const sessionId = context?.sessionId || uuidv4();
    console.log(`🎯 Tracker.sendMessage using sessionId: ${sessionId}`);
    const startTime = Date.now();

    try {
      // Track user message
      await this.trackUserMessage(sessionId, message, context);

      // Send to provider
      const response = await this.provider.sendMessage(message, {
        conversationHistory: context?.conversationHistory?.map(
          (e) => e.content
        ),
        systemPrompt: context?.systemPrompt,
        temperature: context?.metadata?.temperature,
        maxTokens: context?.metadata?.maxTokens,
        model: context?.metadata?.model,
      });

      // Track LLM response
      await this.trackLLMResponse(sessionId, response, context);

      return response;
    } catch (error) {
      // Track error
      await this.trackError(
        sessionId,
        error instanceof Error ? error : new Error(String(error)),
        context
      );
      throw error;
    }
  }

  /**
   * Get session metrics
   */
  async getSessionMetrics(sessionId: string): Promise<SessionMetrics> {
    return this.storage.getSessionMetrics(sessionId);
  }

  /**
   * Get user metrics
   */
  async getUserMetrics(userId: string): Promise<UserMetrics> {
    return this.storage.getUserMetrics(userId);
  }

  /**
   * Get provider metrics
   */
  async getProviderMetrics(
    provider: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ProviderMetrics> {
    return this.storage.getProviderMetrics(provider, startDate, endDate);
  }

  /**
   * Generate tracking report
   */
  async generateReport(query: MetricsQuery): Promise<TrackingReport> {
    return this.storage.generateReport(query);
  }

  /**
   * Get storage statistics
   */
  async getStats() {
    return this.storage.getStats();
  }

  /**
   * Store event (with batching support)
   */
  private async storeEvent(event: ChatEvent): Promise<void> {
    if (this.config.batchSize && this.config.batchSize > 1) {
      // Add to batch queue
      this.eventQueue.push(event);

      // Flush if batch is full
      if (this.eventQueue.length >= this.config.batchSize) {
        await this.flushQueue();
      }
    } else {
      // Store immediately
      await this.storage.storeEvent(event);
    }
  }

  /**
   * Flush the event queue
   */
  private async flushQueue(): Promise<void> {
    if (this.eventQueue.length === 0) {
      return;
    }

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      await this.storage.storeEvents(events);
    } catch (error) {
      // Re-queue events if storage fails
      this.eventQueue.unshift(...events);
      throw error;
    }
  }

  /**
   * Start the flush timer
   */
  private startFlushTimer(): void {
    if (this.config.flushInterval) {
      this.flushTimer = setInterval(async () => {
        await this.flushQueue();
      }, this.config.flushInterval);
    }
  }

  /**
   * Stop the flush timer
   */
  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  /**
   * Close the tracker
   */
  async close(): Promise<void> {
    this.stopFlushTimer();
    await this.flushQueue();
    await this.storage.close();
    this.isInitialized = false;
  }

  /**
   * Get tracker configuration
   */
  getConfig(): TrackerConfig {
    return { ...this.config };
  }

  /**
   * Get provider instance
   */
  getProvider(): BaseProvider {
    return this.provider;
  }

  /**
   * Get storage instance
   */
  getStorage(): BaseStorage {
    return this.storage;
  }
}
