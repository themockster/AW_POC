import React from "react";
import { ChatMessage } from "../types";
import { cn } from "../utils/cn";

interface MessageListProps {
  messages: ChatMessage[];
  isTyping: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isTyping,
}) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="chatbot-message-list">
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn("chatbot-message", `chatbot-message-${message.role}`)}
        >
          <div className="chatbot-message-content">
            <div className="chatbot-message-text">{message.content}</div>
            <div className="chatbot-message-meta">
              <span className="chatbot-message-time">
                {formatTime(message.timestamp)}
              </span>
              {message.tokens_used && (
                <span className="chatbot-message-tokens">
                  {message.tokens_used} tokens
                </span>
              )}
              {message.response_time && (
                <span className="chatbot-message-time">
                  {message.response_time}ms
                </span>
              )}
            </div>
          </div>
        </div>
      ))}

      {isTyping && (
        <div className="chatbot-message chatbot-message-assistant">
          <div className="chatbot-message-content">
            <div className="chatbot-typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
