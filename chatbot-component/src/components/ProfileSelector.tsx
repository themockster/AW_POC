import React, { useState } from "react";
import { Profile } from "../types";
import { cn } from "../utils/cn";

interface ProfileSelectorProps {
  profiles: Profile[];
  currentProfile: Profile | null;
  onProfileChange: (profile: Profile) => void;
  allowCreation?: boolean;
  onError?: (error: Error) => void;
}

export const ProfileSelector: React.FC<ProfileSelectorProps> = ({
  profiles,
  currentProfile,
  onProfileChange,
  allowCreation = true,
  onError,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleProfileSelect = (profile: Profile) => {
    onProfileChange(profile);
    setIsOpen(false);
  };

  return (
    <div className="chatbot-profile-selector">
      <button
        className="chatbot-profile-button"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <span className="chatbot-profile-name">
          {currentProfile?.name || "Select Profile"}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={cn(
            "chatbot-profile-arrow",
            isOpen && "chatbot-profile-arrow-open"
          )}
        >
          <polyline points="6,9 12,15 18,9"></polyline>
        </svg>
      </button>

      {isOpen && (
        <div className="chatbot-profile-dropdown">
          {profiles.map((profile) => (
            <button
              key={profile.id}
              className={cn(
                "chatbot-profile-option",
                currentProfile?.id === profile.id &&
                  "chatbot-profile-option-active"
              )}
              onClick={() => handleProfileSelect(profile)}
              type="button"
            >
              <div className="chatbot-profile-option-content">
                <div className="chatbot-profile-option-name">
                  {profile.name}
                </div>
                {profile.description && (
                  <div className="chatbot-profile-option-description">
                    {profile.description}
                  </div>
                )}
              </div>
              {profile.is_default && (
                <span className="chatbot-profile-option-default">Default</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
