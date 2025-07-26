/**
 * Main entry point for the AgentWatch module
 */

// Core exports
export { ChatbotTracker } from "./core/Tracker";
export { EventType, Role, DEFAULT_CONFIG } from "./core/EventTypes";

// Provider exports
export { BaseProvider, AbstractProvider } from "./providers/BaseProvider";
export type { ProviderConstructor } from "./providers/BaseProvider";

// Storage exports
export { BaseStorage, AbstractStorage } from "./storage/BaseStorage";
export type { StorageConstructor } from "./storage/BaseStorage";

// Type exports
export type {
  ChatEvent,
  LLMResponse,
  SessionMetrics,
  UserMetrics,
  ProviderMetrics,
  TrackerConfig,
  ProviderCapabilities,
  TrackingContext,
  TrackingResult,
  MetricsQuery,
  TrackingReport,
} from "../types";

// Provider implementations
export { LMStudioProvider } from "./providers/LMStudioProvider";

// Storage implementations
export { MemoryStorage } from "./storage/MemoryStorage";

// Web server
export { app as webServer } from "./server/index";
