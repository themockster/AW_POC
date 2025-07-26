/**
 * AgentWatch Web Server
 * Provides REST API and serves the monitoring dashboard with chatbot configuration
 */

import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import path from "path";
import { ChatbotTracker } from "../core/Tracker";
import { LMStudioProvider } from "../providers/LMStudioProvider";
import { MemoryStorage } from "../storage/MemoryStorage";
import { TrackerConfig } from "../../types";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.static(path.join(process.cwd(), "public")));

// Chatbot configurations storage
interface ChatbotConfig {
  id: string;
  name: string;
  description?: string;
  lmStudioUrl: string;
  isActive: boolean;
  createdAt: Date;
  lastSeen?: Date;
}

// In-memory storage for chatbot configurations (in production, use a database)
const chatbotConfigs: Map<string, ChatbotConfig> = new Map();
const trackers: Map<string, ChatbotTracker> = new Map();

// Initialize default configuration for LM Studio monitoring
const defaultConfig: ChatbotConfig = {
  id: "default",
  name: "LM Studio Monitor",
  description: "Monitors LM Studio on port 1234",
  lmStudioUrl: "http://localhost:1234", // LM Studio runs on 1234, AgentWatch proxies on 8080
  isActive: true,
  createdAt: new Date(),
};

chatbotConfigs.set(defaultConfig.id, defaultConfig);

// Helper function to get the active tracker
function getActiveTracker(): ChatbotTracker | null {
  return Array.from(trackers.values())[0] || null;
}

// Initialize tracker for a specific chatbot
async function initializeTracker(
  config: ChatbotConfig
): Promise<ChatbotTracker | null> {
  try {
    const trackerConfig: TrackerConfig = {
      provider: "lm-studio",
      apiEndpoint: config.lmStudioUrl,
      storage: {
        type: "memory",
        config: {},
      },
      enableTokenCounting: true,
      enableResponseTimeTracking: true,
      enableContextTracking: true,
      enableCostTracking: true,
    };

    const provider = new LMStudioProvider(trackerConfig);
    const storage = new MemoryStorage(trackerConfig.storage.config);
    const tracker = new ChatbotTracker(provider, storage, trackerConfig);

    await tracker.initialize();
    console.log(`✅ Tracker initialized for chatbot: ${config.name}`);
    return tracker;
  } catch (error) {
    console.error(`❌ Failed to initialize tracker for ${config.name}:`, error);
    return null;
  }
}

// Initialize all active trackers
async function initializeAllTrackers() {
  console.log(`🔄 Initializing ${chatbotConfigs.size} trackers...`);
  for (const [id, config] of chatbotConfigs) {
    if (config.isActive) {
      console.log(`📡 Initializing tracker for: ${config.name} (${id})`);
      const tracker = await initializeTracker(config);
      if (tracker) {
        trackers.set(id, tracker);
        console.log(`✅ Tracker ${id} initialized successfully`);
      }
    }
  }
  console.log(`🎯 Total active trackers: ${trackers.size}`);
}

// API Routes

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    activeTrackers: trackers.size,
    totalConfigs: chatbotConfigs.size,
  });
});

// Chatbot Configuration Management
app.get("/api/chatbots", (req, res) => {
  const configs = Array.from(chatbotConfigs.values()).map((config) => ({
    ...config,
    hasTracker: trackers.has(config.id),
  }));
  res.json(configs);
});

app.post("/api/chatbots", async (req, res) => {
  try {
    const { name, description, lmStudioUrl } = req.body;

    if (!name || !lmStudioUrl) {
      return res
        .status(400)
        .json({ error: "Name and lmStudioUrl are required" });
    }

    const config: ChatbotConfig = {
      id: `chatbot_${Date.now()}`,
      name,
      description,
      lmStudioUrl,
      isActive: true,
      createdAt: new Date(),
    };

    chatbotConfigs.set(config.id, config);

    // Initialize tracker for new chatbot
    const tracker = await initializeTracker(config);
    if (tracker) {
      trackers.set(config.id, tracker);
    }

    res.status(201).json(config);
  } catch (error) {
    res.status(500).json({ error: "Failed to create chatbot configuration" });
  }
});

app.put("/api/chatbots/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const config = chatbotConfigs.get(id);

    if (!config) {
      return res.status(404).json({ error: "Chatbot configuration not found" });
    }

    const updatedConfig = { ...config, ...req.body };
    chatbotConfigs.set(id, updatedConfig);

    // Reinitialize tracker if URL changed or activation status changed
    if (
      updatedConfig.lmStudioUrl !== config.lmStudioUrl ||
      updatedConfig.isActive !== config.isActive
    ) {
      if (trackers.has(id)) {
        trackers.delete(id);
      }

      if (updatedConfig.isActive) {
        const tracker = await initializeTracker(updatedConfig);
        if (tracker) {
          trackers.set(id, tracker);
        }
      }
    }

    res.json(updatedConfig);
  } catch (error) {
    res.status(500).json({ error: "Failed to update chatbot configuration" });
  }
});

app.delete("/api/chatbots/:id", (req, res) => {
  const { id } = req.params;

  if (id === "default") {
    return res
      .status(400)
      .json({ error: "Cannot delete default configuration" });
  }

  if (trackers.has(id)) {
    trackers.delete(id);
  }

  chatbotConfigs.delete(id);
  res.json({ message: "Chatbot configuration deleted" });
});

// Proxy endpoint to intercept and track all LLM requests
app.post("/api/proxy/chat", async (req, res) => {
  try {
    const { message, sessionId, userId, context } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Get the first available tracker (there should be only one configured)
    const tracker = Array.from(trackers.values())[0];

    if (!tracker) {
      return res.status(500).json({
        error: "No active tracker available. Please configure a chatbot first.",
      });
    }

    console.log(
      `🎯 Using tracker: ${tracker.getConfig().provider} (${tracker.getConfig().apiEndpoint})`
    );

    console.log(`🔄 Intercepting message: "${message.substring(0, 50)}..."`);

    // Generate a consistent sessionId for this conversation
    const currentSessionId = sessionId || `session_${Date.now()}`;

    console.log(`🔍 Using sessionId: ${currentSessionId}`);

    // Send message to LM Studio through the tracker (this will handle tracking internally)
    const startTime = Date.now();
    const llmResponse = await tracker.sendMessage(message, {
      userId,
      sessionId: currentSessionId,
      systemPrompt: context?.system_prompt,
      temperature: context?.temperature,
      maxTokens: context?.max_tokens,
      ...context,
    });
    const responseTime = Date.now() - startTime;

    console.log(`✅ Message processed in ${responseTime}ms`);

    // Return the response to the client
    res.json({
      response: llmResponse.content || llmResponse.response || llmResponse,
      status: "success",
      tracking: {
        responseTime,
      },
    });
  } catch (error) {
    console.error("❌ Proxy error:", error);

    // Track the error
    const tracker = getActiveTracker();
    if (tracker) {
      const errorSessionId = req.body.sessionId || `session_${Date.now()}`;
      await tracker.trackError(errorSessionId, error as Error, {
        userId: req.body.userId,
        ...req.body.context,
      });
    }

    res.status(500).json({
      error: "Failed to process message",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Health check for the proxy
app.get("/api/proxy/health", (req, res) => {
  const activeTrackers = Array.from(trackers.values());
  res.json({
    status: "ok",
    activeTrackers: activeTrackers.length,
    defaultTracker: trackers.size > 0,
    timestamp: new Date().toISOString(),
  });
});

// LM Studio API proxy - intercepts all requests to LM Studio
app.post("/v1/chat/completions", async (req, res) => {
  try {
    const { messages, model, temperature, max_tokens, stream } = req.body;

    console.log(
      `🔄 Intercepting LM Studio request: ${messages?.length || 0} messages`
    );

    // Get the active tracker
    const tracker = getActiveTracker();
    if (!tracker) {
      return res.status(500).json({ error: "No active tracker available" });
    }

    // Extract user message from the conversation
    const userMessage =
      messages?.find((m: any) => m.role === "user")?.content || "";
    const systemMessage =
      messages?.find((m: any) => m.role === "system")?.content || "";

    // Generate session ID
    const sessionId = `session_${Date.now()}`;

    // Send to LM Studio through tracker
    const startTime = Date.now();
    const llmResponse = await tracker.sendMessage(userMessage, {
      sessionId,
      systemPrompt: systemMessage,
    });
    const responseTime = Date.now() - startTime;

    console.log(`✅ LM Studio request processed in ${responseTime}ms`);

    // Return response in LM Studio format
    res.json({
      id: `chatcmpl-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: model || "local-model",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: llmResponse.content || llmResponse.response || llmResponse,
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    });
  } catch (error) {
    console.error("❌ LM Studio proxy error:", error);
    res.status(500).json({
      error: "Failed to process request",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Models endpoint proxy
app.get("/v1/models", async (req, res) => {
  try {
    const tracker = getActiveTracker();
    if (!tracker) {
      return res.status(500).json({ error: "No active tracker available" });
    }

    // Forward to actual LM Studio
    const response = await fetch("http://localhost:1234/v1/models");
    const models = await response.json();

    res.json(models);
  } catch (error) {
    console.error("❌ Models proxy error:", error);
    res.status(500).json({ error: "Failed to fetch models" });
  }
});

// Transparent proxy for all LLM requests - intercepts without duplication
app.post("/v1/chat/completions", async (req, res) => {
  try {
    const { messages, model, temperature, max_tokens, stream } = req.body;

    console.log(
      `🔄 AgentWatch intercepting LLM request: ${messages?.length || 0} messages`
    );

    // Get the active tracker
    const tracker = getActiveTracker();
    if (!tracker) {
      return res.status(500).json({ error: "No active tracker available" });
    }

    // Extract user message from the conversation
    const userMessage =
      messages?.find((m: any) => m.role === "user")?.content || "";
    const systemMessage =
      messages?.find((m: any) => m.role === "system")?.content || "";

    // Generate session ID
    const sessionId = `session_${Date.now()}`;

    // Track the user message (only once)
    await tracker.trackUserMessage(sessionId, userMessage, {
      systemPrompt: systemMessage,
    });

    // Forward request to actual LM Studio
    const startTime = Date.now();
    const response = await fetch("http://localhost:1234/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      throw new Error(
        `LM Studio error: ${response.status} ${response.statusText}`
      );
    }

    const llmResponse = await response.json();
    const responseTime = Date.now() - startTime;

    // Extract LLM response content
    const llmContent = llmResponse.choices?.[0]?.message?.content || "";

    // Track the LLM response (only once)
    await tracker.trackLLMResponse(sessionId, {
      content: llmContent,
      responseTime,
    });

    console.log(
      `✅ AgentWatch intercepted and tracked request in ${responseTime}ms`
    );

    // Return the original LM Studio response (no modification)
    res.json(llmResponse);
  } catch (error) {
    console.error("❌ AgentWatch proxy error:", error);
    res.status(500).json({
      error: "Failed to process request",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get dashboard data for specific chatbot
app.get("/api/chatbots/:id/dashboard", async (req, res) => {
  try {
    const { id } = req.params;
    const tracker = trackers.get(id);

    if (!tracker) {
      return res
        .status(404)
        .json({ error: "Tracker not found for this chatbot" });
    }

    const stats = await tracker.getStats();
    const report = await tracker.generateReport({
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24h
      endDate: new Date(),
    });

    res.json({
      stats,
      report: report.summary,
      breakdown: report.breakdown,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get dashboard data" });
  }
});

// Get sessions for specific chatbot
app.get("/api/chatbots/:id/sessions", async (req, res) => {
  try {
    const { id } = req.params;
    const tracker = trackers.get(id);

    if (!tracker) {
      return res
        .status(404)
        .json({ error: "Tracker not found for this chatbot" });
    }

    const { limit = 50, offset = 0 } = req.query;
    const events = await tracker.getStorage().queryEvents({
      limit: Number(limit),
      offset: Number(offset),
    });

    res.json(events);
  } catch (error) {
    res.status(500).json({ error: "Failed to get sessions" });
  }
});

// Legacy endpoints for backward compatibility
app.get("/api/dashboard", async (req, res) => {
  try {
    const tracker = getActiveTracker();
    if (!tracker) {
      return res.status(503).json({
        error: "No tracker available. Please configure a chatbot first.",
      });
    }

    const stats = await tracker.getStats();
    const report = await tracker.generateReport({
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      endDate: new Date(),
    });

    res.json({
      stats,
      report: report.summary,
      breakdown: report.breakdown,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get dashboard data" });
  }
});

app.get("/api/sessions", async (req, res) => {
  try {
    const tracker = getActiveTracker();
    if (!tracker) {
      return res.status(503).json({
        error: "No tracker available. Please configure a chatbot first.",
      });
    }

    const { limit = 50, offset = 0 } = req.query;
    const events = await tracker.getStorage().queryEvents({
      limit: Number(limit),
      offset: Number(offset),
    });

    res.json(events);
  } catch (error) {
    res.status(500).json({ error: "Failed to get sessions" });
  }
});

// Get session details
app.get("/api/sessions/:sessionId", async (req, res) => {
  try {
    const tracker = getActiveTracker();
    if (!tracker) {
      return res.status(503).json({
        error: "No tracker available. Please configure a chatbot first.",
      });
    }

    const { sessionId } = req.params;
    const events = await tracker.getStorage().getSessionEvents(sessionId);
    const metrics = await tracker.getSessionMetrics(sessionId);

    res.json({
      sessionId,
      events,
      metrics,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get session details" });
  }
});

// Get detailed conversation log for a session
app.get("/api/conversations/:sessionId", async (req, res) => {
  try {
    const tracker = getActiveTracker();
    if (!tracker) {
      return res.status(503).json({
        error: "No tracker available. Please configure a chatbot first.",
      });
    }

    const { sessionId } = req.params;
    const conversationLog = await tracker
      .getStorage()
      .getConversationLog(sessionId);

    res.json(conversationLog);
  } catch (error) {
    res.status(500).json({
      error: "Failed to get conversation log",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get all conversation logs with pagination
app.get("/api/conversations", async (req, res) => {
  try {
    const tracker = getActiveTracker();
    if (!tracker) {
      return res.status(503).json({
        error: "No tracker available. Please configure a chatbot first.",
      });
    }

    const { limit = 20, offset = 0 } = req.query;
    const conversationLogs = await tracker
      .getStorage()
      .getConversationLogs(Number(limit), Number(offset));

    res.json({
      conversations: conversationLogs,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        total: conversationLogs.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to get conversation logs",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get conversation logs for a specific chatbot
app.get("/api/chatbots/:id/conversations", async (req, res) => {
  try {
    const { id } = req.params;
    const tracker = trackers.get(id);

    if (!tracker) {
      return res
        .status(404)
        .json({ error: "Tracker not found for this chatbot" });
    }

    const { limit = 20, offset = 0 } = req.query;
    const conversationLogs = await tracker
      .getStorage()
      .getConversationLogs(Number(limit), Number(offset));

    res.json({
      conversations: conversationLogs,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        total: conversationLogs.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to get conversation logs",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get detailed conversation log for a specific chatbot
app.get("/api/chatbots/:id/conversations/:sessionId", async (req, res) => {
  try {
    const { id, sessionId } = req.params;
    const tracker = trackers.get(id);

    if (!tracker) {
      return res
        .status(404)
        .json({ error: "Tracker not found for this chatbot" });
    }

    const conversationLog = await tracker
      .getStorage()
      .getConversationLog(sessionId);

    res.json(conversationLog);
  } catch (error) {
    res.status(500).json({
      error: "Failed to get conversation log",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get users
app.get("/api/users", async (req, res) => {
  try {
    const tracker = getActiveTracker();
    if (!tracker) {
      return res.status(503).json({
        error: "No tracker available. Please configure a chatbot first.",
      });
    }

    const { limit = 50, offset = 0 } = req.query;
    const events = await tracker.getStorage().queryEvents({
      limit: Number(limit),
      offset: Number(offset),
    });

    // Group events by user
    const users = new Map();
    events.forEach((event) => {
      if (event.userId && !users.has(event.userId)) {
        users.set(event.userId, {
          userId: event.userId,
          totalSessions: 0,
          totalMessages: 0,
          totalTokens: 0,
          totalCost: 0,
          lastActivity: event.timestamp,
        });
      }

      if (event.userId) {
        const user = users.get(event.userId);
        user.totalMessages++;
        user.totalTokens += event.tokensUsed || 0;
        user.totalCost += event.metadata?.cost || 0;
        if (event.timestamp > user.lastActivity) {
          user.lastActivity = event.timestamp;
        }
      }
    });

    res.json(Array.from(users.values()));
  } catch (error) {
    res.status(500).json({ error: "Failed to get users" });
  }
});

// Get user details
app.get("/api/users/:userId", async (req, res) => {
  try {
    const tracker = getActiveTracker();
    if (!tracker) {
      return res.status(503).json({
        error: "No tracker available. Please configure a chatbot first.",
      });
    }

    const { userId } = req.params;
    const events = await tracker.getStorage().getUserEvents(userId);
    const metrics = await tracker.getUserMetrics(userId);

    res.json({
      userId,
      events,
      metrics,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get user details" });
  }
});

// Get real-time events
app.get("/api/events/realtime", async (req, res) => {
  try {
    const tracker = getActiveTracker();
    if (!tracker) {
      return res.status(503).json({
        error: "No tracker available. Please configure a chatbot first.",
      });
    }

    const { limit = 20 } = req.query;
    const events = await tracker.getStorage().queryEvents({
      limit: Number(limit),
    });

    res.json(events);
  } catch (error) {
    res.status(500).json({ error: "Failed to get real-time events" });
  }
});

// Send test message
app.post("/api/test-message", async (req, res) => {
  try {
    const tracker = getActiveTracker();
    if (!tracker) {
      return res.status(503).json({
        error: "No tracker available. Please configure a chatbot first.",
      });
    }

    const {
      message,
      sessionId = `test-${Date.now()}`,
      userId = "test-user",
    } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const response = await tracker.sendMessage(message, {
      sessionId,
      userId,
      conversationHistory: [],
      systemPrompt: "You are a helpful assistant.",
      metadata: {
        temperature: 0.7,
        maxTokens: 100,
      },
    });

    res.json({
      success: true,
      response,
      sessionId,
      userId,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to send test message" });
  }
});

// Serve the dashboard
app.get("/", (req, res) => {
  res.sendFile(path.join(process.cwd(), "public/index.html"));
});

// Start server
async function startServer() {
  try {
    await initializeAllTrackers();
  } catch (error) {
    console.warn("⚠️ Some trackers failed to initialize:", error);
  }

  app.listen(PORT, () => {
    console.log(`🚀 AgentWatch dashboard running on http://localhost:${PORT}`);
    console.log(`📊 API available at http://localhost:${PORT}/api`);
    console.log(
      `🔧 Configuration available at http://localhost:${PORT}/#configuration`
    );
  });
}

startServer().catch(console.error);

export { app };
