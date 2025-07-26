# 👁️ AgentWatch - AI Agent Monitoring Dashboard

Un système universel de monitoring et tracking pour les agents IA et chatbots avec interface web intégrée.

## 🎯 Fonctionnalités

- **📊 Dashboard Web** : Interface moderne et responsive pour visualiser les métriques
- **🔍 Tracking Complet** : Messages utilisateur, réponses LLM, instructions système, erreurs
- **📈 Métriques Détaillées** : Tokens utilisés, temps de réponse, coûts, modèles
- **🌐 Multi-Providers** : Support pour LM Studio, Azure OpenAI, AWS Bedrock (futur)
- **💾 Stockage Flexible** : Mémoire, fichiers, base de données
- **⚙️ Configuration Simple** : API endpoint configurable
- **🚀 Non-Intrusif** : S'intègre facilement à n'importe quel chatbot

## 🚀 Installation

```bash
npm install agentwatch
```

## 📖 Utilisation Rapide

### 1. Démarrer le Dashboard Web

```bash
# Installer les dépendances
npm install

# Construire le module
npm run build

# Démarrer le serveur web
npm start
```

Le dashboard sera disponible sur `http://localhost:3001`

### 2. Configuration de base

```typescript
import { ChatbotTracker, LMStudioProvider, MemoryStorage } from "agentwatch";

// Configuration
const config = {
  provider: "lm-studio",
  apiEndpoint: "http://localhost:1234",
  storage: {
    type: "memory",
    config: {},
  },
  enableTokenCounting: true,
  enableResponseTimeTracking: true,
  enableContextTracking: true,
  enableCostTracking: true,
};

// Créer le tracker
const provider = new LMStudioProvider(config);
const storage = new MemoryStorage(config.storage.config);
const tracker = new ChatbotTracker(provider, storage, config);

// Initialiser
await tracker.initialize();
```

### 3. Envoi de messages avec tracking automatique

```typescript
// Envoyer un message avec tracking complet
const response = await tracker.sendMessage("Hello! How are you today?", {
  sessionId: "session-123",
  userId: "user-456",
  conversationHistory: [],
  systemPrompt: "You are a helpful assistant.",
  metadata: {
    temperature: 0.7,
    maxTokens: 100,
  },
});

console.log("Response:", response.content);
console.log("Tokens used:", response.tokensUsed);
console.log("Response time:", response.responseTime);
```

## 🌐 Interface Web

### Dashboard Principal

L'interface web d'AgentWatch offre :

- **📊 Vue d'ensemble** : Statistiques en temps réel
- **📈 Graphiques** : Visualisation des événements et de l'activité
- **🔄 Événements temps réel** : Flux des interactions en direct
- **🧪 Test d'agent** : Interface pour tester les agents
- **📋 Sessions et utilisateurs** : Gestion et visualisation des données

### Fonctionnalités de l'Interface

1. **Métriques en Temps Réel**
   - Total d'événements
   - Utilisateurs actifs
   - Sessions totales
   - Tokens utilisés
   - Coûts totaux
   - Temps de réponse moyen

2. **Graphiques Interactifs**
   - Répartition des types d'événements
   - Timeline d'activité
   - Tendances d'utilisation

3. **Gestion des Sessions**
   - Liste des sessions
   - Détails par session
   - Métriques par session

4. **Gestion des Utilisateurs**
   - Liste des utilisateurs
   - Détails par utilisateur
   - Historique d'activité

5. **Test d'Agent**
   - Envoi de messages de test
   - Visualisation des réponses
   - Métriques de test

## 🔧 Configuration

### Options de configuration

```typescript
interface TrackerConfig {
  // Provider
  provider: "lm-studio" | "azure" | "aws" | "openai";
  apiEndpoint: string;
  apiKey?: string;

  // Storage
  storage: {
    type: "database" | "file" | "memory";
    config: any;
  };

  // Tracking options
  enableTokenCounting: boolean;
  enableResponseTimeTracking: boolean;
  enableContextTracking: boolean;
  enableCostTracking: boolean;

  // Performance
  batchSize?: number;
  flushInterval?: number;

  // Privacy
  anonymizeUserData?: boolean;
  excludeSensitiveData?: boolean;
}
```

### Variables d'environnement

```bash
# Configuration du serveur web
PORT=3001
LM_STUDIO_URL=http://localhost:1234

# Configuration du tracking
TRACKING_ENABLED=true
TRACKING_STORAGE_TYPE=memory
TRACKING_BATCH_SIZE=10
TRACKING_FLUSH_INTERVAL=5000
```

## 📊 API REST

Le serveur web expose une API REST complète :

### Endpoints Principaux

- `GET /api/health` - Statut du service
- `GET /api/dashboard` - Données du dashboard
- `GET /api/sessions` - Liste des sessions
- `GET /api/sessions/:id` - Détails d'une session
- `GET /api/users` - Liste des utilisateurs
- `GET /api/users/:id` - Détails d'un utilisateur
- `GET /api/events/realtime` - Événements temps réel
- `POST /api/test-message` - Envoyer un message de test

### Exemple d'utilisation de l'API

```bash
# Récupérer les données du dashboard
curl http://localhost:3001/api/dashboard

# Envoyer un message de test
curl -X POST http://localhost:3001/api/test-message \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!", "sessionId": "test-123"}'

# Récupérer les sessions
curl http://localhost:3001/api/sessions
```

## 📈 Types d'Événements Trackés

### ChatEvent

```typescript
interface ChatEvent {
  id: string;
  timestamp: Date;
  sessionId: string;
  userId?: string;
  eventType: "user_message" | "llm_response" | "system_instruction" | "error";
  content: string;
  role: "user" | "assistant" | "system";
  model?: string;
  provider?: string;
  tokensUsed?: number;
  responseTime?: number;
  context?: {
    conversationHistory: string[];
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
  };
  metadata?: {
    apiEndpoint: string;
    cost?: number;
    latency?: number;
  };
}
```

## 🗄️ Stockage

### MemoryStorage (Développement/Test)

```typescript
import { MemoryStorage } from "agentwatch";

const storage = new MemoryStorage({});
```

### FileStorage (Production simple)

```typescript
import { FileStorage } from "agentwatch";

const storage = new FileStorage({
  filePath: "./agentwatch-events.json",
});
```

### DatabaseStorage (Production avancée)

```typescript
import { DatabaseStorage } from "agentwatch";

const storage = new DatabaseStorage({
  type: "postgresql",
  host: "localhost",
  port: 5432,
  database: "agentwatch",
  username: "user",
  password: "password",
});
```

## 🔌 Intégration avec le Chatbot Existant

### 1. Installation

```bash
cd chatbot-service
npm install agentwatch
```

### 2. Modification du Service LLM

```python
# Dans votre service LLM existant
from agentwatch import ChatbotTracker, LMStudioProvider, MemoryStorage

class LLMServiceWithTracking:
    def __init__(self):
        self.tracker = ChatbotTracker(provider, storage, config)

    async def generate_response(self, message, context):
        # Tracking automatique
        response = await self.tracker.send_message(message, {
            'sessionId': context.session_id,
            'userId': context.user_id,
            'conversationHistory': context.history,
            'systemPrompt': context.system_prompt
        })
        return response
```

### 3. Nouveaux Endpoints

- `/api/v1/chat/sessions/{session_id}/metrics`
- `/api/v1/chat/users/{user_id}/metrics`
- `/api/v1/chat/tracking/report`

## 🧪 Tests

### Démarrer l'environnement de test

1. **Démarrer LM Studio** sur `http://localhost:1234`
2. **Démarrer AgentWatch** : `npm start`
3. **Accéder au dashboard** : `http://localhost:3001`
4. **Tester l'agent** via l'interface web

### Exemple de test via API

```bash
# Test de santé
curl http://localhost:3001/api/health

# Test d'envoi de message
curl -X POST http://localhost:3001/api/test-message \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, how are you?"}'
```

## 🚀 Roadmap

- [ ] Support Azure OpenAI
- [ ] Support AWS Bedrock
- [ ] Stockage PostgreSQL
- [ ] Alertes automatiques
- [ ] Export de données
- [ ] Authentification utilisateur
- [ ] Notifications temps réel
- [ ] API GraphQL

## 📝 Licence

MIT

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

---

**AgentWatch** - Surveillez vos agents IA avec précision et élégance ! 👁️✨
