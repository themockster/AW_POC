#!/bin/bash

# 🚀 Script de démarrage automatique AgentWatch
# Usage: ./scripts/start-system.sh

set -e

echo "🚀 Démarrage automatique du système AgentWatch"
echo "=============================================="

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher le statut
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

# Fonction pour attendre qu'un port soit disponible
wait_for_port() {
    local port=$1
    local service=$2
    local max_attempts=30
    local attempt=1
    
    echo -e "${BLUE}⏳ Attente de $service sur le port $port...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if lsof -i :$port > /dev/null 2>&1; then
            echo -e "${GREEN}✅ $service est prêt sur le port $port${NC}"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}❌ $service n'a pas démarré dans le délai imparti${NC}"
    return 1
}

# Fonction pour tuer un processus sur un port
kill_port() {
    local port=$1
    local service=$2
    
    if lsof -i :$port > /dev/null 2>&1; then
        echo -e "${YELLOW}🔄 Arrêt de $service sur le port $port...${NC}"
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
}

echo ""
echo "🔧 Préparation du système..."

# Vérifier les prérequis
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js n'est pas installé${NC}"
    exit 1
fi

if ! command -v python &> /dev/null; then
    echo -e "${RED}❌ Python n'est pas installé${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm n'est pas installé${NC}"
    exit 1
fi

print_status 0 "Prérequis vérifiés"

echo ""
echo "🧹 Nettoyage des ports..."

# Tuer les processus existants
kill_port 3001 "AgentWatch"
kill_port 8000 "Chatbot Service"

print_status 0 "Ports libérés"

echo ""
echo "📦 Installation des dépendances..."

# Installer les dépendances AgentWatch
if [ -d "agentwatch" ]; then
    echo -e "${BLUE}📦 Installation des dépendances AgentWatch...${NC}"
    cd agentwatch
    npm install
    npm run build
    cd ..
    print_status 0 "AgentWatch - dépendances installées"
else
    print_status 1 "AgentWatch - dossier manquant"
    exit 1
fi

# Installer les dépendances Chatbot Service
if [ -d "chatbot-service" ]; then
    echo -e "${BLUE}📦 Installation des dépendances Chatbot Service...${NC}"
    cd chatbot-service
    pip install -r requirements.txt
    cd ..
    print_status 0 "Chatbot Service - dépendances installées"
else
    print_status 1 "Chatbot Service - dossier manquant"
    exit 1
fi

echo ""
echo "🚀 Démarrage des services..."

# Démarrer AgentWatch en arrière-plan
echo -e "${BLUE}🚀 Démarrage d'AgentWatch...${NC}"
cd agentwatch
nohup npm start > ../logs/agentwatch.log 2>&1 &
AGENTWATCH_PID=$!
cd ..

# Attendre qu'AgentWatch démarre
if wait_for_port 3001 "AgentWatch"; then
    print_status 0 "AgentWatch démarré (PID: $AGENTWATCH_PID)"
else
    print_status 1 "AgentWatch n'a pas démarré"
    exit 1
fi

# Démarrer Chatbot Service en arrière-plan
echo -e "${BLUE}🚀 Démarrage du Chatbot Service...${NC}"
cd chatbot-service
nohup python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > ../logs/chatbot.log 2>&1 &
CHATBOT_PID=$!
cd ..

# Attendre que Chatbot Service démarre
if wait_for_port 8000 "Chatbot Service"; then
    print_status 0 "Chatbot Service démarré (PID: $CHATBOT_PID)"
else
    print_status 1 "Chatbot Service n'a pas démarré"
    exit 1
fi

echo ""
echo "🔍 Vérification finale..."

# Vérifier que les APIs répondent
sleep 3

if curl -s "http://localhost:3001/api/health" > /dev/null; then
    print_status 0 "AgentWatch API - RÉPOND"
else
    print_status 1 "AgentWatch API - NE RÉPOND PAS"
fi

if curl -s "http://localhost:8000/api/v1/health" > /dev/null; then
    print_status 0 "Chatbot Service API - RÉPOND"
else
    print_status 1 "Chatbot Service API - NE RÉPOND PAS"
fi

echo ""
echo "📋 Informations importantes:"

# Afficher les PIDs
echo "  AgentWatch PID: $AGENTWATCH_PID"
echo "  Chatbot Service PID: $CHATBOT_PID"

# Sauvegarder les PIDs
echo "$AGENTWATCH_PID" > logs/agentwatch.pid
echo "$CHATBOT_PID" > logs/chatbot.pid

# Afficher les URLs
echo ""
echo "🌐 URLs d'accès:"
echo "  AgentWatch Dashboard: http://localhost:3001"
echo "  Chatbot Interface: http://localhost:3000/chatbot-interface.html"
echo "  Chatbot API: http://localhost:8000/api/v1/health"

echo ""
echo "📊 Logs:"
echo "  AgentWatch: tail -f logs/agentwatch.log"
echo "  Chatbot Service: tail -f logs/chatbot.log"

echo ""
echo "🛑 Pour arrêter le système:"
echo "  ./scripts/stop-system.sh"

echo ""
echo -e "${GREEN}🎉 Système AgentWatch démarré avec succès !${NC}"
echo ""
echo "⚠️  IMPORTANT: Assurez-vous que LM Studio est ouvert et qu'un modèle est chargé sur le port 1234" 