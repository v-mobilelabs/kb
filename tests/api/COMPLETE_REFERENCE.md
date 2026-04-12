# Test Scripts - Complete Reference

Created test infrastructure for Firebase Cloud Functions API with store seeding and RAG query testing.

## 📁 Files Created

```
tests/api/
├── seed-with-firestore.js    ✅ Seed store with random docs (via Firestore SDK)
├── seed-store.js             ✅ Create store via REST API
├── query-rag.js              ✅ Test RAG queries (interactive/batch modes)
├── check-setup.js            ✅ Validate environment setup
├── run-tests.sh              ✅ Unified test runner shell script
├── README.md                 ✅ Comprehensive documentation
├── QUICK_START.md            ✅ Quick reference guide
└── COMPLETE_REFERENCE.md     ✅ This file
```

## 🎯 Purpose & Capabilities

### Purpose

Test the Firebase Cloud Functions API endpoints and RAG (Retrieval-Augmented Generation) pipeline with realistic data.

### API Base URL

```
https://api-kmmv2nm7nq-uc.a.run.app
```

### Endpoints Used

- `POST /api/v1/store` - Create store
- `POST /api/v1/query` - Query RAG pipeline

## 📝 Script Overview

### 1. **seed-with-firestore.js**

**Purpose**: Full end-to-end store creation and document seeding

**What it does**:

- Creates a new store via API
- Seeds random technical documents directly to Firestore
- Generates documents with realistic tech topics (ML, distributed systems, etc.)

**Usage**:

```bash
API_KEY=key ORG_ID=org \
  GOOGLE_APPLICATION_CREDENTIALS=/path/to/creds.json \
  node tests/api/seed-with-firestore.js [--documents 10]
```

**Options**:

- `--documents N` - Number of documents (default: 10)
- `--store-name "Name"` - Custom store name

**Output**:

- Store ID (save this for RAG testing)
- Document creation summary
- Next steps for testing

**Dependencies**:

- `firebase-admin` (for Firestore SDK)
- Environment: `GOOGLE_APPLICATION_CREDENTIALS`

### 2. **query-rag.js**

**Purpose**: Test RAG queries with flexible input modes

**What it does**:

- Queries the RAG pipeline with semantic search
- Returns relevant documents with similarity scores
- Supports interactive and batch modes
- Includes 10 predefined test queries

**Usage**:

```bash
# Interactive mode (prompts for questions)
API_KEY=key ORG_ID=org STORE_ID=store-id node query-rag.js

# Batch mode (single query)
node query-rag.js --query "What is machine learning?"

# Adjust results count
node query-rag.js --topk 10
```

**Interactive mode commands**:

- Type a question: Ask custom query
- Type `1-10`: Use predefined query
- Type `help`: Show commands
- Type `list`: Show all predefined queries
- Type `quit`: Exit

**Output**:

- Number of results found
- Document summaries and keywords
- Similarity scores
- AI status (pending/processing/done/error)

**Dependencies**:

- Node.js built-in (https module)
- No external dependencies

### 3. **seed-store.js**

**Purpose**: Create store via REST API only

**What it does**:

- Creates a new store via the REST API
- Generates random document metadata (not stored)
- Used when documents will be added separately

**Usage**:

```bash
API_KEY=key ORG_ID=org \
  node tests/api/seed-store.js \
  --store-name "My Store" \
  --documents 10
```

**Note**: This script prepares document structure but doesn't actually store them. Use `seed-with-firestore.js` for full seeding.

**Dependencies**:

- Node.js built-in (https module)

### 4. **run-tests.sh**

**Purpose**: Unified test runner with command-line interface

**What it does**:

- Wraps all test scripts into single interface
- Validates environment variables
- Provides interactive command routing

**Usage**:

```bash
# Seed with Firestore
./run-tests.sh seed --firestore --documents 15

# Query RAG
./run-tests.sh query --query "What is Kubernetes?"

# Seed then query
./run-tests.sh both --documents 10
```

**Commands**:

- `seed` - Seed store with documents
- `query` - Test RAG queries
- `both` - Seed then query
- `help` - Show usage

**Dependencies**:

- Bash shell
- Node.js
- `firebase-admin` (for Firestore option)

### 5. **check-setup.js**

**Purpose**: Validate environment before running tests

**What it does**:

- Checks Node.js version
- Validates environment variables
- Verifies credentials file
- Tests API connectivity
- Checks file permissions
- Validates installed modules

**Usage**:

```bash
node tests/api/check-setup.js
```

**Output**:

- ✅ Check passed
- ❌ Check failed
- ⚠️ Warning with suggestion

**No dependencies required** (checks built-in modules and external ones)

## 🔧 Environment Variables

### Required

```bash
API_KEY="your-firebase-api-key"
ORG_ID="your-organization-id"
```

### Optional

```bash
STORE_ID="store-id-for-querying"
GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"  # For Firestore seeding
API_BASE_URL="https://api-kmmv2nm7nq-uc.a.run.app"  # Default shown
```

## 📊 Document Structure

Random documents are generated with this schema:

```json
{
  "topic": "machine learning",
  "subtopic": "neural networks",
  "title": "machine learning — neural networks",
  "content": "This document covers best practices...",
  "tags": ["machine learning", "neural networks", "engineering"],
  "timestamp": "2026-04-07T12:34:56Z",
  "source": "seed-with-firestore"
}
```

Firestore document contains:

- `id`, `orgId`, `storeId` - Identifiers
- `name`, `kind` - Document metadata
- `jsonBody` - Original content as JSON string
- `aiStatus` - "pending" → "processing" → "done"
- `keywords` - Auto-extracted by Gemini
- `summary` - Auto-generated summary
- `embedding` - 768-dim vector from text-embedding-004
- `geminiFileUri` - File Search index reference
- Timestamps & creator info

## 🔄 Document Enrichment Flow

```
Create Document
      ↓
  [pending]  ← Initial state
      ↓
Cloud Function Triggered
      ↓
  [processing]  ← LangGraph workflow running
      ↓
  ┌─────┴──────┐
  ↓ Success    ↓ Error
[done]      [error]
```

**States**:

- `pending` - Waiting for Cloud Function
- `processing` - Enrichment in progress
- `done` - Complete (keywords, summary, embedding ready)
- `error` - Failed (check error message)

## 🚀 Suggested Workflows

### Workflow 1: Quick Test (5 min)

```bash
export API_KEY=key ORG_ID=org
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/creds.json

# Seed store
node tests/api/seed-with-firestore.js --documents 5

# Query immediately (might get pending status)
export STORE_ID=<store-id>
node tests/api/query-rag.js --query "What is machine learning?"

# Wait 30 seconds for enrichment
sleep 30

# Query again
node tests/api/query-rag.js --query "What is machine learning?"
```

### Workflow 2: Comprehensive Test (15 min)

```bash
# 1. Validate setup
node tests/api/check-setup.js

# 2. Seed with 20 documents
node tests/api/seed-with-firestore.js --documents 20

# 3. Monitor enrichment (watch logs)
gcloud functions logs read enrichCustomDocument --follow

# 4. Once enrichment completes, test queries
export STORE_ID=<store-id>
node tests/api/query-rag.js  # Interactive mode

# 5. Run predefined queries (1-10)
# 6. Try custom queries
```

### Workflow 3: Load Testing (30 min)

```bash
# 1. Seed with 100+ documents
node tests/api/seed-with-firestore.js --documents 100

# 2. Monitor enrichment status
gcloud functions logs read enrichCustomDocument --limit=100

# 3. Test query performance
node tests/api/query-rag.js --query "test" --topk 50

# 4. Track metrics:
#    - Enrichment time per document
#    - Query latency
#    - Token usage
```

## 📈 Sample Output

### Seeding Output

```
🌱 Seeding Store with Random Documents

📋 Configuration:
   API Base URL: https://api-kmmv2nm7nq-uc.a.run.app
   Organization: org-12345
   Store Name: Test Store 1712500496
   Documents to Create: 10

✅ Firebase initialized

📦 Creating store via API...

✅ Store created: store-abc123xyz

📄 Seeding 10 documents via Firestore...

   [1/10] machine-learning-neural-networks-k7m2n9p
   [2/10] distributed-systems-consensus-f5x8j3q
   ...
   [10/10] devops-monitoring-p9k2m5l

✅ All documents seeded to Firestore

🎯 Store Seeding Complete

Store Details:
  ID: store-abc123xyz
  Name: Test Store 1712500496
  Organization: org-12345
  Documents Created: 10

📊 Document Examples:

  [1] machine learning — neural networks
      Topic: machine learning → neural networks
  [2] distributed systems — consensus
      Topic: distributed systems → consensus
  [3] kubernetes — operators
      Topic: kubernetes → operators

📋 Store ID for testing: store-abc123xyz
```

### Query Output

```
🧪 RAG Query Tester — Interactive Mode

Store ID: store-abc123xyz
Top-K Results: 5

Enter your questions or choose from suggestions:

Suggested queries:
  1. What is machine learning?
  2. How do we handle fault tolerance in distributed systems?
  ...

Enter query or option: 1

🔍 Querying: "What is machine learning?"
⏳ Waiting for results...

✅ Query Successful

📊 Results (5 documents found):

[1] machine-learning-neural-networks-xyz
    Summary: This document covers best practices for machine learning...
    Keywords: machine learning, neural networks, engineering
    Status: done
    Similarity: 92.3%

[2] machine-learning-transformers-abc
    Summary: Understanding transformers is essential for modern ML...
    Keywords: machine learning, transformers, nlp
    Status: done
    Similarity: 88.7%
```

## 🐛 Troubleshooting

### Environment Issues

```bash
# Check what's set
echo $API_KEY $ORG_ID $STORE_ID

# Validate setup
node tests/api/check-setup.js

# See detailed error
API_KEY=key ORG_ID=org node tests/api/seed-store.js 2>&1
```

### Credentials Issues

```bash
# Verify file exists and is valid
ls -la "$GOOGLE_APPLICATION_CREDENTIALS"
cat "$GOOGLE_APPLICATION_CREDENTIALS" | head -5

# Check it's proper JSON
python3 -m json.tool "$GOOGLE_APPLICATION_CREDENTIALS" > /dev/null && echo "Valid JSON"
```

### API Issues

```bash
# Test health
curl "https://api-kmmv2nm7nq-uc.a.run.app/api/v1/health"

# Test with API key
curl -H "x-api-key: $API_KEY" "https://api-kmmv2nm7nq-uc.a.run.app/api/v1/health"

# Check API logs
gcloud functions logs read api --limit=50
```

### Enrichment Issues

```bash
# Check function deployment
gcloud functions list

# View enrichment logs
gcloud functions logs read enrichCustomDocument --limit=50

# Search for errors
gcloud functions logs read enrichCustomDocument | grep -i "error\|failed"
```

## 📚 Documentation Files

| File                    | Purpose                           |
| ----------------------- | --------------------------------- |
| `README.md`             | Comprehensive guide with examples |
| `QUICK_START.md`        | Quick reference for common tasks  |
| `COMPLETE_REFERENCE.md` | This file - detailed reference    |

## 🔗 Related Resources

- **API Base URL**: https://api-kmmv2nm7nq-uc.a.run.app
- **Google Cloud Functions Logs**: `gcloud functions logs read`
- **Firebase Console**: https://console.firebase.google.com
- **Cloud Functions Documentation**: https://cloud.google.com/functions/docs

## ✅ Checklist Before Testing

- [ ] Node.js v14+ installed (`node --version`)
- [ ] API key available and stored in `$API_KEY`
- [ ] Organization ID available and stored in `$ORG_ID`
- [ ] Service account JSON downloaded (for Firestore seeding)
- [ ] Path to service account set in `$GOOGLE_APPLICATION_CREDENTIALS`
- [ ] Firebase Admin SDK installed (`npm install firebase-admin`)
- [ ] Network access to `api-kmmv2nm7nq-uc.a.run.app`
- [ ] Test scripts are executable (`chmod +x tests/api/*.sh`)
- [ ] Setup validation passed (`node tests/api/check-setup.js`)

## 🎯 Next Steps

1. ✅ Run `check-setup.js` to validate environment
2. 🌱 Seed store with `seed-with-firestore.js`
3. ⏳ Monitor enrichment via Cloud Functions logs
4. 🧪 Test queries with `query-rag.js`
5. 📊 Analyze results and iterate
6. 🚀 Scale to production

---

## 🧠 Memory Module Test Scenarios

### Memory CRUD

| Scenario              | Method | Endpoint                       | Expected                            |
| --------------------- | ------ | ------------------------------ | ----------------------------------- |
| List memories (empty) | GET    | `/api/memories`                | `200`, empty items array            |
| Create memory         | POST   | `/api/memories`                | `201`, returns memory with defaults |
| Get memory detail     | GET    | `/api/memories/{id}`           | `200`, full memory object           |
| Update memory         | PUT    | `/api/memories/{id}`           | `200`, updated capacity/description |
| Delete memory + docs  | DELETE | `/api/memories/{id}`           | `200`, cascade deletes documents    |
| List with search      | GET    | `/api/memories?q=prefix`       | `200`, filtered results             |
| List with sort        | GET    | `/api/memories?sort=title_asc` | `200`, sorted results               |
| Cursor pagination     | GET    | `/api/memories?cursor=...`     | `200`, next page                    |

### Document CRUD

| Scenario               | Method | Endpoint                                              | Expected                     |
| ---------------------- | ------ | ----------------------------------------------------- | ---------------------------- |
| List documents (empty) | GET    | `/api/memories/{id}/documents`                        | `200`, empty items           |
| Create document        | POST   | `/api/memories/{id}/documents`                        | `201`, increments count      |
| Get document detail    | GET    | `/api/memories/{id}/documents/{docId}`                | `200`, full content          |
| Update document        | PUT    | `/api/memories/{id}/documents/{docId}`                | `200`, updated fields        |
| Delete document        | DELETE | `/api/memories/{id}/documents/{docId}`                | `200`, decrements count      |
| Filter condensed       | GET    | `/api/memories/{id}/documents?includeCondensed=false` | `200`, excludes AI summaries |

### Capacity Eviction

| Scenario                            | Expected                                             |
| ----------------------------------- | ---------------------------------------------------- |
| Create doc at capacity              | Oldest doc evicted, new doc created, count unchanged |
| Reduce capacity below count via PUT | Excess oldest docs evicted atomically                |

### Condensation (async)

| Scenario                        | Expected                                                                                             |
| ------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Create doc past threshold (50%) | Condensation triggered asynchronously via Cloud Function                                             |
| After condensation              | 1 summary doc created (`isCondensationSummary: true`), source docs deleted, count decremented by n-1 |
| Summary doc view                | Shows "AI-Generated Summary" banner, purple badge in list                                            |

### Performance Targets

| Operation          | Target |
| ------------------ | ------ |
| Memory creation    | < 30s  |
| Document creation  | < 2s   |
| Sort/filter update | < 1s   |
| Deletion           | < 10s  |

---

**Last Updated**: April 7, 2026  
**Version**: 1.1
