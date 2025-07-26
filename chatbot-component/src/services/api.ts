/**
 * API service for communicating with the chatbot backend
 */

import {
  ChatMessage,
  Profile,
  Session,
  SendMessageRequest,
  SendMessageResponse,
  ApiResponse,
} from "../types";

export class ChatbotApi {
  private baseUrl: string;
  private apiKey?: string;
  private accessToken?: string;
  private isAuthenticated: boolean = false;
  private autoLogin: boolean = true;
  private username?: string;
  private password?: string;

  constructor(
    baseUrl: string,
    apiKey?: string,
    options?: {
      autoLogin?: boolean;
      username?: string;
      password?: string;
    }
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, ""); // Remove trailing slash
    this.apiKey = apiKey;
    this.autoLogin = options?.autoLogin ?? true;
    this.username = options?.username;
    this.password = options?.password;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    // Use JWT token if available, otherwise fall back to apiKey
    if (this.accessToken) {
      (headers as any)["Authorization"] = `Bearer ${this.accessToken}`;
    } else if (this.apiKey) {
      (headers as any)["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  // Auto-authentication method
  async authenticate(): Promise<void> {
    if (this.isAuthenticated && this.accessToken) {
      return; // Already authenticated
    }

    // If autoLogin is disabled and we have an apiKey, use it directly
    if (!this.autoLogin && this.apiKey) {
      this.accessToken = this.apiKey;
      this.isAuthenticated = true;
      return;
    }

    try {
      // Try to authenticate with provided credentials or defaults
      const loginUsername = this.username || "demo_user";
      const loginPassword = this.password || "demo123";

      const tokenData = await this.login(loginUsername, loginPassword);
      this.accessToken = tokenData.access_token;
      this.isAuthenticated = true;
    } catch (error) {
      // If auto-login fails, try to use apiKey as fallback
      if (this.apiKey) {
        this.accessToken = this.apiKey;
        this.isAuthenticated = true;
      } else {
        throw new Error("Authentication failed: No valid credentials provided");
      }
    }
  }

  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    await this.authenticate();
    return this.request<SendMessageResponse>("/api/v1/chat/send", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async getProfiles(): Promise<Profile[]> {
    await this.authenticate();
    return this.request<Profile[]>("/api/v1/profiles");
  }

  async getSessions(): Promise<Session[]> {
    await this.authenticate();
    return this.request<Session[]>("/api/v1/chat/sessions");
  }

  async getChatHistory(sessionId: string): Promise<{
    session_id: string;
    title: string;
    messages: SendMessageResponse[];
    created_at: string;
    last_activity: string;
  }> {
    await this.authenticate();
    return this.request(`/api/v1/chat/history/${sessionId}`);
  }

  async deleteSession(sessionId: string): Promise<{ message: string }> {
    await this.authenticate();
    return this.request<{ message: string }>(
      `/api/v1/chat/sessions/${sessionId}`,
      {
        method: "DELETE",
      }
    );
  }

  async createProfile(profileData: {
    name: string;
    description?: string;
    system_instructions: string;
    llm_provider?: string;
    llm_model?: string;
    temperature?: string;
    max_tokens?: number;
    is_default?: boolean;
  }): Promise<Profile> {
    await this.authenticate();
    return this.request<Profile>("/api/v1/profiles", {
      method: "POST",
      body: JSON.stringify(profileData),
    });
  }

  async updateProfile(
    profileId: number,
    profileData: Partial<{
      name: string;
      description: string;
      system_instructions: string;
      llm_provider: string;
      llm_model: string;
      temperature: string;
      max_tokens: number;
      is_default: boolean;
      is_active: boolean;
    }>
  ): Promise<Profile> {
    await this.authenticate();
    return this.request<Profile>(`/api/v1/profiles/${profileId}`, {
      method: "PUT",
      body: JSON.stringify(profileData),
    });
  }

  async deleteProfile(profileId: number): Promise<{ message: string }> {
    await this.authenticate();
    return this.request<{ message: string }>(`/api/v1/profiles/${profileId}`, {
      method: "DELETE",
    });
  }

  async login(
    username: string,
    password: string
  ): Promise<{ access_token: string; token_type: string }> {
    const formData = new FormData();
    formData.append("username", username);
    formData.append("password", password);

    const response = await fetch(`${this.baseUrl}/api/v1/auth/login`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Login failed: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  async getCurrentUser(): Promise<{
    id: number;
    username: string;
    email: string;
    is_active: boolean;
    is_superuser: boolean;
  }> {
    await this.authenticate();
    return this.request("/api/v1/auth/me");
  }

  async healthCheck(): Promise<{
    status: string;
    service: string;
    version: string;
    environment: string;
  }> {
    return this.request("/api/v1/health");
  }
}
