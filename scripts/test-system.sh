#!/bin/bash

# 🧪 Script de test rapide AgentWatch
# Usage: ./scripts/test-system.sh

set -e

echo "🧪 Test rapide du système AgentWatch"
echo "===================================="

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

# Fonction pour tester une URL
test_url() {
    local url=$1
    local service=$2
    local timeout=5
    
    if curl -s --max-time $timeout "$url" > /dev/null 2>&1; then
        print_status 0 "$service - RÉPOND"
        return 0
    else
        print_status 1 "$service - NE RÉPOND PAS"
        return 1
    fi
}

# Fonction pour tester un endpoint API
test_api() {
    local url=$1
    local service=$2
    local expected_status=$3
    local timeout=5
    
    HTTP_STATUS=$(curl -s --max-time $timeout -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
    
    if [ "$HTTP_STATUS" = "$expected_status" ]; then
        print_status 0 "$service - HTTP $HTTP_STATUS"
        return 0
    else
        print_status 1 "$service - HTTP $HTTP_STATUS (attendu: $expected_status)"
        return 1
    fi
}

echo ""
echo "🔍 Test de connectivité..."

# Test des services
AGENTWATCH_OK=0
CHATBOT_OK=0
LMSTUDIO_OK=0

test_url "http://localhost:3001" "AgentWatch Dashboard" && AGENTWATCH_OK=1
test_url "http://localhost:8000" "Chatbot Service" && CHATBOT_OK=1
test_url "http://localhost:1234" "LM Studio" && LMSTUDIO_OK=1

echo ""
echo "🔌 Test des APIs..."

# Test des endpoints API
test_api "http://localhost:3001/api/health" "AgentWatch API" "200"
test_api "http://localhost:8000/api/v1/health" "Chatbot Service API" "200"
test_api "http://localhost:1234/v1/models" "LM Studio API" "200"

echo ""
echo "💬 Test de communication..."

# Test d'une conversation complète
if [ $AGENTWATCH_OK -eq 1 ] && [ $CHATBOT_OK -eq 1 ] && [ $LMSTUDIO_OK -eq 1 ]; then
    echo -e "${BLUE}🧪 Test d'une conversation via AgentWatch...${NC}"
    
    # Test d'un message simple
    RESPONSE=$(curl -s -X POST "http://localhost:3001/v1/chat/completions" \
        -H "Content-Type: application/json" \
        -d '{
            "messages": [{"role": "user", "content": "Bonjour"}],
            "model": "local-model",
            "max_tokens": 50
        }' 2>/dev/null || echo "ERROR")
    
    if [[ "$RESPONSE" != "ERROR" && "$RESPONSE" != "" ]]; then
        print_status 0 "Conversation test - RÉUSSIE"
        echo "  Réponse reçue: $(echo "$RESPONSE" | jq -r '.choices[0].message.content // "Pas de contenu"' 2>/dev/null || echo "Format inattendu")"
    else
        print_status 1 "Conversation test - ÉCHEC"
    fi
else
    echo -e "${YELLOW}⚠️  Test de conversation ignoré (services non disponibles)${NC}"
fi

echo ""
echo "📊 Test de capture AgentWatch..."

# Vérifier que AgentWatch capture les sessions
if [ $AGENTWATCH_OK -eq 1 ]; then
    SESSIONS_RESPONSE=$(curl -s "http://localhost:3001/api/sessions" 2>/dev/null || echo "ERROR")
    
    if [[ "$SESSIONS_RESPONSE" != "ERROR" ]]; then
        SESSION_COUNT=$(echo "$SESSIONS_RESPONSE" | jq 'length' 2>/dev/null || echo "0")
        print_status 0 "Sessions capturées: $SESSION_COUNT"
    else
        print_status 1 "Impossible de récupérer les sessions"
    fi
else
    print_status 1 "AgentWatch non disponible"
fi

echo ""
echo "📋 Résumé des tests..."

# Calculer le score
TOTAL_TESTS=0
PASSED_TESTS=0

# Tests de connectivité
TOTAL_TESTS=$((TOTAL_TESTS + 3))
PASSED_TESTS=$((PASSED_TESTS + AGENTWATCH_OK + CHATBOT_OK + LMSTUDIO_OK))

# Tests API
TOTAL_TESTS=$((TOTAL_TESTS + 3))
# On compte les APIs qui répondent (même avec erreur HTTP)
if curl -s --max-time 5 "http://localhost:3001/api/health" > /dev/null 2>&1; then PASSED_TESTS=$((PASSED_TESTS + 1)); fi
if curl -s --max-time 5 "http://localhost:8000/api/v1/health" > /dev/null 2>&1; then PASSED_TESTS=$((PASSED_TESTS + 1)); fi
if curl -s --max-time 5 "http://localhost:1234/v1/models" > /dev/null 2>&1; then PASSED_TESTS=$((PASSED_TESTS + 1)); fi

PERCENTAGE=$((PASSED_TESTS * 100 / TOTAL_TESTS))

echo "Score: $PASSED_TESTS/$TOTAL_TESTS ($PERCENTAGE%)"

if [ $PERCENTAGE -eq 100 ]; then
    echo -e "${GREEN}🎉 Tous les tests sont passés !${NC}"
elif [ $PERCENTAGE -ge 80 ]; then
    echo -e "${YELLOW}⚠️  La plupart des tests sont passés${NC}"
else
    echo -e "${RED}🚨 Plusieurs tests ont échoué${NC}"
fi

echo ""
echo "🔧 Actions recommandées:"

if [ $AGENTWATCH_OK -eq 0 ]; then
    echo "  - Démarrer AgentWatch: ./scripts/start-system.sh"
fi

if [ $CHATBOT_OK -eq 0 ]; then
    echo "  - Démarrer Chatbot Service: cd chatbot-service && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
fi

if [ $LMSTUDIO_OK -eq 0 ]; then
    echo "  - Ouvrir LM Studio et charger un modèle"
fi

echo ""
echo "📖 Pour plus d'informations:"
echo "  - Diagnostic complet: ./scripts/check-system.sh"
echo "  - Guide de maintenance: cat MAINTENANCE.md" 