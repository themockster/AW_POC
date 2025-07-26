/**
 * TypeScript types for the Chatbot Component
 */

export interface ChatMessage {
  id: string;
  content: string;
  role: "user" | "assistant" | "system";
  timestamp: Date;
  tokens_used?: number;
  response_time?: number;
}

export interface Profile {
  id: number;
  name: string;
  description?: string;
  system_instructions: string;
  llm_provider: string;
  llm_model?: string;
  temperature: string;
  max_tokens: number;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Session {
  session_id: string;
  title: string;
  is_active: boolean;
  created_at: string;
  last_activity: string;
  profile_id: number;
}

export interface ChatbotProps {
  // Configuration
  apiEndpoint: string;
  apiKey?: string;
  theme?: "light" | "dark" | "auto";

  // Authentication
  autoLogin?: boolean;
  username?: string;
  password?: string;

  // Profile Management
  defaultProfileId?: number;
  allowProfileCreation?: boolean;

  // Chat Configuration
  maxMessages?: number;
  enableHistory?: boolean;

  // Callbacks
  onMessageSent?: (message: ChatMessage) => void;
  onMessageReceived?: (message: ChatMessage) => void;
  onProfileChanged?: (profile: Profile) => void;
  onError?: (error: Error) => void;

  // Styling
  className?: string;
  style?: any;

  // Integration
  userId?: string;
  sessionId?: string;
}

export interface ChatbotState {
  messages: ChatMessage[];
  profiles: Profile[];
  sessions: Session[];
  currentProfile: Profile | null;
  currentSession: Session | null;
  isLoading: boolean;
  error: string | null;
  isTyping: boolean;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export interface SendMessageRequest {
  content: string;
  session_id?: string;
  profile_id?: number;
}

export interface SendMessageResponse {
  message_id: string;
  content: string;
  role: string;
  timestamp: string;
  tokens_used?: number;
  response_time?: number;
}
