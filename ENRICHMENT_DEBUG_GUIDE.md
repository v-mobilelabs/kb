# Document Enrichment Pipeline - Debugging Guide

## Status: Metadata Not Extracted

Your documents are stuck with `status: "pending"` because the enrichment pipeline is failing silently or hitting API limits.

---

## What Was Fixed ✅

The enrichment pipeline previously had **no error handling** in critical JSON parsing steps:

1. **extract-text-summary-node.ts** — Missing try-catch on `JSON.parse()`
2. **extract-keywords-node.ts** — Missing try-catch on `JSON.parse()`
3. **generate-embedding-node.ts** — Unprotected API call with no error logging

**Result**: When Gemini API returned empty candidates or malformed JSON, nodes would silently return empty results instead of failing.

### Changes Made:

- ✅ Added try-catch blocks around JSON parsing with error logging
- ✅ Added error logging to generate-embedding-node API call
- ✅ Added comprehensive logging to enrich-file-document trigger with checkpoints
- ✅ Updated handleErrorNode to store error message in Firestore

---

## How to Debug Now

### Step 1: Check Cloud Logs

1. Go to [Firebase Console → Functions → Logs](https://console.firebase.google.com/project/knowledge-base-cosmoops/functions/logs)
2. Filter by `enrichFileDocument` function
3. Upload a test file and look for these log patterns within 30 seconds:

#### Success Path (Look for these in order):

```
[enrich-file-document] Storage event for: orgs/{orgId}/stores/{storeId}/documents/{docId}/filename.pdf
[enrich-file-document] Starting enrichment for: {docId}
[enrich-file-document] Enrichment completed for: {docId}
```

#### Failure Points (Which one appears?):

```
[enrich-file-document] Path does not match pattern: {path}
→ Issue: File uploaded to wrong storage location
→ Fix: Check GetSignedUploadUrlUseCase.getStoragePath()

[enrich-file-document] Document not found: {docId}
→ Issue: Firestore document wasn't created before upload
→ Fix: Check GetSignedUploadUrlUseCase.runTransaction()

[enrich-file-document] Document is not kind=file: {docId}
→ Issue: Document was created with wrong kind
→ Fix: Check inferDocumentKind() in lib/infer-document-kind.ts

[enrich-file-document] Document status is not pending: {docId}
→ Issue: Status is already changed (should be "pending")
→ Fix: Check if another function is racing

[enrich-file-document] Enrichment failed for {docId}: {error message}
→ Issue: Pipeline encountered error
→ Fix: See error message below
```

#### Error Messages to Look For:

```
[extract-text-summary] JSON parse error: ...
→ Gemini API returned invalid JSON
→ Verify: Content may not be extractable (e.g., binary images)
→ Check: Google Cloud quotas for Generative AI API

[extract-keywords] JSON parse error: ...
→ Same as above
→ Verify: Gemini API configuration

[generate-embedding] Failed to generate embedding: ...
→ Vertex AI embedding API call failed
→ Verify: Vertex AI API is enabled
→ Check: Project quota for embeddings

[enrichment-error] doc: {docId}, error: ...
→ Pipeline error captured in Firestore at context.error
→ Check Firestore document for exact error message
```

---

### Step 2: Check Firestore Document

1. Go to [Firebase Console → Firestore](https://console.firebase.google.com/project/knowledge-base-cosmoops/firestore)
2. Navigate to: `organizations/{yourOrg}/stores/{yourStore}/documents/{docId}`
3. Look at the `context` object:

```javascript
// ✅ SHOULD LOOK LIKE THIS (After successful enrichment):
context: {
  type: "pdf",
  path: "orgs/...",
  status: "completed",       // ← NOT "pending"
  summary: "Document summary...",
  keywords: ["keyword1", "keyword2"],
  extractedText: "Full text content...",
  mimeType: "application/pdf",
  sizeBytes: 12345,
  error: null                // ← No error
}
embedding: [0.123, -0.456, ...] // ← Array of numbers

// ❌ LOOKS LIKE THIS (Stuck/Failed):
context: {
  type: "pdf",
  path: "orgs/...",
  status: "pending",         // ← PROBLEM: Still pending
  summary: undefined,
  keywords: [],
  extractedText: null,
  mimeType: "application/pdf",
  sizeBytes: 12345,
  error: "JSON parse error..." // ← Check this message
}
embedding: null
```

---

### Step 3: Verify API Configuration

Check that these APIs are enabled in Google Cloud:

1. [Cloud Console → APIs & Services](https://console.cloud.google.com/apis/dashboard?project=knowledge-base-cosmoops)
   - ✅ Generative Language API (for Gemini)
   - ✅ Vertex AI API (for embeddings)
   - ✅ Cloud Storage API
   - ✅ Firestore API

2. Check quotas: [APIs & Services → Quotas](https://console.cloud.google.com/iam-admin/quotas?project=knowledge-base-cosmoops)
   - Filter by "Generative AI" and "Vertex"
   - Verify none are exhausted

3. Check service account has required roles:
   - Cloud Functions Service Account should have:
     - `roles/aiplatform.user` (for Vertex AI)
     - `roles/cloudfunctions.serviceAgent`

---

## Validation Checklist

### Before Testing:

- [ ] All 4 Cloud Functions show "OK" in Firebase Console
- [ ] No quota warnings in Cloud Console
- [ ] Service account has `roles/aiplatform.user`

### Testing a New Upload:

1. [ ] Upload file via app UI
2. [ ] Wait 30 seconds
3. [ ] Check Cloud Logs for enrichment events
4. [ ] Check Firestore document `context.status`
   - Should be "processing" (1-10 sec) then "completed" (success)
   - Or "failed" if error occurred
5. [ ] If failed, check `context.error` and logs

### Common Scenarios:

**Scenario A: Logs show "enrichment completed" but Firestore still pending**

- Issue: writeEnrichmentNode failed silently (unlikely after this fix)
- Action: Check full error logs for write operation
- Fix: Verify Firestore write permissions

**Scenario B: Logs show "JSON parse error" repeatedly**

- Issue: Gemini API returning empty or invalid JSON
- Action: Upload a simple document (single-page PDF)
- Check: If simple docs work, complex PDFs may need special handling
- Fix: Add validation in extract-keywords/extract-text-summary nodes

**Scenario C: Logs show "Failed to generate embedding"**

- Issue: Vertex AI embedding API not responding
- Action: Check Cloud Console quotas
- Fix: Request quota increase if exhausted

**Scenario D: No logs appear at all**

- Issue: Storage trigger not firing
- Possible causes:
  - File uploaded to wrong path (check storage path in app)
  - Function not deployed properly
  - Cloud Storage trigger not configured
- Fix: Verify storage path matches regex in enrich-file-document.ts

---

## Next Steps

### Immediate (After Deploy):

1. Upload a test file and monitor logs
2. Share the error message you see in logs
3. Check Firestore document for `context.error` field

### If Still Failing:

1. Try uploading a **simple single-page PDF** first
2. Check if issue is file-type specific (PDF vs Images, etc.)
3. Verify Gemini API key/configuration
4. Check Vertex AI embeddings API quota

### Long-term Improvements:

- Add per-node retry logic with exponential backoff
- Implement graceful degradation (skip embedding if API unavailable)
- Add webhook notifications when enrichment completes/fails
- Add document status UI showing enrichment progress

---

## Key Code Locations

| Issue                   | File                                                          | Line  |
| ----------------------- | ------------------------------------------------------------- | ----- |
| Storage trigger pattern | `functions/src/enrich-file-document.ts`                       | 10    |
| Document validation     | `functions/src/enrich-file-document.ts`                       | 15-34 |
| Text extraction         | `functions/src/nodes/extract-text-summary-node.ts`            | 35-59 |
| Keyword extraction      | `functions/src/nodes/extract-keywords-node.ts`                | 35-50 |
| Embedding generation    | `functions/src/nodes/generate-embedding-node.ts`              | 14-29 |
| Error handling          | `functions/src/nodes/handle-error-node.ts`                    | 11-23 |
| Write to Firestore      | `functions/src/nodes/write-enrichment-node.ts`                | 14-28 |
| Upload URL creation     | `src/data/stores/use-cases/get-signed-upload-url-use-case.ts` | 60-62 |

---

## Questions?

Check logs first, then share:

1. The error message from logs
2. The `context.error` value from Firestore
3. Whether the issue happens with all files or specific types
