/**
 * AgentWatch Dashboard Application
 */

class AgentWatchApp {
  constructor() {
    this.apiBase = "/api";
    this.currentTab = "dashboard";
    this.chatbots = [];
    this.charts = {};
    this.refreshInterval = null;
    this.selectedChatbotId = null;

    this.initializeApp();
  }

  async initializeApp() {
    this.setupEventListeners();
    await this.checkConnection();
    await this.loadChatbots();
    this.startAutoRefresh();
  }

  setupEventListeners() {
    // Tab navigation
    document.querySelectorAll(".nav-tab").forEach((tab) => {
      tab.addEventListener("click", (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    // Refresh button
    document.getElementById("refreshBtn").addEventListener("click", () => {
      this.refreshData();
    });

    // Chatbot configuration
    document.getElementById("addChatbotBtn").addEventListener("click", () => {
      this.showChatbotModal();
    });

    // Modal events
    document.getElementById("closeModal").addEventListener("click", () => {
      this.hideChatbotModal();
    });

    document.getElementById("cancelBtn").addEventListener("click", () => {
      this.hideChatbotModal();
    });

    document.getElementById("chatbotForm").addEventListener("submit", (e) => {
      e.preventDefault();
      this.saveChatbot();
    });

    // Session modal events
    document
      .getElementById("closeSessionModal")
      .addEventListener("click", () => {
        this.hideSessionModal();
      });

    // Close modals on outside click
    document.getElementById("chatbotModal").addEventListener("click", (e) => {
      if (e.target.id === "chatbotModal") {
        this.hideChatbotModal();
      }
    });

    document.getElementById("sessionModal").addEventListener("click", (e) => {
      if (e.target.id === "sessionModal") {
        this.hideSessionModal();
      }
    });
  }

  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll(".nav-tab").forEach((tab) => {
      tab.classList.remove("active");
    });

    const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeTab) {
      activeTab.classList.add("active");
    }

    // Update tab content
    document.querySelectorAll(".tab-content").forEach((content) => {
      content.classList.remove("active");
    });

    const activeContent = document.getElementById(`${tabName}-tab`);
    if (activeContent) {
      activeContent.classList.add("active");
    }

    this.currentTab = tabName;

    // Load tab-specific data
    if (tabName === "dashboard") {
      this.loadDashboardData();
    } else if (tabName === "sessions") {
      this.loadSessions();
    }
  }

  async checkConnection() {
    try {
      const response = await fetch(`${this.apiBase}/health`);
      const data = await response.json();

      this.updateStatusIndicator("connected");
      console.log("✅ Connected to AgentWatch API:", data);

      return true;
    } catch (error) {
      this.updateStatusIndicator("disconnected");
      console.error("❌ Failed to connect to AgentWatch API:", error);
      return false;
    }
  }

  updateStatusIndicator(status) {
    const indicator = document.getElementById("statusIndicator");
    const dot = indicator.querySelector(".status-dot");
    const text = indicator.querySelector(".status-text");

    indicator.className = `status-indicator ${status}`;

    if (status === "connected") {
      dot.style.backgroundColor = "#10b981";
      text.textContent = "Connected";
    } else {
      dot.style.backgroundColor = "#ef4444";
      text.textContent = "Disconnected";
    }
  }

  async loadChatbots() {
    try {
      const response = await fetch(`${this.apiBase}/chatbots`);
      this.chatbots = await response.json();
      this.renderChatbotList();
    } catch (error) {
      console.error("Failed to load chatbots:", error);
    }
  }

  renderChatbotList() {
    const container = document.getElementById("chatbotList");

    if (this.chatbots.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-robot"></i>
          <h3>No chatbots configured</h3>
          <p>Add your first chatbot to start monitoring</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.chatbots
      .map(
        (chatbot) => `
      <div class="chatbot-card">
        <div class="chatbot-header">
          <div class="chatbot-info">
            <h3>${chatbot.name}</h3>
            <p>${chatbot.description || "No description"}</p>
          </div>
          <div class="chatbot-status">
            <span class="status-badge ${chatbot.isActive ? "active" : "inactive"}">
              ${chatbot.isActive ? "Active" : "Inactive"}
            </span>
            <div class="chatbot-actions">
              <button onclick="app.editChatbot('${chatbot.id}')" title="Edit">
                <i class="fas fa-edit"></i>
              </button>
              <button onclick="app.toggleChatbot('${chatbot.id}')" title="${chatbot.isActive ? "Deactivate" : "Activate"}">
                <i class="fas fa-${chatbot.isActive ? "pause" : "play"}"></i>
              </button>
              ${
                chatbot.id !== "default"
                  ? `
                <button onclick="app.deleteChatbot('${chatbot.id}')" title="Delete">
                  <i class="fas fa-trash"></i>
                </button>
              `
                  : ""
              }
            </div>
          </div>
        </div>
        <div class="chatbot-details">
          <div class="detail-item">
            <span class="detail-label">LM Studio URL</span>
            <span class="detail-value">${chatbot.lmStudioUrl}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Status</span>
            <span class="detail-value">${chatbot.hasTracker ? "Connected" : "Disconnected"}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Created</span>
            <span class="detail-value">${new Date(chatbot.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    `
      )
      .join("");
  }

  showChatbotModal(chatbot = null) {
    const modal = document.getElementById("chatbotModal");
    const form = document.getElementById("chatbotForm");
    const title = document.getElementById("modalTitle");

    if (chatbot) {
      // Edit mode
      title.textContent = "Edit Chatbot";
      form.dataset.chatbotId = chatbot.id;
      document.getElementById("chatbotName").value = chatbot.name;
      document.getElementById("chatbotDescription").value =
        chatbot.description || "";
      document.getElementById("lmStudioUrl").value = chatbot.lmStudioUrl;
      document.getElementById("isActive").checked = chatbot.isActive;
    } else {
      // Add mode
      title.textContent = "Add New Chatbot";
      delete form.dataset.chatbotId;
      form.reset();
      document.getElementById("isActive").checked = true;
    }

    modal.classList.add("active");
  }

  hideChatbotModal() {
    const modal = document.getElementById("chatbotModal");
    modal.classList.remove("active");
  }

  async saveChatbot() {
    const form = document.getElementById("chatbotForm");
    const formData = new FormData(form);

    const chatbotData = {
      name: formData.get("name"),
      description: formData.get("description"),
      lmStudioUrl: formData.get("lmStudioUrl"),
      isActive: formData.get("isActive") === "on",
    };

    try {
      const chatbotId = form.dataset.chatbotId;
      const url = chatbotId
        ? `${this.apiBase}/chatbots/${chatbotId}`
        : `${this.apiBase}/chatbots`;

      const method = chatbotId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chatbotData),
      });

      if (response.ok) {
        this.hideChatbotModal();
        await this.loadChatbots();
        this.showNotification("Chatbot saved successfully", "success");
      } else {
        const error = await response.json();
        this.showNotification(error.error || "Failed to save chatbot", "error");
      }
    } catch (error) {
      console.error("Failed to save chatbot:", error);
      this.showNotification("Failed to save chatbot", "error");
    }
  }

  async editChatbot(chatbotId) {
    const chatbot = this.chatbots.find((c) => c.id === chatbotId);
    if (chatbot) {
      this.showChatbotModal(chatbot);
    }
  }

  async toggleChatbot(chatbotId) {
    const chatbot = this.chatbots.find((c) => c.id === chatbotId);
    if (!chatbot) return;

    try {
      const response = await fetch(`${this.apiBase}/chatbots/${chatbotId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...chatbot,
          isActive: !chatbot.isActive,
        }),
      });

      if (response.ok) {
        await this.loadChatbots();
        this.showNotification(
          `Chatbot ${chatbot.isActive ? "deactivated" : "activated"} successfully`,
          "success"
        );
      }
    } catch (error) {
      console.error("Failed to toggle chatbot:", error);
      this.showNotification("Failed to toggle chatbot", "error");
    }
  }

  async deleteChatbot(chatbotId) {
    if (!confirm("Are you sure you want to delete this chatbot?")) {
      return;
    }

    try {
      const response = await fetch(`${this.apiBase}/chatbots/${chatbotId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await this.loadChatbots();
        this.showNotification("Chatbot deleted successfully", "success");
      }
    } catch (error) {
      console.error("Failed to delete chatbot:", error);
      this.showNotification("Failed to delete chatbot", "error");
    }
  }

  async loadDashboardData() {
    try {
      const response = await fetch(`${this.apiBase}/dashboard`);
      const data = await response.json();

      this.updateDashboardStats(data.stats);
      this.updateCharts(data);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    }
  }

  updateDashboardStats(stats) {
    document.getElementById("totalEvents").textContent = stats.totalEvents || 0;
    document.getElementById("totalUsers").textContent = stats.totalUsers || 0;
    document.getElementById("totalSessions").textContent =
      stats.totalSessions || 0;
    document.getElementById("totalTokens").textContent = stats.totalTokens || 0;
    document.getElementById("totalCost").textContent =
      `$${(stats.totalCost || 0).toFixed(2)}`;
    document.getElementById("avgResponseTime").textContent =
      `${Math.round(stats.avgResponseTime || 0)}ms`;
  }

  updateCharts(data) {
    // Update events chart
    if (data.report && data.report.eventsByHour) {
      this.updateEventsChart(data.report.eventsByHour);
    }

    // Update tokens chart
    if (data.report && data.report.tokensByHour) {
      this.updateTokensChart(data.report.tokensByHour);
    }
  }

  updateEventsChart(eventsData) {
    const ctx = document.getElementById("eventsChart");
    if (!ctx) return;

    if (this.charts.events) {
      this.charts.events.destroy();
    }

    this.charts.events = new Chart(ctx, {
      type: "line",
      data: {
        labels: eventsData.map((d) => d.hour),
        datasets: [
          {
            label: "Events",
            data: eventsData.map((d) => d.count),
            borderColor: "#3b82f6",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });
  }

  updateTokensChart(tokensData) {
    const ctx = document.getElementById("tokensChart");
    if (!ctx) return;

    if (this.charts.tokens) {
      this.charts.tokens.destroy();
    }

    this.charts.tokens = new Chart(ctx, {
      type: "bar",
      data: {
        labels: tokensData.map((d) => d.hour),
        datasets: [
          {
            label: "Tokens",
            data: tokensData.map((d) => d.tokens),
            backgroundColor: "#10b981",
            borderColor: "#059669",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });
  }

  async loadSessions() {
    try {
      const response = await fetch(`${this.apiBase}/conversations`);
      const data = await response.json();
      this.renderSessions(data.conversations);
    } catch (error) {
      console.error("Failed to load sessions:", error);
    }
  }

  renderSessions(sessions) {
    const container = document.getElementById("sessionsList");

    if (sessions.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-comments"></i>
          <h3>Aucune session trouvée</h3>
          <p>Commencez une conversation pour voir les sessions ici</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="sessions-table-container">
        <table class="sessions-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Utilisateur</th>
              <th>Session ID</th>
              <th>Interactions</th>
              <th>Durée</th>
              <th>Dernière activité</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${sessions
              .map((session, index) => {
                const duration = this.calculateDuration(
                  session.startTime,
                  session.endTime
                );
                const startDate = new Date(
                  session.startTime
                ).toLocaleDateString();
                const lastActivity = new Date(
                  session.lastInteraction
                ).toLocaleString();

                return `
                <tr class="session-row" data-session-id="${session.sessionId}">
                  <td>${startDate}</td>
                  <td>${session.userId || "Anonyme"}</td>
                  <td class="session-id">${session.sessionId}</td>
                  <td>${session.totalInteractions}</td>
                  <td>${duration}</td>
                  <td>${lastActivity}</td>
                  <td>
                    <button class="btn btn-primary btn-sm view-session-btn" data-session-id="${session.sessionId}">
                      <i class="fas fa-eye"></i> Voir
                    </button>
                  </td>
                </tr>
              `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    `;

    // Add event listeners to view buttons
    container.querySelectorAll(".view-session-btn").forEach((button) => {
      button.addEventListener("click", (e) => {
        const sessionId =
          e.target.closest(".view-session-btn").dataset.sessionId;
        this.showSessionDetail(sessionId);
      });
    });
  }

  async showSessionDetail(sessionId) {
    console.log("🔍 Opening session details for:", sessionId);

    try {
      // Vérifier que l'ID est valide
      if (!sessionId) {
        console.error("❌ Session ID is empty");
        this.showNotification("Session ID invalide", "error");
        return;
      }

      // Afficher la modal immédiatement
      const modal = document.getElementById("sessionModal");
      if (!modal) {
        console.error("❌ Modal not found");
        this.showNotification("Erreur: Modal non trouvée", "error");
        return;
      }

      // Afficher la modal
      modal.style.display = "block";
      modal.classList.add("active");

      // Afficher un indicateur de chargement
      const detailContainer = document.getElementById("sessionDetail");
      if (detailContainer) {
        detailContainer.innerHTML = `
          <div style="text-align: center; padding: 40px;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-color);"></i>
            <p style="margin-top: 16px;">Chargement des détails de la session...</p>
          </div>
        `;
      }

      const response = await fetch(
        `${this.apiBase}/conversations/${sessionId}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const session = await response.json();
      console.log("📋 Session data received:", session);

      if (!session || !session.interactions) {
        throw new Error("Données de session invalides");
      }

      this.renderSessionDetail(session);
    } catch (error) {
      console.error("Failed to load session detail:", error);
      this.showNotification(
        "Erreur lors du chargement: " + error.message,
        "error"
      );

      // Afficher un message d'erreur dans la modal
      const detailContainer = document.getElementById("sessionDetail");
      if (detailContainer) {
        detailContainer.innerHTML = `
          <div style="text-align: center; padding: 40px; color: var(--error-color);">
            <i class="fas fa-exclamation-triangle" style="font-size: 2rem;"></i>
            <h3>Erreur de chargement</h3>
            <p>${error.message}</p>
            <button class="btn btn-primary close-error-btn" style="margin-top: 16px;">
              Fermer
            </button>
          </div>
        `;

        // Add event listener to close button
        const closeBtn = detailContainer.querySelector(".close-error-btn");
        if (closeBtn) {
          closeBtn.addEventListener("click", () => {
            this.hideSessionModal();
          });
        }
      }
    }
  }

  renderSessionDetail(session) {
    console.log("🎨 Rendering session detail:", session);
    const container = document.getElementById("sessionDetail");

    if (!container) {
      console.error("❌ Container sessionDetail not found!");
      return;
    }

    const duration = this.calculateDuration(session.startTime, session.endTime);

    // Calculer les métadonnées
    const avgResponseTime = Math.round(session.metrics.averageResponseTime);
    const avgTokensPerInteraction = Math.round(
      session.metrics.totalTokens / session.totalInteractions
    );
    const avgMessageLength = Math.round(
      session.interactions.reduce((sum, i) => sum + i.content.length, 0) /
        session.totalInteractions
    );

    // Rendre l'interface avec conversation à gauche et métadonnées à droite
    container.innerHTML = `
      <div class="session-detail-layout">
        <!-- Conversation à gauche -->
        <div class="conversation-panel">
          <h4>Conversation</h4>
          <div class="conversation-messages">
            ${session.interactions
              .map((interaction, index) => {
                const isUser = interaction.type === "user_message";
                const isAI = interaction.type === "llm_response";
                const timestamp = new Date(
                  interaction.timestamp
                ).toLocaleString();

                return `
                <div class="message-item ${isUser ? "user-message" : "ai-message"}">
                  <div class="message-header">
                    <div class="message-avatar">
                      ${isUser ? "👤" : "🤖"}
                    </div>
                    <div class="message-info">
                      <div class="message-author">
                        ${isUser ? "Utilisateur" : "Assistant IA"}
                      </div>
                      <div class="message-time">${timestamp}</div>
                    </div>
                    <div class="message-number">#${index + 1}</div>
                  </div>
                  <div class="message-content">
                    ${this.escapeHtml(interaction.content)}
                  </div>
                  ${
                    isAI && interaction.responseTime
                      ? `
                    <div class="message-meta">
                      <span class="meta-item">⏱️ ${Math.round(interaction.responseTime)}ms</span>
                      ${interaction.tokensUsed ? `<span class="meta-item">🔢 ${interaction.tokensUsed} tokens</span>` : ""}
                      ${interaction.cost ? `<span class="meta-item">💰 $${interaction.cost.toFixed(4)}</span>` : ""}
                    </div>
                  `
                      : ""
                  }
                </div>
              `;
              })
              .join("")}
          </div>
        </div>

        <!-- Métadonnées à droite -->
        <div class="metadata-panel">
          <h4>Métadonnées de la Session</h4>
          
          <div class="metadata-section">
            <h5>Informations Générales</h5>
            <div class="metadata-grid">
              <div class="metadata-item">
                <div class="metadata-label">Session ID</div>
                <div class="metadata-value">${session.sessionId}</div>
              </div>
              ${
                session.userId
                  ? `
                <div class="metadata-item">
                  <div class="metadata-label">Utilisateur</div>
                  <div class="metadata-value">${session.userId}</div>
                </div>
              `
                  : ""
              }
              <div class="metadata-item">
                <div class="metadata-label">Durée</div>
                <div class="metadata-value">${duration}</div>
              </div>
              <div class="metadata-item">
                <div class="metadata-label">Interactions</div>
                <div class="metadata-value">${session.totalInteractions}</div>
              </div>
            </div>
          </div>

          <div class="metadata-section">
            <h5>Performance</h5>
            <div class="metadata-grid">
              <div class="metadata-item">
                <div class="metadata-label">Temps de réponse moyen</div>
                <div class="metadata-value">${avgResponseTime}ms</div>
              </div>
              <div class="metadata-item">
                <div class="metadata-label">Tokens par interaction</div>
                <div class="metadata-value">${avgTokensPerInteraction}</div>
              </div>
              <div class="metadata-item">
                <div class="metadata-label">Longueur moyenne des messages</div>
                <div class="metadata-value">${avgMessageLength} caractères</div>
              </div>
            </div>
          </div>

          <div class="metadata-section">
            <h5>Coûts et Utilisation</h5>
            <div class="metadata-grid">
              <div class="metadata-item">
                <div class="metadata-label">Total des tokens</div>
                <div class="metadata-value">${session.metrics.totalTokens}</div>
              </div>
              <div class="metadata-item">
                <div class="metadata-label">Coût total</div>
                <div class="metadata-value">$${session.metrics.totalCost.toFixed(4)}</div>
              </div>
              <div class="metadata-item">
                <div class="metadata-label">Modèles utilisés</div>
                <div class="metadata-value">${session.metrics.modelsUsed.join(", ") || "Aucun"}</div>
              </div>
            </div>
          </div>

          <div class="metadata-section">
            <h5>Répartition des Interactions</h5>
            <div class="interaction-breakdown">
              ${(() => {
                const breakdown = {};
                session.interactions.forEach((i) => {
                  breakdown[i.type] = (breakdown[i.type] || 0) + 1;
                });
                return Object.entries(breakdown)
                  .map(([type, count]) => {
                    const label =
                      type === "user_message"
                        ? "Messages utilisateur"
                        : type === "llm_response"
                          ? "Réponses IA"
                          : type === "system_instruction"
                            ? "Instructions système"
                            : type === "error"
                              ? "Erreurs"
                              : type;
                    return `
                    <div class="breakdown-item">
                      <div class="breakdown-label">${label}</div>
                      <div class="breakdown-value">${count}</div>
                    </div>
                  `;
                  })
                  .join("");
              })()}
            </div>
          </div>
        </div>
      </div>
    `;

    // Update modal title
    const titleElement = document.getElementById("sessionModalTitle");
    if (titleElement) {
      titleElement.textContent = `Session: ${session.sessionId}`;
    }

    console.log("✅ Session detail rendered successfully");
  }

  renderInteractionContext(context) {
    const contextParts = [];

    if (context.conversationHistory && context.conversationHistory.length > 0) {
      contextParts.push(`
        <div class="context-title">Conversation History</div>
        <div class="context-content">${context.conversationHistory.join("\n")}</div>
      `);
    }

    if (context.systemPrompt) {
      contextParts.push(`
        <div class="context-title">System Prompt</div>
        <div class="context-content">${this.escapeHtml(context.systemPrompt)}</div>
      `);
    }

    if (context.temperature !== undefined) {
      contextParts.push(`
        <div class="context-title">Parameters</div>
        <div class="context-content">Temperature: ${context.temperature}${context.maxTokens ? `, Max Tokens: ${context.maxTokens}` : ""}</div>
      `);
    }

    return contextParts.length > 0
      ? `
      <div class="interaction-context">
        ${contextParts.join("")}
      </div>
    `
      : "";
  }

  getInteractionTypeIcon(type) {
    const icons = {
      user_message: '<i class="fas fa-user"></i>',
      llm_response: '<i class="fas fa-robot"></i>',
      system_instruction: '<i class="fas fa-cog"></i>',
      error: '<i class="fas fa-exclamation-triangle"></i>',
    };
    return icons[type] || '<i class="fas fa-question"></i>';
  }

  calculateDuration(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diff = end - start;

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  showSessionModal() {
    document.getElementById("sessionModal").style.display = "block";
  }

  hideSessionModal() {
    const modal = document.getElementById("sessionModal");
    if (modal) {
      modal.style.display = "none";
      modal.classList.remove("active");
    }
  }

  async refreshData() {
    if (this.currentTab === "dashboard") {
      await this.loadDashboardData();
    } else if (this.currentTab === "sessions") {
      await this.loadSessions();
    }
  }

  startAutoRefresh() {
    this.refreshInterval = setInterval(() => {
      this.refreshData();
    }, 10000); // Refresh every 10 seconds
  }

  showNotification(message, type = "info") {
    // Create notification element
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <i class="fas fa-${type === "success" ? "check-circle" : type === "error" ? "exclamation-circle" : "info-circle"}"></i>
      <span>${message}</span>
    `;

    // Add to page
    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

// Initialize app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.app = new AgentWatchApp();
});
