#!/bin/bash

# 🛠️ Script de diagnostic AgentWatch
# Usage: ./scripts/check-system.sh

set -e

echo "🔍 Diagnostic du système AgentWatch"
echo "=================================="

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour afficher le statut
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

# Fonction pour vérifier un port
check_port() {
    local port=$1
    local service=$2
    if lsof -i :$port > /dev/null 2>&1; then
        print_status 0 "$service (port $port) - ACTIF"
        return 0
    else
        print_status 1 "$service (port $port) - INACTIF"
        return 1
    fi
}

# Fonction pour vérifier une URL
check_url() {
    local url=$1
    local service=$2
    if curl -s "$url" > /dev/null 2>&1; then
        print_status 0 "$service ($url) - RÉPOND"
        return 0
    else
        print_status 1 "$service ($url) - NE RÉPOND PAS"
        return 1
    fi
}

echo ""
echo "📋 Vérification des prérequis..."

# Vérifier Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_status 0 "Node.js $NODE_VERSION - INSTALLÉ"
else
    print_status 1 "Node.js - NON INSTALLÉ"
fi

# Vérifier Python
if command -v python &> /dev/null; then
    PYTHON_VERSION=$(python --version 2>&1)
    print_status 0 "$PYTHON_VERSION - INSTALLÉ"
else
    print_status 1 "Python - NON INSTALLÉ"
fi

# Vérifier npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_status 0 "npm $NPM_VERSION - INSTALLÉ"
else
    print_status 1 "npm - NON INSTALLÉ"
fi

echo ""
echo "🔌 Vérification des ports..."

# Vérifier les ports
AGENTWATCH_PORT=0
CHATBOT_PORT=0
LMSTUDIO_PORT=0

check_port 3001 "AgentWatch" && AGENTWATCH_PORT=1
check_port 8000 "Chatbot Service" && CHATBOT_PORT=1
check_port 1234 "LM Studio" && LMSTUDIO_PORT=1

echo ""
echo "🌐 Vérification des services..."

# Vérifier les URLs
AGENTWATCH_URL=0
CHATBOT_URL=0
LMSTUDIO_URL=0

check_url "http://localhost:3001/api/health" "AgentWatch API" && AGENTWATCH_URL=1
check_url "http://localhost:8000/api/v1/health" "Chatbot Service API" && CHATBOT_URL=1
check_url "http://localhost:1234/v1/models" "LM Studio API" && LMSTUDIO_URL=1

echo ""
echo "📁 Vérification des fichiers..."

# Vérifier les fichiers importants
if [ -f "agentwatch/package.json" ]; then
    print_status 0 "agentwatch/package.json - PRÉSENT"
else
    print_status 1 "agentwatch/package.json - MANQUANT"
fi

if [ -f "chatbot-service/requirements.txt" ]; then
    print_status 0 "chatbot-service/requirements.txt - PRÉSENT"
else
    print_status 1 "chatbot-service/requirements.txt - MANQUANT"
fi

if [ -f "chatbot-service/chatbot.db" ]; then
    print_status 0 "chatbot-service/chatbot.db - PRÉSENT"
else
    print_status 1 "chatbot-service/chatbot.db - MANQUANT"
fi

echo ""
echo "📊 Résumé du diagnostic..."

# Calculer le score global
TOTAL_CHECKS=0
PASSED_CHECKS=0

# Compter les vérifications
TOTAL_CHECKS=$((TOTAL_CHECKS + 3)) # Prérequis
PASSED_CHECKS=$((PASSED_CHECKS + $(if command -v node &> /dev/null; then echo 1; else echo 0; fi)))
PASSED_CHECKS=$((PASSED_CHECKS + $(if command -v python &> /dev/null; then echo 1; else echo 0; fi)))
PASSED_CHECKS=$((PASSED_CHECKS + $(if command -v npm &> /dev/null; then echo 1; else echo 0; fi)))

TOTAL_CHECKS=$((TOTAL_CHECKS + 3)) # Ports
PASSED_CHECKS=$((PASSED_CHECKS + AGENTWATCH_PORT))
PASSED_CHECKS=$((PASSED_CHECKS + CHATBOT_PORT))
PASSED_CHECKS=$((PASSED_CHECKS + LMSTUDIO_PORT))

TOTAL_CHECKS=$((TOTAL_CHECKS + 3)) # URLs
PASSED_CHECKS=$((PASSED_CHECKS + AGENTWATCH_URL))
PASSED_CHECKS=$((PASSED_CHECKS + CHATBOT_URL))
PASSED_CHECKS=$((PASSED_CHECKS + LMSTUDIO_URL))

TOTAL_CHECKS=$((TOTAL_CHECKS + 3)) # Fichiers
PASSED_CHECKS=$((PASSED_CHECKS + $(if [ -f "agentwatch/package.json" ]; then echo 1; else echo 0; fi)))
PASSED_CHECKS=$((PASSED_CHECKS + $(if [ -f "chatbot-service/requirements.txt" ]; then echo 1; else echo 0; fi)))
PASSED_CHECKS=$((PASSED_CHECKS + $(if [ -f "chatbot-service/chatbot.db" ]; then echo 1; else echo 0; fi)))

# Afficher le score
PERCENTAGE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))

echo "Score: $PASSED_CHECKS/$TOTAL_CHECKS ($PERCENTAGE%)"

if [ $PERCENTAGE -eq 100 ]; then
    echo -e "${GREEN}🎉 Système 100% opérationnel !${NC}"
elif [ $PERCENTAGE -ge 80 ]; then
    echo -e "${YELLOW}⚠️  Système partiellement opérationnel${NC}"
else
    echo -e "${RED}🚨 Système en panne - intervention requise${NC}"
fi

echo ""
echo "🔧 Actions recommandées:"

if [ $AGENTWATCH_PORT -eq 0 ]; then
    echo "  - Démarrer AgentWatch: cd agentwatch && npm start"
fi

if [ $CHATBOT_PORT -eq 0 ]; then
    echo "  - Démarrer Chatbot Service: cd chatbot-service && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
fi

if [ $LMSTUDIO_PORT -eq 0 ]; then
    echo "  - Ouvrir LM Studio et charger un modèle"
fi

if [ ! -f "agentwatch/package.json" ]; then
    echo "  - Réinstaller AgentWatch: git clone [repo]"
fi

if [ ! -f "chatbot-service/requirements.txt" ]; then
    echo "  - Réinstaller Chatbot Service: git clone [repo]"
fi

echo ""
echo "📖 Pour plus d'informations, consultez MAINTENANCE.md" 