# Enrichment Pipeline Error Analysis

## Executive Summary

The Firestore enrichment pipeline has **multiple critical failure points** that cause metadata extraction to fail silently or crash the entire pipeline. The primary issues are:

1. **Unprotected JSON parsing** in Gemini API nodes
2. **No inline error handling** in individual nodes
3. **Overly broad response validation** that masks API failures
4. **Silent failures** when API responses lack expected structure
5. **Missing API credential/quota checks** at startup

---

## Critical Failure Points

### 1. ⚠️ **HIGHEST PRIORITY: extract-text-summary-node.ts (Lines 44-57)**

**Failure Mode: Unprotected JSON.parse() + Silent Response Validation**

```typescript
const raw = response.response.candidates?.[0]?.content.parts[0]?.text ?? "{}";
const data = JSON.parse(raw) as { text?: string; summary?: string }; // NO TRY-CATCH
const extractedText = (data.text ?? "").slice(0, 10_000) || null;
const summary = data.summary ?? null;
```

**Why It Fails Silently:**

1. **If Vertex AI API response lacks expected structure** (candidates not returned, or content.parts[0] missing):
   - `raw` defaults to `"{}"`
   - `JSON.parse("{}")` succeeds silently
   - `data.text` and `data.summary` are `undefined`
   - Function returns `{ extractedText: null, summary: null }`
   - **DOCUMENT APPEARS COMPLETE BUT HAS NO EXTRACTED TEXT**

2. **If Vertex AI API returns invalid JSON or truncated response**:
   - `JSON.parse()` throws `SyntaxError`
   - Error propagates to graph executor
   - Entire enrichment workflow crashes
   - Document marked as `failed` with generic error message
   - **ROOT CAUSE IS LOST**

**Triggering Scenarios:**

- ❌ Gemini API quota exceeded
- ❌ Gemini API returns error in response (non-200 HTTP but treated as content)
- ❌ API response timeout → partial/invalid JSON
- ❌ Model fails to process document type → returns empty response
- ❌ GCS URI is invalid or file is unreadable → API returns error structure

**Recommended Fix:**

```typescript
try {
  const raw = response.response.candidates?.[0]?.content.parts[0]?.text ?? "{}";
  const data = JSON.parse(raw) as { text?: string; summary?: string };
  if (!response.response.candidates || !response.response.candidates[0]) {
    throw new Error(
      `Gemini API returned no candidates: ${JSON.stringify(response.response)}`,
    );
  }
  if (!data.text && !data.summary) {
    console.warn(`Gemini returned empty extraction for: ${state.name}`);
  }
  const extractedText = (data.text ?? "").slice(0, 10_000) || null;
  const summary = data.summary ?? null;
  return { extractedText, summary };
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  throw new Error(`extract-text-summary failed: ${message}`);
}
```

---

### 2. ⚠️ **CRITICAL: extract-keywords-node.ts (Lines 40-49)**

**Failure Mode: Identical to extract-text-summary-node**

```typescript
const raw = response.response.candidates?.[0]?.content.parts[0]?.text ?? "{}";
const data = JSON.parse(raw) as { keywords?: string[] }; // NO TRY-CATCH
const keywords = (data.keywords ?? [])
  .filter((k): k is string => typeof k === "string")
  .slice(0, 20)
  .map((k) => k.toLowerCase());
```

**Why It Fails:**

- **Silent failure if API returns no candidates**: Returns empty `[]`
- **Crash if API returns invalid JSON**: `JSON.parse()` throws
- **No validation of keyword format**: If model returns non-string values, they're filtered out silently

**Silent Failure Scenario:**

```
1. Document uploaded
2. extract-text-summary succeeds but returns { extractedText: null, summary: null }
3. extract-keywords called with null summary
4. Gemini API receives sparse context → returns empty response
5. raw = "{}", JSON.parse succeeds
6. data.keywords = undefined
7. Result: keywords = []
8. Document completed with ZERO metadata
```

---

### 3. ⚠️ **HIGH PRIORITY: generate-embedding-node.ts (Lines 15-17)**

**Failure Mode: Unprotected API Call + No Error Recovery**

```typescript
const parts = [state.summary, state.extractedText].filter(Boolean).join("\n");
if (!parts) {
  return { embedding: null };
}
const embedding = await getEmbedding(parts); // NO TRY-CATCH, CAN THROW
```

**Why It Fails:**

- **If text-summary extraction returned null values**: `parts` is empty, embedding skipped (OK)
- **If Vertex AI embedding API fails**:
  - `getEmbedding()` throws `Error` from [vertex-ai.ts:65-69](functions/src/lib/vertex-ai.ts#L65-L69)
  - Error propagates to workflow
  - Entire document marked failed

**API Failure Triggers:**

- ❌ Embedding API quota exceeded (HTTP 429)
- ❌ Invalid authentication token
- ❌ Text exceeds 8000 char limit (though code truncates it)
- ❌ Network timeout during embedding request

---

### 4. ⚠️ **MODERATE: index-in-vertex-rag-node.ts (Lines 47, 59)**

**Failure Mode: Explicit Error Throws (At Least It's Visible)**

```typescript
if (!res.ok) {
  throw new Error(`RAG API ${path} failed: ${res.status} ${await res.text()}`);
}
```

**Why It Fails:**

- Better than silent failures, but errors still crash the workflow
- No retry logic
- No degradation mode

**Common Failures:**

- ❌ RAG corpus creation fails (permissions, quota)
- ❌ File import fails (file too large, unsupported format)
- ❌ Vertex RAG API temporarily down → entire document fails

---

## Architectural Issues

### Issue 1: No Inline Error Handling in Node Definitions

**Current Architecture:**

```
enrichFileDocument (try-catch)
  └─ fileEnrichmentGraph.invoke()
      ├─ setProcessing ✓
      ├─ inferKind ✓
      ├─ extractTextAndSummary ← CRASH POINT
      ├─ extractKeywords ← CRASH POINT
      ├─ generateEmbedding ← CRASH POINT
      ├─ indexInVertexRag ← CRASH POINT
      └─ writeEnrichment
```

**Problem:** If any node throws, the entire workflow halts and document is marked `failed`. There's **NO per-node error recovery**.

**Better Architecture:**

```
Each node should:
1. Wrap API calls in try-catch
2. Log detailed error context
3. Return graceful degradation (null values)
4. Propagate recoverable errors only
```

### Issue 2: Silent Failures via Response Structure Validation

**Current Approach:**

```typescript
const raw = response.response.candidates?.[0]?.content.parts[0]?.text ?? "{}";
```

**Problem:**

- Optional chaining (`?.`) masks API failures
- Defaults to `"{}"` which is valid JSON but empty
- No distinction between "API returned empty data" and "API failed"
- Downstream logic can't differentiate

**Better Approach:**

```typescript
const candidates = response.response.candidates;
if (!candidates || candidates.length === 0) {
  throw new Error(
    "Gemini API returned no candidates (possible quota/permission issue)",
  );
}
const parts = candidates[0]?.content?.parts;
if (!parts || parts.length === 0) {
  throw new Error("Gemini API returned no content parts");
}
const raw = parts[0]?.text;
if (!raw) {
  throw new Error("Gemini API returned empty text field");
}
```

---

## Root Cause Summary

### Most Likely Failure Scenario (Silent Metadata Loss):

```
1. Document uploaded to GCS
2. enrichFileDocument triggered
3. extract-text-summary called
   → Gemini quota exceeded OR
   → Invalid GCS URI OR
   → File format unreadable
   → API returns error response OR empty candidates
4. raw = "{}" (silent default)
5. JSON.parse succeeds with empty object
6. { extractedText: null, summary: null } returned
7. extract-keywords called with null inputs
8. Gemini returns sparse/empty response
9. keywords = [] (no error thrown!)
10. generate-embedding skipped (no text)
11. Document marked "completed"
12. **User sees document with ZERO metadata - no error indication**
```

### Second Most Likely Scenario (Complete Failure):

```
1-4. Same as above but API returns malformed JSON
5. JSON.parse() throws SyntaxError
6. Error caught by enrichFileDocument try-catch
7. Document marked failed
8. Error message doesn't indicate which node failed or why
```

---

## What You Should Verify

### 1. **Check Vertex AI Quotas**

```bash
# In Google Cloud Console:
# 1. Go to APIs & Services → Quotas
# 2. Filter by: "Generative AI", "Vertex AI"
# 3. Check quotas for:
#    - Gemini Flash API (generativeai.googleapis.com)
#    - Text Embedding API
#    - Vertex RAG API
```

### 2. **Check Service Account Permissions**

```bash
# Verify service account has these roles:
# - roles/aiplatform.admin (for RAG)
# - roles/aiplatform.serviceAgent
# - roles/storage.objectViewer (for GCS files)
# - roles/cloudaicompanion.userInitiated (for Gemini)
```

### 3. **Check Firestore Logs**

```bash
firebase functions:log

# Look for patterns like:
# "[enrich-file-document] Enrichment failed for docId: ..."
# This indicates the ENTIRE workflow crashed
```

### 4. **Check Function Logs with Detailed Filtering**

```bash
gcloud functions logs read enrichFileDocument --limit 50 --format json | \
  jq '.[] | select(.severity == "ERROR") | {timestamp, textPayload}'
```

### 5. **Manually Test API Calls**

```bash
# Test Gemini API
curl -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=$GOOGLE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [{"text": "Hello"}]
    }]
  }'

# Test Vertex AI Embedding
gcloud ai models predict \
  --model=text-embedding-004 \
  --region=us-central1 \
  --json-request=- << EOF
{
  "instances": [{"content": "test text"}]
}
EOF
```

---

## Specific Fix Recommendations

### Fix 1: Add Try-Catch to extract-text-summary-node.ts

**File:** [functions/src/nodes/extract-text-summary-node.ts](functions/src/nodes/extract-text-summary-node.ts#L44-L57)

**Change Lines 44-57:**

```typescript
try {
  const raw = response.response.candidates?.[0]?.content.parts[0]?.text ?? "";

  if (!raw) {
    console.warn(
      `Gemini returned no text for ${state.name}. candidates: ${response.response.candidates?.length}`,
    );
    return { extractedText: null, summary: null };
  }

  const data = JSON.parse(raw) as { text?: string; summary?: string };
  const extractedText = (data.text ?? "").slice(0, 10_000) || null;
  const summary = data.summary ?? null;
  return { extractedText, summary };
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  throw new Error(`extract-text-summary failed for ${state.name}: ${message}`);
}
```

### Fix 2: Add Try-Catch to extract-keywords-node.ts

**File:** [functions/src/nodes/extract-keywords-node.ts](functions/src/nodes/extract-keywords-node.ts#L40-L49)

```typescript
try {
  const raw = response.response.candidates?.[0]?.content.parts[0]?.text ?? "";

  if (!raw) {
    console.warn(
      `Gemini returned no keywords for ${state.name}. candidates: ${response.response.candidates?.length}`,
    );
    return { keywords: [] };
  }

  const data = JSON.parse(raw) as { keywords?: string[] };
  const keywords = (data.keywords ?? [])
    .filter((k): k is string => typeof k === "string")
    .slice(0, 20)
    .map((k) => k.toLowerCase());
  return { keywords };
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  throw new Error(`extract-keywords failed for ${state.name}: ${message}`);
}
```

### Fix 3: Add Try-Catch to generate-embedding-node.ts

**File:** [functions/src/nodes/generate-embedding-node.ts](functions/src/nodes/generate-embedding-node.ts)

```typescript
export async function generateEmbeddingNode(
  state: GenerateEmbeddingInput,
): Promise<GenerateEmbeddingOutput> {
  try {
    const parts = [state.summary, state.extractedText]
      .filter(Boolean)
      .join("\n");
    if (!parts) {
      return { embedding: null };
    }
    const embedding = await getEmbedding(parts);
    return { embedding };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`generate-embedding failed: ${message}`);
    throw new Error(`Embedding API failed: ${message}`);
  }
}
```

### Fix 4: Enhance Response Validation in vertex-ai.ts

**File:** [functions/src/lib/vertex-ai.ts](functions/src/lib/vertex-ai.ts#L45-L70)

```typescript
export async function getEmbedding(text: string): Promise<number[]> {
  if (process.env.FUNCTIONS_EMULATOR === "true") {
    return new Array(768).fill(0);
  }

  try {
    const project = getProject();
    const location = getLocation();
    const auth = new GoogleAuth({
      scopes: "https://www.googleapis.com/auth/cloud-platform",
    });
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    const base = `https://${location}-aiplatform.googleapis.com/v1`;
    const endpoint =
      `${base}/projects/${project}/locations/${location}` +
      "/publishers/google/models/text-embedding-004:predict";

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        instances: [{ content: text.slice(0, 8000) }],
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Embedding API error ${response.status}: ${await response.text()}`,
      );
    }

    const data = (await response.json()) as {
      predictions?: [{ embeddings: { values: number[] } }];
    };

    if (!data.predictions || !data.predictions[0]) {
      throw new Error("Embedding API returned no predictions");
    }

    return data.predictions[0].embeddings.values;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`getEmbedding failed: ${message}`);
    throw new Error(`Text embedding failed: ${message}`);
  }
}
```

---

## Summary Table

| Node                     | Line  | Failure Type           | Silent? | Impact                             | Fix Priority |
| ------------------------ | ----- | ---------------------- | ------- | ---------------------------------- | ------------ |
| extract-text-summary     | 44-57 | Unprotected JSON.parse | Yes/No  | ⭐⭐⭐⭐⭐ Full metadata loss      | P0           |
| extract-keywords         | 40-49 | Unprotected JSON.parse | Yes/No  | ⭐⭐⭐⭐⭐ Zero tags               | P0           |
| generate-embedding       | 15-17 | Unprotected API call   | No      | ⭐⭐⭐⭐ No embeddings             | P1           |
| index-in-vertex-rag      | 47,59 | API errors explicit    | No      | ⭐⭐⭐ No RAG indexing             | P1           |
| prepareTextNode (custom) | 24-26 | JSON.parse unprotected | Yes     | ⭐⭐⭐ Custom doc extraction fails | P1           |

---

## Verification Checklist

- [ ] Check Vertex AI quota usage in Google Cloud Console
- [ ] Verify service account has required IAM roles
- [ ] Review Cloud Function logs for recent error patterns
- [ ] Test Gemini API with sample document using gcloud CLI
- [ ] Test Vertex AI embedding API manually
- [ ] Deploy all 4 recommended fixes above
- [ ] Monitor error logs after fixes for 24 hours
- [ ] If still failing, enable debug logging and capture full API responses
