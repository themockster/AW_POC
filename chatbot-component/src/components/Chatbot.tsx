/**
 * Main Chatbot Component
 *
 * A modern, modular chatbot component that can be easily integrated
 * into larger React applications.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChatbotProps, ChatMessage, Profile, Session } from "../types";
import { ChatbotApi } from "../services/api";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { ProfileSelector } from "./ProfileSelector";
import { SessionList } from "./SessionList";
import { LoadingSpinner } from "./LoadingSpinner";
import { ErrorMessage } from "./ErrorMessage";
import { cn } from "../utils/cn";
import "./Chatbot.css";

export const Chatbot: React.FC<ChatbotProps> = ({
  apiEndpoint,
  apiKey,
  theme = "auto",
  autoLogin = true,
  username,
  password,
  defaultProfileId,
  allowProfileCreation = true,
  maxMessages = 100,
  enableHistory = true,
  onMessageSent,
  onMessageReceived,
  onProfileChanged,
  onError,
  className,
  style,
  userId,
  sessionId,
}) => {
  // State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showSessions, setShowSessions] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<ChatbotApi | null>(null);

  // Initialize API
  useEffect(() => {
    apiRef.current = new ChatbotApi(apiEndpoint, apiKey, {
      autoLogin,
      username,
      password,
    });
  }, [apiEndpoint, apiKey, autoLogin, username, password]);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      if (!apiRef.current) return;

      try {
        setIsLoading(true);
        setError(null);

        // Load profiles
        const profilesData = await apiRef.current.getProfiles();
        setProfiles(profilesData);

        // Set default profile
        const defaultProfile = defaultProfileId
          ? profilesData.find((p) => p.id === defaultProfileId)
          : profilesData.find((p) => p.is_default);

        if (defaultProfile) {
          setCurrentProfile(defaultProfile);
          onProfileChanged?.(defaultProfile);
        }

        // Load sessions if enabled
        if (enableHistory) {
          const sessionsData = await apiRef.current.getSessions();
          setSessions(sessionsData);

          // Load specific session if provided
          if (sessionId) {
            const session = sessionsData.find(
              (s) => s.session_id === sessionId
            );
            if (session) {
              await loadSession(session);
            }
          }
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load initial data";
        setError(errorMessage);
        onError?.(new Error(errorMessage));
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [
    apiEndpoint,
    apiKey,
    defaultProfileId,
    enableHistory,
    sessionId,
    onProfileChanged,
    onError,
  ]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load session history
  const loadSession = async (session: Session) => {
    if (!apiRef.current) return;

    try {
      setIsLoading(true);
      const history = await apiRef.current.getChatHistory(session.session_id);

      const chatMessages: ChatMessage[] = history.messages.map((msg) => ({
        id: msg.message_id,
        content: msg.content,
        role: msg.role as "user" | "assistant" | "system",
        timestamp: new Date(msg.timestamp),
        tokens_used: msg.tokens_used,
        response_time: msg.response_time,
      }));

      setMessages(chatMessages);
      setCurrentSession(session);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load session";
      setError(errorMessage);
      onError?.(new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  };

  // Send message
  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!apiRef.current || !currentProfile) {
        setError("No profile selected");
        return;
      }

      try {
        setIsTyping(true);
        setError(null);

        // Create user message
        const userMessage: ChatMessage = {
          id: `user-${Date.now()}`,
          content,
          role: "user",
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        onMessageSent?.(userMessage);

        // Send to API
        const response = await apiRef.current.sendMessage({
          content,
          session_id: currentSession?.session_id,
          profile_id: currentProfile.id,
        });

        // Create assistant message
        const assistantMessage: ChatMessage = {
          id: response.message_id,
          content: response.content,
          role: "assistant",
          timestamp: new Date(response.timestamp),
          tokens_used: response.tokens_used,
          response_time: response.response_time,
        };

        setMessages((prev) => {
          const newMessages = [...prev, assistantMessage];
          // Limit messages if maxMessages is set
          return maxMessages ? newMessages.slice(-maxMessages) : newMessages;
        });

        onMessageReceived?.(assistantMessage);

        // Refresh sessions if history is enabled
        if (enableHistory) {
          const sessionsData = await apiRef.current.getSessions();
          setSessions(sessionsData);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to send message";
        setError(errorMessage);
        onError?.(new Error(errorMessage));
      } finally {
        setIsTyping(false);
      }
    },
    [
      currentProfile,
      currentSession,
      maxMessages,
      enableHistory,
      onMessageSent,
      onMessageReceived,
      onError,
    ]
  );

  // Handle profile change
  const handleProfileChange = useCallback(
    (profile: Profile) => {
      setCurrentProfile(profile);
      onProfileChanged?.(profile);
    },
    [onProfileChanged]
  );

  // Handle session selection
  const handleSessionSelect = useCallback((session: Session) => {
    loadSession(session);
    setShowSessions(false);
  }, []);

  // Create new session
  const handleNewSession = useCallback(() => {
    setMessages([]);
    setCurrentSession(null);
    setShowSessions(false);
  }, []);

  // Delete session
  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      if (!apiRef.current) return;

      try {
        await apiRef.current.deleteSession(sessionId);
        setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));

        // If we're deleting the current session, clear messages
        if (currentSession?.session_id === sessionId) {
          setMessages([]);
          setCurrentSession(null);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete session";
        setError(errorMessage);
        onError?.(new Error(errorMessage));
      }
    },
    [currentSession, onError]
  );

  // Determine theme
  const getThemeClass = () => {
    if (theme === "auto") {
      return "chatbot-theme-auto";
    }
    return theme === "dark" ? "chatbot-theme-dark" : "chatbot-theme-light";
  };

  if (isLoading && messages.length === 0) {
    return (
      <div
        className={cn("chatbot-container", getThemeClass(), className)}
        style={style}
      >
        <div className="chatbot-loading">
          <LoadingSpinner />
          <p>Loading chatbot...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("chatbot-container", getThemeClass(), className)}
      style={style}
    >
      {/* Header */}
      <div className="chatbot-header">
        <div className="chatbot-header-left">
          <button
            className="chatbot-menu-button"
            onClick={() => setShowSessions(!showSessions)}
            title="Toggle sessions"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <h3 className="chatbot-title">
            {currentSession?.title || "New Chat"}
          </h3>
        </div>

        <div className="chatbot-header-right">
          <ProfileSelector
            profiles={profiles}
            currentProfile={currentProfile}
            onProfileChange={handleProfileChange}
            allowCreation={allowProfileCreation}
            onError={onError}
          />
        </div>
      </div>

      {/* Sessions Sidebar */}
      {showSessions && enableHistory && (
        <div className="chatbot-sessions-sidebar">
          <SessionList
            sessions={sessions}
            currentSession={currentSession}
            onSessionSelect={handleSessionSelect}
            onNewSession={handleNewSession}
            onDeleteSession={handleDeleteSession}
          />
        </div>
      )}

      {/* Main Chat Area */}
      <div className="chatbot-main">
        {/* Messages */}
        <div className="chatbot-messages">
          <MessageList messages={messages} isTyping={isTyping} />
          <div ref={messagesEndRef} />
        </div>

        {/* Error Message */}
        {error && (
          <ErrorMessage message={error} onDismiss={() => setError(null)} />
        )}

        {/* Input */}
        <div className="chatbot-input-container">
          <MessageInput
            onSendMessage={handleSendMessage}
            disabled={isTyping || !currentProfile}
            placeholder={
              currentProfile
                ? "Type your message..."
                : "Select a profile to start chatting..."
            }
          />
        </div>
      </div>
    </div>
  );
};
