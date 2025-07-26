/**
 * In-memory storage implementation for development and testing
 */

import { AbstractStorage } from "./BaseStorage";
import {
  ChatEvent,
  SessionMetrics,
  UserMetrics,
  ProviderMetrics,
  MetricsQuery,
  TrackingReport,
} from "../../types";

export class MemoryStorage extends AbstractStorage {
  private events: ChatEvent[] = [];
  private isInitialized = false;

  constructor(config: any) {
    super(config);
  }

  async initialize(): Promise<void> {
    this.isInitialized = true;
    // Clear any existing data to ensure clean state
    this.events = [];
  }

  async storeEvent(event: ChatEvent): Promise<void> {
    this.validateEvent(event);
    const sanitizedEvent = this.sanitizeEvent(event);
    this.events.push(sanitizedEvent);
  }

  async storeEvents(events: ChatEvent[]): Promise<void> {
    for (const event of events) {
      await this.storeEvent(event);
    }
  }

  async getSessionEvents(
    sessionId: string,
    limit?: number,
    offset?: number
  ): Promise<ChatEvent[]> {
    const sessionEvents = this.events.filter((e) => e.sessionId === sessionId);
    const start = offset || 0;
    const end = limit ? start + limit : undefined;
    return sessionEvents.slice(start, end);
  }

  async getUserEvents(
    userId: string,
    limit?: number,
    offset?: number
  ): Promise<ChatEvent[]> {
    const userEvents = this.events.filter((e) => e.userId === userId);
    const start = offset || 0;
    const end = limit ? start + limit : undefined;
    return userEvents.slice(start, end);
  }

  async queryEvents(query: MetricsQuery): Promise<ChatEvent[]> {
    let filteredEvents = [...this.events];

    // Filter by date range
    if (query.startDate) {
      filteredEvents = filteredEvents.filter(
        (e) => e.timestamp >= query.startDate!
      );
    }
    if (query.endDate) {
      filteredEvents = filteredEvents.filter(
        (e) => e.timestamp <= query.endDate!
      );
    }

    // Filter by session
    if (query.sessionId) {
      filteredEvents = filteredEvents.filter(
        (e) => e.sessionId === query.sessionId
      );
    }

    // Filter by user
    if (query.userId) {
      filteredEvents = filteredEvents.filter((e) => e.userId === query.userId);
    }

    // Filter by provider
    if (query.provider) {
      filteredEvents = filteredEvents.filter(
        (e) => e.provider === query.provider
      );
    }

    // Filter by model
    if (query.model) {
      filteredEvents = filteredEvents.filter((e) => e.model === query.model);
    }

    // Apply limit and offset
    const start = query.offset || 0;
    const end = query.limit ? start + query.limit : undefined;

    return filteredEvents.slice(start, end);
  }

  async getConversationLog(sessionId: string): Promise<{
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
  }> {
    const sessionEvents = await this.getSessionEvents(sessionId);

    if (sessionEvents.length === 0) {
      throw new Error(`No events found for session: ${sessionId}`);
    }

    // Sort events by timestamp
    const sortedEvents = sessionEvents.sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    const startTime = sortedEvents[0].timestamp;
    const endTime = sortedEvents[sortedEvents.length - 1].timestamp;
    const userId = sortedEvents[0].userId;

    const interactions = sortedEvents.map((event) => ({
      id: event.id,
      timestamp: event.timestamp,
      type: event.eventType as
        | "user_message"
        | "llm_response"
        | "system_instruction"
        | "error",
      role: event.role as "user" | "assistant" | "system",
      content: event.content,
      metadata: event.metadata,
      context: event.context,
      responseTime: event.responseTime,
      tokensUsed: event.tokensUsed,
      model: event.model,
      provider: event.provider,
      cost: event.metadata?.cost,
    }));

    const metrics = await this.getSessionMetrics(sessionId);

    return {
      sessionId,
      userId,
      startTime,
      endTime,
      totalInteractions: interactions.length,
      interactions,
      metrics,
    };
  }

  async getConversationLogs(
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
  > {
    // Get all unique session IDs
    const sessionIds = [...new Set(this.events.map((e) => e.sessionId))];

    const start = offset || 0;
    const end = limit ? start + limit : undefined;
    const paginatedSessionIds = sessionIds.slice(start, end);

    const conversationLogs = await Promise.all(
      paginatedSessionIds.map(async (sessionId) => {
        try {
          const log = await this.getConversationLog(sessionId);

          // Create a preview from the first user message
          const firstUserMessage = log.interactions.find(
            (i) => i.type === "user_message"
          );
          const preview = firstUserMessage
            ? firstUserMessage.content.substring(0, 100) +
              (firstUserMessage.content.length > 100 ? "..." : "")
            : "No user messages";

          return {
            sessionId: log.sessionId,
            userId: log.userId,
            startTime: log.startTime,
            endTime: log.endTime,
            totalInteractions: log.totalInteractions,
            lastInteraction: log.endTime,
            preview,
          };
        } catch (error) {
          // Skip sessions with errors
          return null;
        }
      })
    );

    return conversationLogs.filter((log) => log !== null) as Array<{
      sessionId: string;
      userId?: string;
      startTime: Date;
      endTime: Date;
      totalInteractions: number;
      lastInteraction: Date;
      preview: string;
    }>;
  }

  async getSessionMetrics(sessionId: string): Promise<SessionMetrics> {
    const sessionEvents = await this.getSessionEvents(sessionId);
    return this.calculateSessionMetrics(sessionEvents);
  }

  async getUserMetrics(userId: string): Promise<UserMetrics> {
    const userEvents = await this.getUserEvents(userId);
    return this.calculateUserMetrics(userEvents);
  }

  async getProviderMetrics(
    provider: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ProviderMetrics> {
    const providerEvents = this.events.filter((e) => e.provider === provider);

    let filteredEvents = providerEvents;
    if (startDate) {
      filteredEvents = filteredEvents.filter((e) => e.timestamp >= startDate);
    }
    if (endDate) {
      filteredEvents = filteredEvents.filter((e) => e.timestamp <= endDate);
    }

    const totalRequests = filteredEvents.filter(
      (e) => e.eventType === "llm_response"
    ).length;
    const totalTokens = filteredEvents.reduce(
      (sum, e) => sum + (e.tokensUsed || 0),
      0
    );
    const totalCost = filteredEvents.reduce(
      (sum, e) => sum + (e.metadata?.cost || 0),
      0
    );
    const responseTimes = filteredEvents
      .filter((e) => e.responseTime)
      .map((e) => e.responseTime!);
    const averageResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) /
          responseTimes.length
        : 0;

    const errors = filteredEvents.filter((e) => e.eventType === "error").length;
    const errorRate = totalRequests > 0 ? errors / totalRequests : 0;

    const modelsUsed = [
      ...new Set(filteredEvents.filter((e) => e.model).map((e) => e.model!)),
    ];

    return {
      provider,
      totalRequests,
      totalTokens,
      totalCost,
      averageResponseTime,
      errorRate,
      modelsUsed,
      timeRange: {
        start:
          startDate ||
          new Date(
            Math.min(...filteredEvents.map((e) => e.timestamp.getTime()))
          ),
        end:
          endDate ||
          new Date(
            Math.max(...filteredEvents.map((e) => e.timestamp.getTime()))
          ),
      },
    };
  }

  async generateReport(query: MetricsQuery): Promise<TrackingReport> {
    const events = await this.queryEvents(query);

    // Calculate summary
    const totalEvents = events.length;
    const sessions = [...new Set(events.map((e) => e.sessionId))];
    const users = [
      ...new Set(events.filter((e) => e.userId).map((e) => e.userId!)),
    ];
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

    // Calculate breakdowns
    const byProvider = events.reduce(
      (acc, e) => {
        if (e.provider) {
          acc[e.provider] = (acc[e.provider] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>
    );

    const byModel = events.reduce(
      (acc, e) => {
        if (e.model) {
          acc[e.model] = (acc[e.model] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>
    );

    const byEventType = events.reduce(
      (acc, e) => {
        acc[e.eventType] = (acc[e.eventType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const byTime = events.reduce(
      (acc, e) => {
        const hour = e.timestamp.getHours();
        acc[hour.toString()] = (acc[hour.toString()] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Get top sessions
    const sessionMetrics = await Promise.all(
      sessions
        .slice(0, 10)
        .map((sessionId) => this.getSessionMetrics(sessionId))
    );

    // Get top users
    const userMetrics = await Promise.all(
      users.slice(0, 10).map((userId) => this.getUserMetrics(userId))
    );

    return {
      summary: {
        totalEvents,
        totalSessions: sessions.length,
        totalUsers: users.length,
        totalTokens,
        totalCost,
        averageResponseTime,
      },
      breakdown: {
        byProvider,
        byModel,
        byEventType,
        byTime,
      },
      topSessions: sessionMetrics,
      topUsers: userMetrics,
    };
  }

  async deleteSessionEvents(sessionId: string): Promise<void> {
    this.events = this.events.filter((e) => e.sessionId !== sessionId);
  }

  async deleteUserEvents(userId: string): Promise<void> {
    this.events = this.events.filter((e) => e.userId !== userId);
  }

  async getStats(): Promise<{
    totalEvents: number;
    totalSessions: number;
    totalUsers: number;
    storageSize: number;
  }> {
    const sessions = [...new Set(this.events.map((e) => e.sessionId))];
    const users = [
      ...new Set(this.events.filter((e) => e.userId).map((e) => e.userId!)),
    ];

    return {
      totalEvents: this.events.length,
      totalSessions: sessions.length,
      totalUsers: users.length,
      storageSize: JSON.stringify(this.events).length,
    };
  }

  async close(): Promise<void> {
    this.isInitialized = false;
  }

  async testConnection(): Promise<boolean> {
    return this.isInitialized;
  }

  /**
   * Clear all stored events (useful for testing)
   */
  clear(): void {
    this.events = [];
  }

  /**
   * Get all stored events (useful for testing)
   */
  getAllEvents(): ChatEvent[] {
    return [...this.events];
  }
}
