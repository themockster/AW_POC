/**
 * Base interface for storage backends
 */

import {
  ChatEvent,
  SessionMetrics,
  UserMetrics,
  ProviderMetrics,
  MetricsQuery,
  TrackingReport,
} from "../../types";

export interface BaseStorage {
  /**
   * Store a single chat event
   */
  storeEvent(event: ChatEvent): Promise<void>;

  /**
   * Store multiple chat events in batch
   */
  storeEvents(events: ChatEvent[]): Promise<void>;

  /**
   * Get events for a specific session
   */
  getSessionEvents(
    sessionId: string,
    limit?: number,
    offset?: number
  ): Promise<ChatEvent[]>;

  /**
   * Get events for a specific user
   */
  getUserEvents(
    userId: string,
    limit?: number,
    offset?: number
  ): Promise<ChatEvent[]>;

  /**
   * Get events based on query parameters
   */
  queryEvents(query: MetricsQuery): Promise<ChatEvent[]>;

  /**
   * Get detailed conversation log for a session
   */
  getConversationLog(sessionId: string): Promise<{
    sessionId: string;
    userId?: string;
    startTime: Date;
    endTime: Date;
    totalInteractions: number;
    interactions: Array<{
      id: string;
      timestamp: Date;
      type: "user_message" | "llm_response" | "system_instruction" | "error";
      role: "user" | "assistant" | "system";
      content: string;
      metadata?: any;
      context?: any;
      responseTime?: number;
      tokensUsed?: number;
      model?: string;
      provider?: string;
      cost?: number;
    }>;
    metrics: SessionMetrics;
  }>;

  /**
   * Get all conversation logs with pagination
   */
  getConversationLogs(
    limit?: number,
    offset?: number
  ): Promise<
    Array<{
      sessionId: string;
      userId?: string;
      startTime: Date;
      endTime: Date;
      totalInteractions: number;
      lastInteraction: Date;
      preview: string;
    }>
  >;

  /**
   * Get session metrics
   */
  getSessionMetrics(sessionId: string): Promise<SessionMetrics>;

  /**
   * Get user metrics
   */
  getUserMetrics(userId: string): Promise<UserMetrics>;

  /**
   * Get provider metrics
   */
  getProviderMetrics(
    provider: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ProviderMetrics>;

  /**
   * Generate tracking report
   */
  generateReport(query: MetricsQuery): Promise<TrackingReport>;

  /**
   * Delete events for a session
   */
  deleteSessionEvents(sessionId: string): Promise<void>;

  /**
   * Delete events for a user
   */
  deleteUserEvents(userId: string): Promise<void>;

  /**
   * Get storage statistics
   */
  getStats(): Promise<{
    totalEvents: number;
    totalSessions: number;
    totalUsers: number;
    storageSize: number;
  }>;

  /**
   * Initialize storage
   */
  initialize(): Promise<void>;

  /**
   * Close storage connection
   */
  close(): Promise<void>;

  /**
   * Test storage connection
   */
  testConnection(): Promise<boolean>;
}

export interface StorageConstructor {
  new (config: any): BaseStorage;
}

export abstract class AbstractStorage implements BaseStorage {
  protected config: any;

  constructor(config: any) {
    this.config = config;
  }

  abstract storeEvent(event: ChatEvent): Promise<void>;
  abstract storeEvents(events: ChatEvent[]): Promise<void>;
  abstract getSessionEvents(
    sessionId: string,
    limit?: number,
    offset?: number
  ): Promise<ChatEvent[]>;
  abstract getUserEvents(
    userId: string,
    limit?: number,
    offset?: number
  ): Promise<ChatEvent[]>;
  abstract queryEvents(query: MetricsQuery): Promise<ChatEvent[]>;
  abstract getConversationLog(sessionId: string): Promise<{
    sessionId: string;
    userId?: string;
    startTime: Date;
    endTime: Date;
    totalInteractions: number;
    interactions: Array<{
      id: string;
      timestamp: Date;
      type: "user_message" | "llm_response" | "system_instruction" | "error";
      role: "user" | "assistant" | "system";
      content: string;
      metadata?: any;
      context?: any;
      responseTime?: number;
      tokensUsed?: number;
      model?: string;
      provider?: string;
      cost?: number;
    }>;
    metrics: SessionMetrics;
  }>;
  abstract getConversationLogs(
    limit?: number,
    offset?: number
  ): Promise<
    Array<{
      sessionId: string;
      userId?: string;
      startTime: Date;
      endTime: Date;
      totalInteractions: number;
      lastInteraction: Date;
      preview: string;
    }>
  >;
  abstract getSessionMetrics(sessionId: string): Promise<SessionMetrics>;
  abstract getUserMetrics(userId: string): Promise<UserMetrics>;
  abstract getProviderMetrics(
    provider: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ProviderMetrics>;
  abstract generateReport(query: MetricsQuery): Promise<TrackingReport>;
  abstract deleteSessionEvents(sessionId: string): Promise<void>;
  abstract deleteUserEvents(userId: string): Promise<void>;
  abstract getStats(): Promise<{
    totalEvents: number;
    totalSessions: number;
    totalUsers: number;
    storageSize: number;
  }>;
  abstract initialize(): Promise<void>;
  abstract close(): Promise<void>;
  abstract testConnection(): Promise<boolean>;

  /**
   * Validate event before storing
   */
  protected validateEvent(event: ChatEvent): void {
    if (!event.id) {
      throw new Error("Event ID is required");
    }
    if (!event.sessionId) {
      throw new Error("Session ID is required");
    }
    if (!event.content) {
      throw new Error("Event content is required");
    }
    if (!event.timestamp) {
      throw new Error("Event timestamp is required");
    }
  }

  /**
   * Sanitize event data for storage
   */
  protected sanitizeEvent(event: ChatEvent): ChatEvent {
    return {
      ...event,
      content: this.sanitizeContent(event.content),
      metadata: this.sanitizeMetadata(event.metadata),
    };
  }

  /**
   * Sanitize content to remove sensitive data
   */
  protected sanitizeContent(content: string): string {
    // Remove potential sensitive data patterns
    const sensitivePatterns = [
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // Credit card numbers
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email addresses
      /\b\d{3}[\s-]?\d{3}[\s-]?\d{4}\b/g, // Phone numbers
    ];

    let sanitized = content;
    sensitivePatterns.forEach((pattern) => {
      sanitized = sanitized.replace(pattern, "[REDACTED]");
    });

    return sanitized;
  }

  /**
   * Sanitize metadata to remove sensitive data
   */
  protected sanitizeMetadata(metadata?: any): any {
    if (!metadata) return metadata;

    const sensitiveKeys = ["apiKey", "password", "token", "secret"];
    const sanitized = { ...metadata };

    sensitiveKeys.forEach((key) => {
      if (sanitized[key]) {
        sanitized[key] = "[REDACTED]";
      }
    });

    return sanitized;
  }

  /**
   * Calculate session metrics from events
   */
  protected calculateSessionMetrics(events: ChatEvent[]): SessionMetrics {
    if (events.length === 0) {
      throw new Error("No events provided for session metrics calculation");
    }

    const sessionId = events[0].sessionId;
    const userId = events[0].userId;
    const startTime = new Date(
      Math.min(...events.map((e) => e.timestamp.getTime()))
    );
    const endTime = new Date(
      Math.max(...events.map((e) => e.timestamp.getTime()))
    );

    const totalMessages = events.filter(
      (e) => e.eventType === "user_message" || e.eventType === "llm_response"
    ).length;
    const totalTokens = events.reduce((sum, e) => sum + (e.tokensUsed || 0), 0);
    const totalCost = events.reduce(
      (sum, e) => sum + (e.metadata?.cost || 0),
      0
    );
    const responseTimes = events
      .filter((e) => e.responseTime)
      .map((e) => e.responseTime!);
    const averageResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) /
          responseTimes.length
        : 0;

    const modelsUsed = [
      ...new Set(events.filter((e) => e.model).map((e) => e.model!)),
    ];

    const errors = events.filter((e) => e.eventType === "error").length;

    return {
      sessionId,
      userId,
      startTime,
      endTime,
      totalMessages,
      totalTokens,
      totalCost,
      averageResponseTime,
      modelsUsed,
      errors,
    };
  }

  /**
   * Calculate user metrics from events
   */
  protected calculateUserMetrics(events: ChatEvent[]): UserMetrics {
    if (events.length === 0) {
      throw new Error("No events provided for user metrics calculation");
    }

    const userId = events[0].userId!;
    const sessions = [...new Set(events.map((e) => e.sessionId))];
    const totalSessions = sessions.length;
    const totalMessages = events.filter(
      (e) => e.eventType === "user_message" || e.eventType === "llm_response"
    ).length;
    const totalTokens = events.reduce((sum, e) => sum + (e.tokensUsed || 0), 0);
    const totalCost = events.reduce(
      (sum, e) => sum + (e.metadata?.cost || 0),
      0
    );
    const lastActivity = new Date(
      Math.max(...events.map((e) => e.timestamp.getTime()))
    );

    // Calculate average session length
    const sessionLengths = sessions.map((sessionId) => {
      const sessionEvents = events.filter((e) => e.sessionId === sessionId);
      return sessionEvents.length;
    });
    const averageSessionLength =
      sessionLengths.length > 0
        ? sessionLengths.reduce((sum, length) => sum + length, 0) /
          sessionLengths.length
        : 0;

    const models = events.filter((e) => e.model).map((e) => e.model!);
    const modelCounts = models.reduce(
      (acc, model) => {
        acc[model] = (acc[model] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    const favoriteModels = Object.entries(modelCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([model]) => model);

    return {
      userId,
      totalSessions,
      totalMessages,
      totalTokens,
      totalCost,
      averageSessionLength,
      favoriteModels,
      lastActivity,
    };
  }
}
