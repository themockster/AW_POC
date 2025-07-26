/**
 * Core types for the Chatbot Tracker module
 */

export interface ChatEvent {
  id: string;
  timestamp: Date;
  sessionId: string;
  userId?: string;
  eventType: 'user_message' | 'llm_response' | 'system_instruction' | 'error';
  
  // Message data
  content: string;
  role: 'user' | 'assistant' | 'system';
  
  // LLM metadata
  model?: string;
  provider?: string;
  tokensUsed?: number;
  responseTime?: number;
  
  // Context
  context?: {
    conversationHistory: string[];
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  };
  
  // Technical metadata
  metadata?: {
    apiEndpoint: string;
    requestId?: string;
    error?: string;
    cost?: number;
    latency?: number;
  };
}

export interface LLMResponse {
  content: string;
  model: string;
  provider: string;
  tokensUsed: number;
  responseTime: number;
  finishReason?: string;
  metadata?: Record<string, any>;
}

export interface SessionMetrics {
  sessionId: string;
  userId?: string;
  startTime: Date;
  endTime?: Date;
  totalMessages: number;
  totalTokens: number;
  totalCost: number;
  averageResponseTime: number;
  modelsUsed: string[];
  errors: number;
}

export interface UserMetrics {
  userId: string;
  totalSessions: number;
  totalMessages: number;
  totalTokens: number;
  totalCost: number;
  averageSessionLength: number;
  favoriteModels: string[];
  lastActivity: Date;
}

export interface ProviderMetrics {
  provider: string;
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  averageResponseTime: number;
  errorRate: number;
  modelsUsed: string[];
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface TrackerConfig {
  // Provider configuration
  provider: 'lm-studio' | 'azure' | 'aws' | 'openai';
  apiEndpoint: string;
  apiKey?: string;
  
  // Storage configuration
  storage: {
    type: 'database' | 'file' | 'memory';
    config: any;
  };
  
  // Tracking options
  enableTokenCounting: boolean;
  enableResponseTimeTracking: boolean;
  enableContextTracking: boolean;
  enableCostTracking: boolean;
  
  // Filtering
  excludePatterns?: string[];
  includeOnlyPatterns?: string[];
  
  // Performance
  batchSize?: number;
  flushInterval?: number;
  
  // Privacy
  anonymizeUserData?: boolean;
  excludeSensitiveData?: boolean;
}

export interface ProviderCapabilities {
  supportsStreaming: boolean;
  supportsFunctionCalling: boolean;
  supportsVision: boolean;
  maxTokens: number;
  availableModels: string[];
  costPerToken: Record<string, number>;
}

export interface TrackingContext {
  sessionId: string;
  userId?: string;
  conversationHistory: ChatEvent[];
  systemPrompt?: string;
  metadata?: Record<string, any>;
}

export interface TrackingResult {
  success: boolean;
  eventId: string;
  timestamp: Date;
  error?: string;
}

export interface MetricsQuery {
  startDate?: Date;
  endDate?: Date;
  sessionId?: string;
  userId?: string;
  provider?: string;
  model?: string;
  limit?: number;
  offset?: number;
}

export interface TrackingReport {
  summary: {
    totalEvents: number;
    totalSessions: number;
    totalUsers: number;
    totalTokens: number;
    totalCost: number;
    averageResponseTime: number;
  };
  breakdown: {
    byProvider: Record<string, number>;
    byModel: Record<string, number>;
    byEventType: Record<string, number>;
    byTime: Record<string, number>;
  };
  topSessions: SessionMetrics[];
  topUsers: UserMetrics[];
} 