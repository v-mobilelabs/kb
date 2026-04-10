# Store Seeding & RAG Query Testing

This directory contains test scripts for seeding stores with random data and testing RAG (Retrieval-Augmented Generation) queries.

## 📋 Overview

- **`seed-with-firestore.js`** - Creates a store and seeds it with random technical documents via Firestore
- **`query-rag.js`** - Tests RAG queries against a seeded store (interactive and batch modes)
- **`seed-store.js`** - Creates a store via the API (documents must be seeded separately)

## 🚀 Quick Start

### Prerequisites

1. **API Key**: Generate a Firebase Cloud Functions API key

   ```bash
   # Get your API key from Firebase console or environment
   export API_KEY="your-api-key-here"
   ```

2. **Organization ID**: Your organization ID in the system

   ```bash
   export ORG_ID="your-org-id"
   ```

3. **Service Account** (for Firestore seeding):

   ```bash
   # Download from Google Cloud Console
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
   ```

4. **Install Dependencies**:
   ```bash
   cd /Users/vasanth/Documents/workspace/CosmoOps/kb
   npm install firebase-admin
   ```

### 1️⃣ Seed Store with Documents

#### Option A: Using Firestore (Recommended)

Creates a store and seeds 10 random documents directly to Firestore:

```bash
API_KEY="your-key" ORG_ID="your-org" \
  GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json" \
  node tests/api/seed-with-firestore.js

# With custom options:
node tests/api/seed-with-firestore.js \
  --store-name "My Test Store" \
  --documents 20
```

**Output**: Store ID will be displayed (save this for RAG testing)

#### Option B: Using Create Store API

Creates a store via the API (requires separate document seeding):

```bash
API_KEY="your-key" ORG_ID="your-org" \
  node tests/api/seed-store.js \
  --store-name "My Store" \
  --documents 15
```

### 2️⃣ Test RAG Queries

#### Interactive Mode

```bash
API_KEY="your-key" ORG_ID="your-org" STORE_ID="store-id-from-seeding" \
  node tests/api/query-rag.js
```

Then interact with the prompt:

- Type your question (e.g., "What is machine learning?")
- Type a number (1-10) to use predefined queries
- Type `help` for available commands
- Type `quit` to exit

**Example Session**:

```
Enter query or option: 1
🔍 Querying: "What is machine learning?"
⏳ Waiting for results...

✅ Query Successful

📊 Results (5 documents found):

[1] machine-learning — neural-networks
    Summary: This document covers best practices...
    Keywords: machine learning, neural networks, engineering
    Status: done
    Similarity: 89.5%
```

#### Batch Mode (Single Query)

```bash
API_KEY="your-key" ORG_ID="your-org" STORE_ID="store-id" \
  node tests/api/query-rag.js --query "What is Kubernetes?"
```

#### Custom Top-K Results

```bash
node tests/api/query-rag.js --topk 10
```

## 📚 Available Test Queries

The script includes predefined queries:

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

Use numbers 1-10 in interactive mode to quickly test queries.

## 🔄 Workflow: Complete Seeding & Testing

```bash
#!/bin/bash

# 1. Set environment variables
export API_KEY="your-api-key"
export ORG_ID="your-org-id"
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"

# 2. Seed the store
echo "🌱 Seeding store..."
STORE_RESULT=$(node tests/api/seed-with-firestore.js --documents 15)
STORE_ID=$(echo "$STORE_RESULT" | grep "ID:" | awk '{print $NF}')

echo "Store ID: $STORE_ID"

# 3. Wait for enrichment (watch logs)
echo "⏳ Waiting for documents to be enriched..."
# Check Google Cloud Functions logs for progress

# 4. Test RAG queries
echo "🧪 Testing RAG queries..."
export STORE_ID=$STORE_ID

# Single query test
node tests/api/query-rag.js --query "What is machine learning?"

# Or interactive mode
node tests/api/query-rag.js
```

## 📖 Document Structure

Documents are seeded with this structure (as custom documents):

```json
{
  "topic": "machine learning",
  "subtopic": "neural networks",
  "title": "machine learning — neural networks",
  "content": "This document covers best practices for machine learning with a focus on neural networks...",
  "tags": ["machine learning", "neural networks", "engineering"],
  "timestamp": "2026-04-07T12:34:56Z",
  "source": "seed-with-firestore"
}
```

Each document creates these Firestore fields:

- `kind`: "custom"
- `name`: Unique identifier (topic-subtopic-random)
- `jsonBody`: Full JSON document as string
- `aiStatus`: "pending" (enriched to "done" by Cloud Functions)
- `keywords`: Auto-extracted by Gemini Flash
- `summary`: Auto-generated extract
- `embedding`: 768-dim vector (computed by Gemini)

## 🔍 Monitoring Enrichment Progress

Check the Firebase Cloud Functions logs:

```bash
# View logs in real-time
gcloud functions logs read enrichCustomDocument --limit=50

# Filter by store ID
gcloud functions logs read enrichCustomDocument --limit=100 | grep "store-id-here"

# Check for errors
gcloud functions logs read enrichCustomDocument --limit=100 | grep -i "error\|failed"
```

Document enrichment states:

- **pending**: Waiting for Cloud Function to trigger
- **processing**: LangGraph workflow running
- **done**: Enrichment complete (keywords, summary, embedding generated)
- **error**: Enrichment failed (check logs for details)

## ⚙️ Configuration

### Environment Variables

| Variable                         | Required              | Description                                                   |
| -------------------------------- | --------------------- | ------------------------------------------------------------- |
| `API_KEY`                        | Yes                   | Firebase Cloud Functions API key                              |
| `ORG_ID`                         | Yes                   | Organization ID                                               |
| `STORE_ID`                       | Yes (for query)       | Store ID from seeding                                         |
| `GOOGLE_APPLICATION_CREDENTIALS` | For Firestore seeding | Path to service account JSON                                  |
| `API_BASE_URL`                   | No                    | API base URL (default: `https://api-kmmv2nm7nq-uc.a.run.app`) |

### Command Line Options

| Option                | Script    | Description                       |
| --------------------- | --------- | --------------------------------- |
| `--store-name "Name"` | seed      | Custom store name                 |
| `--documents N`       | seed      | Number of documents (default: 10) |
| `--query "Question"`  | query-rag | Single query (batch mode)         |
| `--topk N`            | query-rag | Number of results (default: 5)    |

## 🐛 Troubleshooting

### "API_KEY environment variable is required"

```bash
export API_KEY="your-key"
```

### "ORG_ID environment variable is required"

```bash
export ORG_ID="your-org-id"
```

### "Credentials file not found"

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/to/service-account.json"
```

### "Document status still 'pending' after 5 minutes"

- Check Google Cloud Functions logs for errors
- Verify `enrichCustomDocument` function is deployed
- Check that Vertex AI APIs are enabled in Google Cloud Console

### "Query returns no results"

- Ensure documents have been enriched to "done" status
- Try adjusting `--topk` parameter (lower values may return empty)
- Check document keywords and summary were auto-generated

### "403 Error when calling API"

- Verify API key is correct
- Ensure API key has necessary permissions
- Check that Cloud Functions are deployed and running

## 📊 Example Output

### Seeding

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

✅ All documents seeded to Firestore

🎯 Store Seeding Complete

Store Details:
  ID: store-abc123xyz
  Name: Test Store 1712500496
  Organization: org-12345
  Documents Created: 10

📋 Store ID for testing: store-abc123xyz
```

### Querying

```
🧪 RAG Query Tester — Interactive Mode

Store ID: store-abc123xyz
Top-K Results: 5

Enter your questions or choose from suggestions:

Suggested queries:
  1. What is machine learning?
  2. How do we handle fault tolerance in distributed systems?
  ...

Enter query or option: What is semantic search?

🔍 Querying: "What is semantic search?"
⏳ Waiting for results...

✅ Query Successful

📊 Results (5 documents found):

[1] machine-learning-embeddings-xyz
    Summary: This document covers embeddings and semantic similarity...
    Keywords: machine learning, embeddings, similarity search
    Status: done
    Similarity: 92.3%

[2] database-design-indexing-abc
    Summary: Indexing strategies for efficient querying...
    Keywords: database, indexing, query optimization
    Status: done
    Similarity: 78.5%
```

## 📝 Script Details

### seed-with-firestore.js

- **Purpose**: Full end-to-end store creation and document seeding
- **API Calls**: POST /api/v1/store (create store)
- **Firestore Writes**: Batch insert of documents
- **Benefits**: All documents created with single operation
- **Dependencies**: firebase-admin SDK

### query-rag.js

- **Purpose**: Test RAG queries with flexible input modes
- **API Calls**: POST /api/v1/query (semantic search + generation)
- **Modes**: Batch (--query flag) or Interactive (prompt)
- **Features**: Pre-defined queries, custom queries, adjustable top-K
- **No dependencies**: Pure Node.js HTTPS

### seed-store.js

- **Purpose**: Create store via REST API only
- **API Calls**: POST /api/v1/store
- **Use case**: When documents will be added separately
- **No dependencies**: Pure Node.js HTTPS

## 🎯 Next Steps

1. ✅ Seed store with documents
2. ⏳ Monitor Cloud Functions enrichment
3. 🧪 Run RAG queries to verify semantic search
4. 📈 Monitor performance metrics and token usage
5. 🚀 Scale to production with real documents

## 📞 Support

For issues or questions:

1. Check [troubleshooting section](#-troubleshooting)
2. Review Google Cloud Functions logs
3. Verify firestore rules and indexes
4. Check API key permissions and quotas
