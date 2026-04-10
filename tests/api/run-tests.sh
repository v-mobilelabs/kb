#!/bin/bash

# Test Suite Runner for Store & RAG Operations
# 
# Usage:
#   ./run-tests.sh [seed|query|both] [options]
#
# Examples:
#   ./run-tests.sh seed --documents 15
#   ./run-tests.sh query --query "What is machine learning?"
#   ./run-tests.sh both --documents 10

set -e

# ────────────────────────────────────────────────────────────────────────
# Configuration
# ────────────────────────────────────────────────────────────────────────

API_BASE_URL="${API_BASE_URL:-https://api-kmmv2nm7nq-uc.a.run.app}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ────────────────────────────────────────────────────────────────────────
# Functions
# ────────────────────────────────────────────────────────────────────────

print_header() {
  echo -e "\n${BLUE}═══════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════${NC}\n"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

validate_env() {
  local missing=()
  
  if [ -z "$API_KEY" ]; then
    missing+=("API_KEY")
  fi
  
  if [ -z "$ORG_ID" ]; then
    missing+=("ORG_ID")
  fi
  
  if [ ${#missing[@]} -gt 0 ]; then
    print_error "Missing required environment variables:"
    for var in "${missing[@]}"; do
      echo "  - $var"
    done
    echo ""
    echo "Set them before running:"
    echo "  export API_KEY='your-api-key'"
    echo "  export ORG_ID='your-org-id'"
    return 1
  fi
  
  return 0
}

show_usage() {
  cat << EOF
${BLUE}Store Seeding & RAG Testing - Test Suite${NC}

Usage: ./run-tests.sh [command] [options]

Commands:
  seed               Seed store with random documents
  query              Test RAG queries  
  both               Seed and then test queries
  help               Show this help message

Seeding Options:
  --store-name "Name"    Custom store name (default: Test Store {timestamp})
  --documents N          Number of documents to create (default: 10)
  --firestore            Use Firestore seeding (requires GOOGLE_APPLICATION_CREDENTIALS)

Query Options:
  --query "Question"     Run single query (batch mode)
  --topk N               Number of results to return (default: 5)
  --store-id ID          Store ID (required if not using both command)

Environment Variables (Required):
  API_KEY                Firebase Cloud Functions API key
  ORG_ID                 Organization ID
  API_BASE_URL           API base URL (default: https://api-kmmv2nm7nq-uc.a.run.app)

Environment Variables (For Firestore seeding):
  GOOGLE_APPLICATION_CREDENTIALS    Path to service account JSON file

Examples:
  # Seed with 15 documents using Firestore
  API_KEY=key ORG_ID=org ./run-tests.sh seed --documents 15 --firestore

  # Query a specific store
  API_KEY=key ORG_ID=org STORE_ID=store-xxx ./run-tests.sh query \\
    --query "What is Kubernetes?"

  # Seed and then query
  API_KEY=key ORG_ID=org ./run-tests.sh both --documents 10

${YELLOW}Note:${NC} You can also run the scripts directly:
  node seed-with-firestore.js --documents 15
  node query-rag.js --query "Your question?"

EOF
}

run_seed() {
  print_header "🌱 Seeding Store with Documents"
  
  local use_firestore=false
  local store_name=""
  local document_count=10
  
  # Parse arguments
  while [[ $# -gt 0 ]]; do
    case $1 in
      --firestore)
        use_firestore=true
        shift
        ;;
      --store-name)
        store_name="$2"
        shift 2
        ;;
      --documents)
        document_count="$2"
        shift 2
        ;;
      *)
        shift
        ;;
    esac
  done
  
  if [ -z "$store_name" ]; then
    store_name="Test Store $(date +%s)"
  fi
  
  print_info "Store Name: $store_name"
  print_info "Documents: $document_count"
  
  if [ "$use_firestore" = true ]; then
    if [ -z "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
      print_error "GOOGLE_APPLICATION_CREDENTIALS environment variable required for Firestore seeding"
      return 1
    fi
    
    print_info "Using Firestore seeding method"
    
    export API_KEY=$API_KEY
    export ORG_ID=$ORG_ID
    export API_BASE_URL=$API_BASE_URL
    
    node "$SCRIPT_DIR/seed-with-firestore.js" \
      --store-name "$store_name" \
      --documents "$document_count"
  else
    print_info "Using API seeding method"
    
    export API_KEY=$API_KEY
    export ORG_ID=$ORG_ID
    export API_BASE_URL=$API_BASE_URL
    
    node "$SCRIPT_DIR/seed-store.js" \
      --store-name "$store_name" \
      --documents "$document_count"
  fi
}

run_query() {
  print_header "🧪 Testing RAG Queries"
  
  if [ -z "$STORE_ID" ]; then
    print_error "STORE_ID environment variable is required"
    echo ""
    echo "Set it before running:"
    echo "  export STORE_ID='your-store-id'"
    return 1
  fi
  
  local query=""
  local topk=5
  
  # Parse arguments
  while [[ $# -gt 0 ]]; do
    case $1 in
      --query)
        query="$2"
        shift 2
        ;;
      --topk)
        topk="$2"
        shift 2
        ;;
      --store-id)
        STORE_ID="$2"
        shift 2
        ;;
      *)
        shift
        ;;
    esac
  done
  
  print_info "Store ID: $STORE_ID"
  print_info "Top-K Results: $topk"
  
  export API_KEY=$API_KEY
  export ORG_ID=$ORG_ID
  export STORE_ID=$STORE_ID
  export API_BASE_URL=$API_BASE_URL
  
  if [ -z "$query" ]; then
    # Interactive mode
    print_info "Running in interactive mode"
    node "$SCRIPT_DIR/query-rag.js" --topk "$topk"
  else
    # Batch mode
    print_info "Query: $query"
    node "$SCRIPT_DIR/query-rag.js" --query "$query" --topk "$topk"
  fi
}

run_both() {
  local seed_args=()
  local query_args=()
  local use_firestore=false
  
  # Separate seed and query arguments
  local parse_for_seed=true
  while [[ $# -gt 0 ]]; do
    case $1 in
      --firestore)
        use_firestore=true
        seed_args+=("$1")
        shift
        ;;
      --store-name|--documents)
        seed_args+=("$1" "$2")
        shift 2
        ;;
      --query|--topk)
        parse_for_seed=false
        query_args+=("$1" "$2")
        shift 2
        ;;
      *)
        if [ "$parse_for_seed" = true ]; then
          seed_args+=("$1")
        else
          query_args+=("$1")
        fi
        shift
        ;;
    esac
  done
  
  # Run seeding
  run_seed "${seed_args[@]}" || return 1
  
  # Extract store ID from seeding output (this is approximate)
  if [ "$use_firestore" = true ]; then
    print_warning "Please copy the Store ID from the output above"
    read -p "Enter the Store ID: " store_id
    export STORE_ID="$store_id"
  else
    # For API seeding, we'd need to parse the output
    read -p "Enter the Store ID from seeding output: " store_id
    export STORE_ID="$store_id"
  fi
  
  print_info "Using Store ID: $STORE_ID"
  
  # Add delay for documents to start enriching
  print_info "Waiting 5 seconds before querying..."
  sleep 5
  
  # Run querying
  run_query "${query_args[@]}"
}

# ────────────────────────────────────────────────────────────────────────
# Main
# ────────────────────────────────────────────────────────────────────────

COMMAND="${1:-help}"
shift || true

case "$COMMAND" in
  seed)
    validate_env || exit 1
    run_seed "$@"
    ;;
  query)
    validate_env || exit 1
    run_query "$@"
    ;;
  both)
    validate_env || exit 1
    run_both "$@"
    ;;
  help|--help|-h)
    show_usage
    ;;
  *)
    print_error "Unknown command: $COMMAND"
    echo ""
    show_usage
    exit 1
    ;;
esac
