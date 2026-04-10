# 🚀 Quick Start Cheat Sheet

## ⚡ TL;DR - Run in < 5 Minutes

```bash
# 1. Set environment variables
export API_KEY="your-api-key"
export ORG_ID="your-org-id"
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"

# 2. Seed store with documents (creates ~10 random docs)
node tests/api/seed-with-firestore.js

# 3. Get the STORE_ID from output, then test queries
export STORE_ID="store-id-from-output"
node tests/api/query-rag.js
```

## 📚 API Credentials

Get your API key and credentials:

```bash
# API Key (from your project)
export API_KEY="your-firebase-api-key"

# Organization ID
export ORG_ID="your-org-id"

# Service Account (for Firestore)
export GOOGLE_APPLICATION_CREDENTIALS="$HOME/Downloads/service-account.json"
```

## 🌱 Seed Store

### Quick Seed (10 documents)

```bash
API_KEY=key ORG_ID=org \
  GOOGLE_APPLICATION_CREDENTIALS=creds.json \
  node tests/api/seed-with-firestore.js
```

### Seed with Custom Count

```bash
node tests/api/seed-with-firestore.js --documents 50
```

### Seed with Custom Store Name

```bash
node tests/api/seed-with-firestore.js \
  --store-name "My Test Store" \
  --documents 20
```

## 🧪 Query RAG

### Interactive Mode (Recommended)

```bash
API_KEY=key ORG_ID=org STORE_ID=store-abc \
  node tests/api/query-rag.js

# Then type questions at the prompt
# Try: "What is machine learning?"
# Or: press 1-10 for predefined queries
```

### Single Query (Batch Mode)

```bash
API_KEY=key ORG_ID=org STORE_ID=store-abc \
  node tests/api/query-rag.js \
  --query "What is Kubernetes?"
```

### Adjust Results Count

```bash
node tests/api/query-rag.js --topk 10  # Get top 10 instead of 5
```

## 🎯 Complete Workflow

```bash
#!/bin/bash

# 1. Setup
export API_KEY="your-key"
export ORG_ID="your-org"
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/creds.json"
cd /Users/vasanth/Documents/workspace/CosmoOps/kb

# 2. Seed store
echo "🌱 Seeding store..."
node tests/api/seed-with-firestore.js --documents 15

# 3. Copy the Store ID

# 4. Set store ID and test
export STORE_ID="paste-store-id-here"
echo "🧪 Testing queries..."
node tests/api/query-rag.js
```

## 📊 Check Enrichment Status

Monitor document enrichment in Google Cloud:

```bash
# View Cloud Functions logs
gcloud functions logs read enrichCustomDocument --limit=50

# Filter by store ID
gcloud functions logs read enrichCustomDocument | grep "store-id"

# Watch in real-time
gcloud functions logs read enrichCustomDocument --limit=50 --follow
```

## 🔧 Troubleshooting

### Missing environment variable

```bash
# Check which variables are missing
echo "API_KEY: $API_KEY"
echo "ORG_ID: $ORG_ID"
echo "STORE_ID: $STORE_ID"
```

### Credentials file not found

```bash
# Make sure path exists
ls -la /path/to/service-account.json

# Or download from Google Cloud Console
# GCP Console → Service Accounts → your-account → Keys → Download JSON
```

### Store created but no documents showing

- Wait 30-60 seconds for Cloud Functions to trigger
- Check Cloud Functions logs for errors
- Verify documents are in pending/processing status

### Queries returning empty results

- Ensure documents are enriched to "done" status
- Check if keywords and embeddings were generated
- Try a simpler query word
- Increase `--topk` value

## 📋 Script Reference

| Script                   | Purpose                     | Input                    |
| ------------------------ | --------------------------- | ------------------------ |
| `seed-with-firestore.js` | Full seeding (store + docs) | Store name, doc count    |
| `query-rag.js`           | Test RAG queries            | Store ID, queries, top-K |
| `run-tests.sh`           | Unified test runner         | Commands + options       |

## 🎓 Predefined Test Queries

When using `query-rag.js` in interactive mode, press these numbers:

1. Machine learning basics
2. Distributed systems & fault tolerance
3. Performance optimization
4. Microservices architecture
5. Cloud computing principles
6. Kubernetes container orchestration
7. API-driven development
8. Security best practices
9. Monitoring and observability
10. Database design patterns

Type your own question anytime.

## 📈 Example Output

```
🌱 Seeding Store with Random Documents

✅ Firebase initialized

📦 Creating store via API...

✅ Store created: store-wkd83hd0q

📄 Seeding 10 documents via Firestore...

[1/10] machine-learning-neural-networks-k7m2n9p
[2/10] distributed-systems-consensus-f5x8j3q
...

🎯 Store Seeding Complete

Store ID for testing: store-wkd83hd0q
```

Then test with:

```bash
export STORE_ID="store-wkd83hd0q"
node tests/api/query-rag.js
```

## 🚀 Next: Production Setup

Once testing works locally:

1. **Batch seeding**: Modify scripts to load real documents from files
2. **Performance testing**: Benchmark query latency
3. **Integration testing**: Wire into CI/CD pipeline
4. **Load testing**: Test with thousands of documents
5. **Monitoring**: Set up alerts for enrichment failures

---

**More details**: See `README.md` in this directory
