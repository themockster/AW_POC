# 🛠️ Scripts de Maintenance AgentWatch

Ce dossier contient tous les scripts de maintenance et de diagnostic pour le système AgentWatch.

## 📋 Scripts disponibles

### 🔍 `check-system.sh` - Diagnostic complet

**Usage:** `./scripts/check-system.sh`

Vérifie l'état complet du système :

- ✅ Prérequis (Node.js, Python, npm)
- 🔌 Ports (3001, 8000, 1234)
- 🌐 Services (APIs)
- 📁 Fichiers importants
- 📊 Score global de santé

**Exemple:**

```bash
./scripts/check-system.sh
```

### 🚀 `start-system.sh` - Démarrage automatique

**Usage:** `./scripts/start-system.sh`

Démarre automatiquement tout le système :

- 🧹 Nettoie les ports
- 📦 Installe les dépendances
- 🚀 Démarre AgentWatch et Chatbot Service
- ⏳ Attend que les services soient prêts
- ✅ Vérifie que tout fonctionne

**Exemple:**

```bash
./scripts/start-system.sh
```

### 🛑 `stop-system.sh` - Arrêt propre

**Usage:** `./scripts/stop-system.sh`

Arrête proprement tous les services :

- 📋 Arrêt par PID (méthode propre)
- 🔌 Arrêt par port (méthode de secours)
- 🧹 Nettoyage des fichiers temporaires
- ✅ Vérification finale

**Exemple:**

```bash
./scripts/stop-system.sh
```

### 🧪 `test-system.sh` - Test rapide

**Usage:** `./scripts/test-system.sh`

Test rapide du fonctionnement :

- 🔍 Connectivité des services
- 🔌 Réponse des APIs
- 💬 Test de conversation
- 📊 Vérification de capture

**Exemple:**

```bash
./scripts/test-system.sh
```

### 💾 `backup-system.sh` - Sauvegarde automatique

**Usage:** `./scripts/backup-system.sh [nom_backup]`

Sauvegarde complète du système :

- 📦 AgentWatch (code source)
- 📦 Chatbot Service (code + base de données)
- 📁 Logs et configuration
- 🗜️ Compression automatique
- 🔄 Nettoyage des anciens backups

**Exemples:**

```bash
# Sauvegarde avec nom automatique
./scripts/backup-system.sh

# Sauvegarde avec nom personnalisé
./scripts/backup-system.sh "avant-mise-a-jour"
```

## 🎯 Workflow recommandé

### Démarrage quotidien

```bash
# 1. Vérifier l'état du système
./scripts/check-system.sh

# 2. Démarrer si nécessaire
./scripts/start-system.sh

# 3. Tester rapidement
./scripts/test-system.sh
```

### Maintenance hebdomadaire

```bash
# 1. Sauvegarder avant maintenance
./scripts/backup-system.sh "maintenance-hebdo"

# 2. Vérifier les logs
tail -f logs/agentwatch.log
tail -f logs/chatbot.log

# 3. Redémarrer si nécessaire
./scripts/stop-system.sh
./scripts/start-system.sh
```

### En cas de problème

```bash
# 1. Diagnostic complet
./scripts/check-system.sh

# 2. Test rapide
./scripts/test-system.sh

# 3. Redémarrage complet
./scripts/stop-system.sh
./scripts/start-system.sh

# 4. Vérification
./scripts/test-system.sh
```

## 📊 Informations système

### Ports utilisés

- **3001** : AgentWatch (proxy + dashboard)
- **8000** : Chatbot Service (API)
- **1234** : LM Studio (LLM)

### Fichiers importants

- `logs/agentwatch.log` : Logs AgentWatch
- `logs/chatbot.log` : Logs Chatbot Service
- `logs/agentwatch.pid` : PID AgentWatch
- `logs/chatbot.pid` : PID Chatbot Service
- `backups/` : Sauvegardes automatiques

### URLs d'accès

- **AgentWatch Dashboard** : http://localhost:3001
- **Chatbot Interface** : http://localhost:3000/chatbot-interface.html
- **Chatbot API** : http://localhost:8000/api/v1/health

## 🔧 Dépannage

### Problème : Script non exécutable

```bash
chmod +x scripts/*.sh
```

### Problème : Port déjà utilisé

```bash
# Voir quel processus utilise le port
lsof -i :3001

# Tuer le processus
lsof -ti:3001 | xargs kill -9
```

### Problème : Dépendances manquantes

```bash
# AgentWatch
cd agentwatch && npm install

# Chatbot Service
cd chatbot-service && pip install -r requirements.txt
```

### Problème : Base de données corrompue

```bash
# Restaurer depuis backup
cp backups/backup-YYYYMMDD/chatbot-service/chatbot.db chatbot-service/

# Ou réinitialiser
cd chatbot-service
rm chatbot.db
python -c "from app.database.init_db import init_db; init_db()"
```

## 📖 Documentation complète

Pour plus d'informations détaillées, consultez :

- `MAINTENANCE.md` : Guide de maintenance complet
- `README.md` : Documentation générale du projet
