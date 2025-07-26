# Chatbot Component

A modern, modular chatbot component for React applications that can be easily integrated into larger systems.

## Features

- 🤖 **Multi-LLM Support**: Works with LM Studio, Azure OpenAI, and other providers
- 👤 **Profile Management**: Create and switch between different chatbot personalities
- 💬 **Real-time Chat**: Modern chat interface with typing indicators
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🎨 **Themeable**: Light, dark, and auto themes
- 🔧 **Modular**: Easy to integrate into larger applications
- 📊 **Session Management**: Chat history and session persistence
- 🔒 **Authentication**: JWT-based authentication support

## Installation

```bash
npm install @your-org/chatbot-component
```

## Quick Start

```jsx
import { Chatbot } from "@your-org/chatbot-component";

function App() {
  return (
    <div className="app">
      <Chatbot
        apiEndpoint="http://localhost:8000"
        apiKey="your-api-key"
        theme="dark"
        onMessageSent={(message) => console.log("Message sent:", message)}
        onError={(error) => console.error("Error:", error)}
      />
    </div>
  );
}
```

## Props

### Required Props

- `apiEndpoint`: URL of your chatbot backend service

### Optional Props

- `apiKey`: API key for authentication
- `theme`: Theme mode ('light', 'dark', 'auto')
- `defaultProfileId`: ID of the default profile to use
- `allowProfileCreation`: Whether to allow creating new profiles
- `maxMessages`: Maximum number of messages to keep in memory
- `enableHistory`: Whether to enable chat history
- `onMessageSent`: Callback when a message is sent
- `onMessageReceived`: Callback when a message is received
- `onProfileChanged`: Callback when profile is changed
- `onError`: Callback for error handling
- `className`: Additional CSS classes
- `style`: Additional inline styles
- `userId`: User ID for integration
- `sessionId`: Session ID to load

## Backend Integration

This component requires a backend service that implements the following API endpoints:

- `POST /api/v1/chat/send` - Send a message
- `GET /api/v1/profiles` - Get user profiles
- `GET /api/v1/chat/sessions` - Get chat sessions
- `GET /api/v1/chat/history/{session_id}` - Get chat history
- `POST /api/v1/auth/login` - User authentication

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build the component
npm run build

# Run tests
npm test

# Start Storybook
npm run storybook
```

## Building

```bash
npm run build
```

This will create a `dist` folder with:

- `index.js` - CommonJS bundle
- `index.esm.js` - ES Module bundle
- `index.d.ts` - TypeScript declarations

## License

MIT
