#!/bin/bash

# 🎯 TEST SCRIPTS OVERVIEW
# 
# This is a visual guide to the test suite created for the Firebase Cloud Functions API
# Location: /Users/vasanth/Documents/workspace/CosmoOps/kb/tests/api/
#
# Use this file to understand which script to use and in what order

cat << 'EOF'

████████████████████████████████████████████████████████████████████████████
█                                                                          █
█  🚀 TEST SUITE OVERVIEW - Firebase Cloud Functions API                 █
█                                                                          █
█  API Base: https://api-kmmv2nm7nq-uc.a.run.app                         █
█                                                                          █
████████████████████████████████████████████████████████████████████████████

📁 DIRECTORY STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

tests/api/
│
├── 📝 DOCUMENTATION
│   ├── README.md                 ← Comprehensive guide (start here!)
│   ├── QUICK_START.md            ← Quick reference (TL;DR)
│   └── COMPLETE_REFERENCE.md     ← Detailed API reference
│
├── 🧪 SEEDING SCRIPTS  
│   ├── seed-with-firestore.js    ← RECOMMENDED: Full seeding (store + docs)
│   └── seed-store.js             ← Alternative: API-only store creation
│
├── 🔍 QUERY TESTING
│   └── query-rag.js              ← Test RAG queries (interactive & batch)
│
├── 🔧 UTILITIES
│   ├── check-setup.js            ← Validate environment before testing
│   └── run-tests.sh              ← Unified test runner
│
└── 📋 THIS FILE
    └── _OVERVIEW.sh              ← This file (visual guide)


💡 QUICK DECISION TREE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  START HERE
      │
      ├─ "I want to validate my setup"
      │  └──> node check-setup.js
      │
      ├─ "I want to seed with random data"
      │  ├─ "Using Firestore" (Recommended)
      │  │  └──> node seed-with-firestore.js --documents 10
      │  └─ "Using just the API"
      │     └──> node seed-store.js
      │
      ├─ "I want to test RAG queries"
      │  ├─ "Interactive mode (ask questions)"
      │  │  └──> node query-rag.js
      │  └─ "Batch mode (single query)"
      │     └──> node query-rag.js --query "Your question"
      │
      └─ "I want to run everything"
         └──> ./run-tests.sh both --documents 15


🚀 TYPICAL WORKFLOW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  STEP 1: Setup Environment
  ─────────────────────────
  export API_KEY="your-api-key"
  export ORG_ID="your-org-id"
  export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"

  STEP 2: Validate Setup
  ──────────────────────
  node check-setup.js
  
  ✅ All checks passed!

  STEP 3: Seed Store with Documents
  ──────────────────────────────────
  node seed-with-firestore.js --documents 10
  
  Output: Store ID = store-abc123xyz

  STEP 4: Wait for Enrichment
  ───────────────────────────
  (Watch Cloud Functions logs for 30-60 seconds)
  
  Document status: pending → processing → done

  STEP 5: Test RAG Queries
  ────────────────────────
  export STORE_ID="store-abc123xyz"
  node query-rag.js
  
  Type your questions:
  > "What is machine learning?"
  > "How do we handle distributed systems?"
  > quit


📊 SCRIPT SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ┌─────────────────────┬────────────────┬─────────────────────┐
  │ SCRIPT              │ PURPOSE        │ TYPE                │
  ├─────────────────────┼────────────────┼─────────────────────┤
  │ seed-with-firestore │ Seed store     │ Node.js + Firebase  │
  │ .js                 │ (Recommended)  │ Admin SDK           │
  ├─────────────────────┼────────────────┼─────────────────────┤
  │ seed-store.js       │ Create store   │ Node.js (HTTPS)     │
  │                     │ (API only)     │                     │
  ├─────────────────────┼────────────────┼─────────────────────┤
  │ query-rag.js        │ Test RAG       │ Node.js (HTTPS)     │
  │                     │ queries        │ Interactive/Batch   │
  ├─────────────────────┼────────────────┼─────────────────────┤
  │ check-setup.js      │ Validate       │ Node.js (No deps)   │
  │                     │ environment    │                     │
  ├─────────────────────┼────────────────┼─────────────────────┤
  │ run-tests.sh        │ Unified        │ Bash shell script   │
  │                     │ test runner    │                     │
  └─────────────────────┴────────────────┴─────────────────────┘


🔄 DATA FLOW DIAGRAM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Your Machine                Firebase API             Cloud Functions
  ─────────────              ────────────             ─────────────────
      
      1. SEEDING
      ──────────
      
      ┌──────────────────────┐
      │ seed-with-firestore │
      └──────────┬───────────┘
                 │
          ┌──────▼────────┐
          │ Create Store  │◄──────── POST /api/v1/store
          │ (via API)     │
          └──────┬────────┘
                 │
                 │ Firestore Admin SDK
                 │
          ┌──────▼────────┐
          │ Seed Documents│◄──────── Direct Firestore writes
          │ (to Firestore)│         organizations/{orgId}/stores/{storeId}/documents
          └──────┬────────┘
                 │
                 └──────────────────────────────────────────┐
                                                           │
                                                      Cloud Function
                                                      Triggered ↓
                                                    (enrichCustomDocument)
                                                           │
                                                    LangGraph Workflow
                                                           │
                                                    ┌──────┴──────┐
                                                    │ Extract     │
                                                    │ Keywords    │ 
                                                    │ Summary     │
                                                    │ Embedding   │
                                                    └──────┬──────┘
                                                           │
                                                    Updates Firestore
                                                    (aiStatus="done")
      
      2. QUERYING
      ──────────
      
      ┌─────────────┐
      │ query-rag   │
      └──────┬──────┘
             │
             │ POST /api/v1/query
             │ { storeId, query, topK }
             │
      ┌──────▼────────────┐
      │ Query RAG API     │
      └──────┬────────────┘
             │
             ├─ Vector Search (embedding similarity)
             ├─ Retrieve top-K documents
             ├─ Generate answer with context
             │
             └──────► Results with:
                      • Document matches
                      • Similarity scores
                      • Generated answer


🎯 KEY ENVIRONMENT VARIABLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  REQUIRED:
  ─────────
  API_KEY                    Firebase Cloud Functions API key
  ORG_ID                     Your organization ID

  FOR FIRESTORE SEEDING:
  ──────────────────────
  GOOGLE_APPLICATION_CREDENTIALS    Path to service account JSON file
                                    (download from Google Cloud Console)

  FOR QUERYING:
  ─────────────
  STORE_ID                   Store ID from seeding output

  OPTIONAL:
  ────────
  API_BASE_URL               API base (default: https://api-kmmv2nm7nq-uc.a.run.app)


📚 PREDEFINED TEST QUERIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  When using query-rag.js in interactive mode, press these numbers:

   1. "What is machine learning?"
   2. "How do we handle fault tolerance in distributed systems?"
   3. "Best practices for performance optimization"
   4. "What are microservices and their benefits?"
   5. "Explain the principles of cloud computing"
   6. "How does kubernetes help with container orchestration?"
   7. "What is API-driven development?"
   8. "Security considerations for modern applications"
   9. "Monitoring and observability in production systems"
  10. "Database design patterns and best practices"

  Or type your own question anytime!


🔍 MONITORING & DEBUGGING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  WATCH ENRICHMENT PROGRESS:
  ──────────────────────────
  gcloud functions logs read enrichCustomDocument --follow

  CHECK FOR ENRICHMENT ERRORS:
  ────────────────────────────
  gcloud functions logs read enrichCustomDocument --limit=100 | grep -i error

  FILTER BY STORE ID:
  ───────────────────
  gcloud functions logs read enrichCustomDocument | grep "store-id-here"

  CHECK API HEALTH:
  ─────────────────
  curl https://api-kmmv2nm7nq-uc.a.run.app/api/v1/health


🐛 COMMON ISSUES & FIXES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ❌ "API_KEY environment variable is required"
  ✅ export API_KEY="your-api-key"

  ❌ "ORG_ID environment variable is required"
  ✅ export ORG_ID="your-org-id"

  ❌ "Credentials file not found"
  ✅ export GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/to/service-account.json"

  ❌ "Cannot find firebase-admin module"
  ✅ npm install firebase-admin

  ❌ "Documents still pending after 5 minutes"
  ✅ Check Cloud Functions logs for errors
  ✅ Verify enrichCustomDocument function is deployed
  ✅ Check Vertex AI APIs are enabled in Google Cloud Console


📞 SUPPORT & DOCUMENTATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  START HERE:              README.md
  Quick Reference:         QUICK_START.md  
  Complete API Reference:  COMPLETE_REFERENCE.md
  Validation Tool:         check-setup.js


🎓 LEARNING PATH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Beginner:
  ─────────
  1. Read QUICK_START.md
  2. Run check-setup.js
  3. Run seed-with-firestore.js --documents 5
  4. Wait 30 seconds
  5. Run query-rag.js (interactive)

  Intermediate:
  ─────────────
  1. Read README.md sections 1-3
  2. Customize seed documents
  3. Test with --topk variations
  4. Monitor Cloud Functions logs
  5. Scale to 50+ documents

  Advanced:
  ─────────
  1. Read COMPLETE_REFERENCE.md
  2. Modify document generation
  3. Implement custom seeding
  4. Load test with 1000+ documents
  5. Optimize queries


✨ SAMPLE COMMANDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  # Validate setup
  node check-setup.js

  # Seed 10 documents
  API_KEY=key ORG_ID=org \\
    GOOGLE_APPLICATION_CREDENTIALS=/path/to/creds.json \\
    node seed-with-firestore.js

  # Seed 50 documents
  node seed-with-firestore.js --documents 50

  # Query (interactive)
  export STORE_ID="store-abc123"
  node query-rag.js

  # Query (single question)
  node query-rag.js --query "What is Kubernetes?"

  # Query with more results
  node query-rag.js --topk 20

  # Run everything
  ./run-tests.sh both --documents 15


═══════════════════════════════════════════════════════════════════════════════

                    🎉 READY TO TEST! 

                    Next step: Read README.md or QUICK_START.md

═══════════════════════════════════════════════════════════════════════════════

EOF

# Make this file executable
chmod +x "$0"
exit 0
