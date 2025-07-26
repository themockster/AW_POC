#!/bin/bash

# 🛑 Script d'arrêt automatique AgentWatch
# Usage: ./scripts/stop-system.sh

set -e

echo "🛑 Arrêt automatique du système AgentWatch"
echo "=========================================="

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

# Fonction pour arrêter un processus par PID
stop_process() {
    local pid_file=$1
    local service_name=$2
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null 2>&1; then
            echo -e "${YELLOW}🔄 Arrêt de $service_name (PID: $pid)...${NC}"
            kill $pid 2>/dev/null || true
            sleep 2
            
            # Vérifier si le processus est toujours en vie
            if ps -p $pid > /dev/null 2>&1; then
                echo -e "${YELLOW}⚠️  Force kill de $service_name...${NC}"
                kill -9 $pid 2>/dev/null || true
            fi
            
            print_status 0 "$service_name arrêté"
        else
            echo -e "${BLUE}ℹ️  $service_name n'était pas en cours d'exécution${NC}"
        fi
        rm -f "$pid_file"
    else
        echo -e "${BLUE}ℹ️  Fichier PID pour $service_name non trouvé${NC}"
    fi
}

# Fonction pour arrêter un processus sur un port
stop_port() {
    local port=$1
    local service_name=$2
    
    if lsof -i :$port > /dev/null 2>&1; then
        echo -e "${YELLOW}🔄 Arrêt de $service_name sur le port $port...${NC}"
        lsof -ti:$port | xargs kill 2>/dev/null || true
        sleep 2
        
        # Vérifier si le port est toujours occupé
        if lsof -i :$port > /dev/null 2>&1; then
            echo -e "${YELLOW}⚠️  Force kill sur le port $port...${NC}"
            lsof -ti:$port | xargs kill -9 2>/dev/null || true
        fi
        
        print_status 0 "$service_name arrêté"
    else
        echo -e "${BLUE}ℹ️  $service_name n'était pas en cours d'exécution sur le port $port${NC}"
    fi
}

echo ""
echo "🔍 Recherche des processus..."

# Créer le dossier logs s'il n'existe pas
mkdir -p logs

# Arrêter les processus par PID (méthode propre)
echo -e "${BLUE}📋 Arrêt par fichiers PID...${NC}"
stop_process "logs/agentwatch.pid" "AgentWatch"
stop_process "logs/chatbot.pid" "Chatbot Service"

echo ""
echo "🔌 Arrêt par ports (méthode de secours)..."

# Arrêter les processus par port (méthode de secours)
stop_port 3001 "AgentWatch"
stop_port 8000 "Chatbot Service"

echo ""
echo "🧹 Nettoyage..."

# Supprimer les fichiers PID restants
rm -f logs/agentwatch.pid logs/chatbot.pid

# Vérifier qu'aucun processus ne reste
echo -e "${BLUE}🔍 Vérification finale...${NC}"

if lsof -i :3001 > /dev/null 2>&1; then
    print_status 1 "AgentWatch (port 3001) - TOUJOURS ACTIF"
else
    print_status 0 "AgentWatch (port 3001) - ARRÊTÉ"
fi

if lsof -i :8000 > /dev/null 2>&1; then
    print_status 1 "Chatbot Service (port 8000) - TOUJOURS ACTIF"
else
    print_status 0 "Chatbot Service (port 8000) - ARRÊTÉ"
fi

echo ""
echo "📊 Résumé de l'arrêt:"

# Compter les processus restants
REMAINING_PROCESSES=0

if lsof -i :3001 > /dev/null 2>&1; then
    REMAINING_PROCESSES=$((REMAINING_PROCESSES + 1))
fi

if lsof -i :8000 > /dev/null 2>&1; then
    REMAINING_PROCESSES=$((REMAINING_PROCESSES + 1))
fi

if [ $REMAINING_PROCESSES -eq 0 ]; then
    echo -e "${GREEN}🎉 Tous les services ont été arrêtés avec succès !${NC}"
else
    echo -e "${YELLOW}⚠️  $REMAINING_PROCESSES service(s) encore actif(s)${NC}"
    echo ""
    echo "🔧 Actions manuelles recommandées:"
    echo "  - Vérifier les processus: ps aux | grep -E '(node|python)'"
    echo "  - Forcer l'arrêt: pkill -f 'agentwatch' && pkill -f 'chatbot'"
fi

echo ""
echo "📁 Logs conservés:"
echo "  - logs/agentwatch.log"
echo "  - logs/chatbot.log"

echo ""
echo "🚀 Pour redémarrer le système:"
echo "  ./scripts/start-system.sh" 