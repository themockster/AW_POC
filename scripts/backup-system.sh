#!/bin/bash

# 💾 Script de sauvegarde automatique AgentWatch
# Usage: ./scripts/backup-system.sh [nom_backup]

set -e

# Nom du backup (optionnel)
BACKUP_NAME=${1:-"backup-$(date +%Y%m%d-%H%M%S)"}

echo "💾 Sauvegarde automatique du système AgentWatch"
echo "=============================================="
echo "Nom du backup: $BACKUP_NAME"

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

# Créer le dossier de backup
BACKUP_DIR="backups/$BACKUP_NAME"
mkdir -p "$BACKUP_DIR"

echo ""
echo "📁 Création de la structure de backup..."

# Créer les sous-dossiers
mkdir -p "$BACKUP_DIR/agentwatch"
mkdir -p "$BACKUP_DIR/chatbot-service"
mkdir -p "$BACKUP_DIR/logs"
mkdir -p "$BACKUP_DIR/config"

print_status 0 "Structure de backup créée"

echo ""
echo "📦 Sauvegarde des composants..."

# Sauvegarder AgentWatch
if [ -d "agentwatch" ]; then
    echo -e "${BLUE}📦 Sauvegarde d'AgentWatch...${NC}"
    
    # Copier les fichiers source (exclure node_modules)
    rsync -av --exclude='node_modules' --exclude='dist' --exclude='*.log' agentwatch/ "$BACKUP_DIR/agentwatch/"
    
    # Sauvegarder package.json et package-lock.json séparément
    cp agentwatch/package.json "$BACKUP_DIR/agentwatch/"
    cp agentwatch/package-lock.json "$BACKUP_DIR/agentwatch/" 2>/dev/null || true
    
    print_status 0 "AgentWatch sauvegardé"
else
    print_status 1 "AgentWatch - dossier manquant"
fi

# Sauvegarder Chatbot Service
if [ -d "chatbot-service" ]; then
    echo -e "${BLUE}📦 Sauvegarde du Chatbot Service...${NC}"
    
    # Copier les fichiers source (exclure __pycache__)
    rsync -av --exclude='__pycache__' --exclude='*.pyc' --exclude='*.log' chatbot-service/ "$BACKUP_DIR/chatbot-service/"
    
    # Sauvegarder la base de données
    if [ -f "chatbot-service/chatbot.db" ]; then
        cp chatbot-service/chatbot.db "$BACKUP_DIR/chatbot-service/"
        print_status 0 "Base de données sauvegardée"
    else
        print_status 1 "Base de données - fichier manquant"
    fi
    
    print_status 0 "Chatbot Service sauvegardé"
else
    print_status 1 "Chatbot Service - dossier manquant"
fi

# Sauvegarder les logs
if [ -d "logs" ]; then
    echo -e "${BLUE}📦 Sauvegarde des logs...${NC}"
    cp -r logs/* "$BACKUP_DIR/logs/" 2>/dev/null || true
    print_status 0 "Logs sauvegardés"
else
    print_status 1 "Logs - dossier manquant"
fi

# Sauvegarder les fichiers de configuration
echo -e "${BLUE}📦 Sauvegarde de la configuration...${NC}"

# Fichiers de configuration importants
CONFIG_FILES=(
    "MAINTENANCE.md"
    "README.md"
    ".gitignore"
    "chatbot-interface.html"
)

for file in "${CONFIG_FILES[@]}"; do
    if [ -f "$file" ]; then
        cp "$file" "$BACKUP_DIR/config/"
        print_status 0 "$file sauvegardé"
    else
        print_status 1 "$file - fichier manquant"
    fi
done

echo ""
echo "📊 Informations système..."

# Créer un fichier d'informations système
cat > "$BACKUP_DIR/system-info.txt" << EOF
Sauvegarde AgentWatch - $BACKUP_NAME
Date: $(date)
Système: $(uname -a)

Versions:
- Node.js: $(node --version 2>/dev/null || echo "Non installé")
- Python: $(python --version 2>/dev/null || echo "Non installé")
- npm: $(npm --version 2>/dev/null || echo "Non installé")

Services actifs:
- AgentWatch (3001): $(lsof -i :3001 >/dev/null 2>&1 && echo "ACTIF" || echo "INACTIF")
- Chatbot Service (8000): $(lsof -i :8000 >/dev/null 2>&1 && echo "ACTIF" || echo "INACTIF")
- LM Studio (1234): $(lsof -i :1234 >/dev/null 2>&1 && echo "ACTIF" || echo "INACTIF")

Taille des composants:
- AgentWatch: $(du -sh agentwatch 2>/dev/null | cut -f1 || echo "N/A")
- Chatbot Service: $(du -sh chatbot-service 2>/dev/null | cut -f1 || echo "N/A")
- Base de données: $(du -sh chatbot-service/chatbot.db 2>/dev/null | cut -f1 || echo "N/A")
EOF

print_status 0 "Informations système sauvegardées"

echo ""
echo "🗜️  Compression du backup..."

# Compresser le backup
cd backups
tar -czf "$BACKUP_NAME.tar.gz" "$BACKUP_NAME"
rm -rf "$BACKUP_NAME"

BACKUP_SIZE=$(du -h "$BACKUP_NAME.tar.gz" | cut -f1)
print_status 0 "Backup compressé ($BACKUP_SIZE)"

cd ..

echo ""
echo "📋 Résumé de la sauvegarde:"

# Afficher les statistiques
echo "  Nom: $BACKUP_NAME"
echo "  Taille: $BACKUP_SIZE"
echo "  Emplacement: backups/$BACKUP_NAME.tar.gz"
echo "  Date: $(date)"

echo ""
echo "🔍 Vérification du backup..."

# Vérifier que le fichier existe et n'est pas corrompu
if [ -f "backups/$BACKUP_NAME.tar.gz" ]; then
    if tar -tzf "backups/$BACKUP_NAME.tar.gz" > /dev/null 2>&1; then
        print_status 0 "Backup vérifié et valide"
    else
        print_status 1 "Backup corrompu"
    fi
else
    print_status 1 "Fichier de backup manquant"
fi

echo ""
echo "🔄 Nettoyage des anciens backups..."

# Garder seulement les 5 derniers backups
cd backups
ls -t *.tar.gz | tail -n +6 | xargs rm -f 2>/dev/null || true
cd ..

BACKUP_COUNT=$(ls backups/*.tar.gz 2>/dev/null | wc -l)
echo "  Backups conservés: $BACKUP_COUNT"

echo ""
echo "📖 Commandes utiles:"

echo "  Lister les backups:"
echo "    ls -la backups/"

echo "  Restaurer un backup:"
echo "    tar -xzf backups/$BACKUP_NAME.tar.gz"

echo "  Supprimer un backup:"
echo "    rm backups/$BACKUP_NAME.tar.gz"

echo ""
echo -e "${GREEN}🎉 Sauvegarde terminée avec succès !${NC}" 