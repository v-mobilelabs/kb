#!/bin/bash

# 🔧 Firebase Test Setup Helper
# This script guides you through setting up environment variables for testing

set -e

echo "
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║           🔧 Firebase Test Environment Setup                  ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}ℹ️  This script helps you configure environment variables for testing${NC}\n"

# Check if credentials file exists (already found)
CREDS_FILE="/Users/vasanth/Downloads/knowledge-base-cosmoops-firebase-adminsdk-fbsvc-75062d63a9.json"

if [ -f "$CREDS_FILE" ]; then
  echo -e "${GREEN}✅ Found Firebase credentials:${NC}"
  echo "   $CREDS_FILE"
  echo ""
  
  # Extract project ID from credentials
  PROJECT_ID=$(grep -o '"project_id": "[^"]*"' "$CREDS_FILE" | cut -d'"' -f4)
  echo -e "${GREEN}✅ Project ID: ${NC}$PROJECT_ID"
  echo ""
fi

# Ask for API_KEY
echo -e "${BLUE}📌 Step 1: Firebase API Key${NC}"
echo ""
echo "You need a Firebase API key. Get it from:"
echo "  1. Go to: https://console.firebase.google.com"
echo "  2. Select project: knowledge-base-cosmoops"
echo "  3. Settings → Project Settings → Web API Key"
echo ""
read -p "Enter your API_KEY: " API_KEY

if [ -z "$API_KEY" ]; then
  echo -e "${RED}❌ API_KEY cannot be empty${NC}"
  exit 1
fi

# Ask for ORG_ID
echo ""
echo -e "${BLUE}📌 Step 2: Organization ID${NC}"
echo ""
echo "This is your organization ID in the database."
echo "Common values:"
echo "  - Your company name (lowercase)"
echo "  - A subdomain like 'cosmoops'"
echo "  - A unique identifier"
echo ""
read -p "Enter your ORG_ID: " ORG_ID

if [ -z "$ORG_ID" ]; then
  echo -e "${RED}❌ ORG_ID cannot be empty${NC}"
  exit 1
fi

# Ask for optional API_BASE_URL
echo ""
echo -e "${BLUE}📌 Step 3: API Base URL (Optional)${NC}"
echo ""
echo "Default: https://api-kmmv2nm7nq-uc.a.run.app"
read -p "Press Enter to use default, or enter custom URL: " API_BASE_URL

if [ -z "$API_BASE_URL" ]; then
  API_BASE_URL="https://api-kmmv2nm7nq-uc.a.run.app"
fi

# Display summary
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}📋 Configuration Summary${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo "  API_KEY: ${YELLOW}$(echo $API_KEY | cut -c1-10)...${NC}"
echo "  ORG_ID: ${YELLOW}$ORG_ID${NC}"
echo "  API_BASE_URL: ${YELLOW}$API_BASE_URL${NC}"
echo "  GOOGLE_APPLICATION_CREDENTIALS: ${YELLOW}$CREDS_FILE${NC}"
echo ""

# Ask for confirmation
echo -e "${BLUE}📌 Step 4: Confirmation${NC}"
read -p "Does this look correct? (y/n): " confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
  echo -e "${RED}❌ Setup cancelled${NC}"
  exit 1
fi

# Generate setup command
echo ""
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo ""
echo -e "${BLUE}📋 Copy and paste this to set up your environment:${NC}"
echo ""
echo "────────────────────────────────────────────────────────────────"
cat << EOF
export API_KEY="$API_KEY"
export ORG_ID="$ORG_ID"
export API_BASE_URL="$API_BASE_URL"
export GOOGLE_APPLICATION_CREDENTIALS="$CREDS_FILE"
EOF
echo "────────────────────────────────────────────────────────────────"
echo ""

# Ask if user wants to run it immediately
echo -e "${BLUE}📌 Step 5: Ready to test?${NC}"
read -p "Run seeding script now? (y/n): " run_now

if [ "$run_now" = "y" ] || [ "$run_now" = "Y" ]; then
  echo ""
  echo -e "${BLUE}🌱 Starting store seeding...${NC}"
  echo ""
  
  export API_KEY="$API_KEY"
  export ORG_ID="$ORG_ID"
  export API_BASE_URL="$API_BASE_URL"
  export GOOGLE_APPLICATION_CREDENTIALS="$CREDS_FILE"
  
  read -p "Enter number of documents to create (default 15): " DOC_COUNT
  DOC_COUNT=${DOC_COUNT:-15}
  
  cd /Users/vasanth/Documents/workspace/CosmoOps/kb
  node tests/api/seed-with-firestore.js --documents "$DOC_COUNT"
else
  echo ""
  echo -e "${YELLOW}💡 To run the seeding script manually, execute:${NC}"
  echo ""
  echo "export API_KEY=\"$API_KEY\""
  echo "export ORG_ID=\"$ORG_ID\""
  echo "export API_BASE_URL=\"$API_BASE_URL\""
  echo "export GOOGLE_APPLICATION_CREDENTIALS=\"$CREDS_FILE\""
  echo ""
  echo "node tests/api/seed-with-firestore.js --documents 15"
  echo ""
fi
