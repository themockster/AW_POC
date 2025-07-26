import React from "react";
import { Session } from "../types";
import { cn } from "../utils/cn";

interface SessionListProps {
  sessions: Session[];
  currentSession: Session | null;
  onSessionSelect: (session: Session) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
}

export const SessionList: React.FC<SessionListProps> = ({
  sessions,
  currentSession,
  onSessionSelect,
  onNewSession,
  onDeleteSession,
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="chatbot-session-list">
      <div className="chatbot-session-header">
        <h4>Chat Sessions</h4>
        <button
          className="chatbot-new-session-button"
          onClick={onNewSession}
          type="button"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New Chat
        </button>
      </div>

      <div className="chatbot-session-items">
        {sessions.map((session) => (
          <div
            key={session.session_id}
            className={cn(
              "chatbot-session-item",
              currentSession?.session_id === session.session_id &&
                "chatbot-session-item-active"
            )}
          >
            <button
              className="chatbot-session-button"
              onClick={() => onSessionSelect(session)}
              type="button"
            >
              <div className="chatbot-session-content">
                <div className="chatbot-session-title">{session.title}</div>
                <div className="chatbot-session-date">
                  {formatDate(session.last_activity)}
                </div>
              </div>
            </button>
            <button
              className="chatbot-session-delete"
              onClick={() => onDeleteSession(session.session_id)}
              type="button"
              title="Delete session"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="3,6 5,6 21,6"></polyline>
                <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
