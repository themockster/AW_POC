/**
 * Event types and constants for the Chatbot Tracker
 */

import { ChatEvent, LLMResponse } from '../../types';

export enum EventType {
  USER_MESSAGE = 'user_message',
  LLM_RESPONSE = 'llm_response',
  SYSTEM_INSTRUCTION = 'system_instruction',
  ERROR = 'error',
  SESSION_START = 'session_start',
  SESSION_END = 'session_end',
  MODEL_CHANGE = 'model_change',
  PROVIDER_CHANGE = 'provider_change'
}

export enum Role {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system'
}

export interface UserMessageEvent extends Omit<ChatEvent, 'eventType' | 'role'> {
  eventType: EventType.USER_MESSAGE;
  role: Role.USER;
  content: string;
  context?: {
    conversationHistory: string[];
    systemPrompt?: string;
  };
}

export interface LLMResponseEvent extends Omit<ChatEvent, 'eventType' | 'role'> {
  eventType: EventType.LLM_RESPONSE;
  role: Role.ASSISTANT;
  content: string;
  model: string;
  provider: string;
  tokensUsed: number;
  responseTime: number;
  finishReason?: string;
  context?: {
    conversationHistory: string[];
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
  };
}

export interface SystemInstructionEvent extends Omit<ChatEvent, 'eventType' | 'role'> {
  eventType: EventType.SYSTEM_INSTRUCTION;
  role: Role.SYSTEM;
  content: string;
  context?: {
    conversationHistory: string[];
  };
}

export interface ErrorEvent extends Omit<ChatEvent, 'eventType' | 'role' | 'metadata'> {
  eventType: EventType.ERROR;
  role: Role.SYSTEM;
  content: string;
  metadata: {
    apiEndpoint?: string;
    error: string;
    stackTrace?: string;
    requestId?: string;
    cost?: number;
    latency?: number;
  };
}

export interface SessionStartEvent extends Omit<ChatEvent, 'eventType' | 'role' | 'metadata'> {
  eventType: EventType.SESSION_START;
  role: Role.SYSTEM;
  content: 'Session started';
  metadata: {
    apiEndpoint?: string;
    sessionId: string;
    userId?: string;
    userAgent?: string;
    ipAddress?: string;
    requestId?: string;
    error?: string;
    cost?: number;
    latency?: number;
  };
}

export interface SessionEndEvent extends Omit<ChatEvent, 'eventType' | 'role' | 'metadata'> {
  eventType: EventType.SESSION_END;
  role: Role.SYSTEM;
  content: 'Session ended';
  metadata: {
    apiEndpoint?: string;
    sessionId: string;
    duration: number;
    totalMessages: number;
    totalTokens: number;
    requestId?: string;
    error?: string;
    cost?: number;
    latency?: number;
  };
}

export interface ModelChangeEvent extends Omit<ChatEvent, 'eventType' | 'role' | 'metadata'> {
  eventType: EventType.MODEL_CHANGE;
  role: Role.SYSTEM;
  content: `Model changed from ${string} to ${string}`;
  metadata: {
    apiEndpoint?: string;
    previousModel: string;
    newModel: string;
    reason?: string;
    requestId?: string;
    error?: string;
    cost?: number;
    latency?: number;
  };
}

export interface ProviderChangeEvent extends Omit<ChatEvent, 'eventType' | 'role' | 'metadata'> {
  eventType: EventType.PROVIDER_CHANGE;
  role: Role.SYSTEM;
  content: `Provider changed from ${string} to ${string}`;
  metadata: {
    apiEndpoint?: string;
    previousProvider: string;
    newProvider: string;
    reason?: string;
    requestId?: string;
    error?: string;
    cost?: number;
    latency?: number;
  };
}

export type TrackingEvent = 
  | UserMessageEvent 
  | LLMResponseEvent 
  | SystemInstructionEvent 
  | ErrorEvent
  | SessionStartEvent
  | SessionEndEvent
  | ModelChangeEvent
  | ProviderChangeEvent;

// Constants for token counting
export const TOKEN_ESTIMATION_RATIOS = {
  // Rough estimation: 1 token ≈ 4 characters for English
  ENGLISH: 4,
  // For other languages, adjust as needed
  FRENCH: 3.5,
  SPANISH: 3.5,
  GERMAN: 3.8,
  CHINESE: 2,
  JAPANESE: 2.5,
  KOREAN: 2.5,
  DEFAULT: 4
};

// Cost per 1K tokens (approximate, should be updated regularly)
export const COST_PER_1K_TOKENS = {
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

// Default configuration values
export const DEFAULT_CONFIG = {
  enableTokenCounting: true,
  enableResponseTimeTracking: true,
  enableContextTracking: true,
  enableCostTracking: true,
  batchSize: 100,
  flushInterval: 5000, // 5 seconds
  anonymizeUserData: false,
  excludeSensitiveData: false
}; 