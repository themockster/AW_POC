# 🛠️ Guide de Maintenance - AgentWatch

## 📋 Vue d'ensemble

AgentWatch est un système de monitoring LLM avec proxy transparent qui capture les conversations entre les chatbots et les LLM.

### Architecture

```
Chatbot Service (8000) → AgentWatch (3001) → LM Studio (1234)
                    ↓
                PostgreSQL + Redis
```

## 🚀 Démarrage du système

### 1. Vérifier les prérequis

```bash
# Node.js (version 18+)
node --version

# Python (version 3.8+)
python --version

# LM Studio installé et configuré
```

### 2. Démarrer les services

#### AgentWatch (Port 3001)

```bash
cd agentwatch
npm install
npm run build
npm start
```

#### Chatbot Service (Port 8000)

```bash
cd chatbot-service
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### LM Studio (Port 1234)

- Ouvrir l'application LM Studio
- Charger un modèle
- Vérifier qu'il écoute sur le port 1234

### 3. Vérifier que tout fonctionne

```bash
# AgentWatch
curl http://localhost:3001/api/health

# Chatbot Service
curl http://localhost:8000/api/v1/health

# LM Studio
curl http://localhost:1234/v1/models
```

## 🔍 Diagnostic des problèmes

### Problème : AgentWatch ne démarre pas

```bash
# Vérifier le port
lsof -i :3001

# Vérifier les logs
cd agentwatch
npm start

# Vérifier les dépendances
npm install
```

### Problème : Chatbot Service ne démarre pas

```bash
# Vérifier le port
lsof -i :8000

# Vérifier les dépendances Python
cd chatbot-service
pip install -r requirements.txt

# Vérifier la base de données
ls -la chatbot.db
```

### Problème : LM Studio ne répond pas

```bash
# Vérifier le port
lsof -i :1234

# Vérifier que LM Studio est ouvert
# Vérifier qu'un modèle est chargé
```

### Problème : Pas de capture de conversations

```bash
# Vérifier la configuration du Chatbot Service
cat chatbot-service/app/config.py

# Vérifier que AgentWatch intercepte
curl -X POST http://localhost:3001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"test"}]}'
```

## 🔧 Maintenance régulière

### Nettoyage des logs

```bash
# AgentWatch logs
rm -rf agentwatch/logs/*

# Chatbot Service logs
rm -rf chatbot-service/logs/*
```

### Mise à jour des dépendances

```bash
# AgentWatch
cd agentwatch
npm update
npm audit fix

# Chatbot Service
cd chatbot-service
pip install --upgrade -r requirements.txt
```

### Sauvegarde de la base de données

```bash
# Copier la base SQLite
cp chatbot-service/chatbot.db backup/chatbot-$(date +%Y%m%d).db
```

## 🚨 Urgences

### AgentWatch ne répond plus

```bash
# Tuer le processus
lsof -ti:3001 | xargs kill -9

# Redémarrer
cd agentwatch
npm start
```

### Chatbot Service ne répond plus

```bash
# Tuer le processus
lsof -ti:8000 | xargs kill -9

# Redémarrer
cd chatbot-service
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Base de données corrompue

```bash
# Restaurer depuis backup
cp backup/chatbot-YYYYMMDD.db chatbot-service/chatbot.db

# Ou réinitialiser
cd chatbot-service
rm chatbot.db
python -c "from app.database.init_db import init_db; init_db()"
```

## 📊 Monitoring

### Vérifier les métriques

```bash
# Sessions capturées
curl http://localhost:3001/api/sessions | jq length

# Santé du système
curl http://localhost:3001/api/health
curl http://localhost:8000/api/v1/health
```

### Logs importants

```bash
# AgentWatch logs
tail -f agentwatch/logs/agentwatch.log

# Chatbot Service logs
tail -f chatbot-service/logs/chatbot.log
```

## 🔐 Sécurité

### Variables d'environnement sensibles

- `SECURITY_SECRET_KEY` : Clé secrète pour JWT
- `LLM_AZURE_OPENAI_API_KEY` : Clé API Azure (si utilisé)

### Accès aux ports

- **3001** : AgentWatch (interne)
- **8000** : Chatbot Service (interne)
- **1234** : LM Studio (interne)

## 📞 Support

### Informations système

```bash
# Version Node.js
node --version

# Version Python
python --version

# Version des packages
cd agentwatch && npm list
cd chatbot-service && pip list
```

### Logs de debug

```bash
# AgentWatch en mode debug
cd agentwatch
DEBUG=* npm start

# Chatbot Service en mode debug
cd chatbot-service
uvicorn app.main:app --log-level debug
```

## 🔄 Mise à jour du système

### Sauvegarder avant mise à jour

```bash
# Commit Git
git add .
git commit -m "Backup before update"
git push

# Sauvegarder la base
cp chatbot-service/chatbot.db backup/
```

### Mettre à jour le code

```bash
git pull origin master
```

### Redémarrer les services

```bash
# Redémarrer AgentWatch
cd agentwatch && npm run build && npm start

# Redémarrer Chatbot Service
cd chatbot-service && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
