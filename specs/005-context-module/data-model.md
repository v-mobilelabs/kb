# Data Model: Context Module

**Feature**: 005-context-module  
**Created**: 2026-04-13  
**Status**: Schema Definition  
**Databases**: Firestore (contexts) + RTDB (documents)

---

## Overview

The Context Module uses a **hybrid database strategy**:

- **Firestore** (`/organizations/{orgId}/contexts/{contextId}`): Context metadata, collected at organization level with transactional safety
- **RTDB** (`/contexts/{contextId}/documents/{docId}`): Context documents, organized by context ID for real-time access and subscriptions

This separation enables:

- **ACID transactions** on context operations (create/update/delete) via Firestore
- **Real-time, low-latency** document access and subscriptions via RTDB
- **Independent scaling**: Each database scales to its specific access pattern
- **Granular security**: Organization scope in Firestore, context scope in RTDB

---

## Firestore Collection: `/organizations/{orgId}/contexts`

### Document Structure

```typescript
interface Context {
  // Identity
  id: string; // Auto-generated Firestore document ID (UUID-like)
  orgId: string; // Organization ID (from path + session context)

  // Core Fields (from FR-001, FR-002)
  name: string; // 1-100 characters; NOT unique within org
  windowSize: number | null; // Optional; positive integer; null = unbounded (FR-002)

  // Metadata & Audit (FR-018)
  createdAt: Timestamp; // Server timestamp at creation
  updatedAt: Timestamp; // Server timestamp at last modification
  createdBy: string; // User ID (from session.user.id)

  // Denormalized Stats (FR-015)
  documentCount: number; // Count of documents in this context (denormalized)
  // Incremented when document added; decremented on delete

  // Future: Optional Fields (extensibility)
  metadata?: {
    description?: string; // Optional description (up to 500 chars, future)
    tags?: string[]; // Optional labels (future)
  };

  // Soft Delete (optional, for compliance)
  deletedAt?: Timestamp; // If present, context is logically deleted (optional)
}
```

### Firestore Indexes

**Index 1: List Contexts by Organization & Date**

```
Collection: /organizations/{orgId}/contexts
Fields:
  - orgId (Ascending)
  - updatedAt (Descending)
Reason: FR-003 listing with "newest first" default sort
```

**Index 2: List Contexts by Organization & Name**

```
Collection: /organizations/{orgId}/contexts
Fields:
  - orgId (Ascending)
  - name (Ascending)
Reason: FR-018 name-based search (future use)
```

**Index 3: List Contexts by Document Count**

```
Collection: /organizations/{orgId}/contexts
Fields:
  - orgId (Ascending)
  - documentCount (Descending)
Reason: Future filtering/sorting by item count
```

**Auto-created Indexes**:

- Single-field indexes on all fields (auto-created by Firestore)

### Firestore Rules

```firestore-rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Organization context scoping
    match /organizations/{orgId}/contexts/{contextId} {

      // READ: User must be authenticated and belong to orgId
      allow read: if request.auth != null &&
                     request.auth.customClaims.orgId == orgId;

      // CREATE: User must create in their own org; name must be 1-100 chars
      allow create: if request.auth != null &&
                       request.resource.data.orgId == orgId &&
                       request.auth.customClaims.orgId == orgId &&
                       request.resource.data.name is string &&
                       request.resource.data.name.size() > 0 &&
                       request.resource.data.name.size() <= 100 &&
                       (request.resource.data.windowSize == null ||
                        (request.resource.data.windowSize is number &&
                         request.resource.data.windowSize > 0)) &&
                       request.resource.data.documentCount == 0;

      // UPDATE: User must belong to orgId; can update name/windowSize
      allow update: if request.auth != null &&
                       resource.data.orgId == orgId &&
                       request.auth.customClaims.orgId == orgId &&
                       (request.resource.data.name is string &&
                        request.resource.data.name.size() > 0 &&
                        request.resource.data.name.size() <= 100) &&
                       (request.resource.data.windowSize == null ||
                        (request.resource.data.windowSize is number &&
                         request.resource.data.windowSize > 0));

      // DELETE: User must belong to orgId
      allow delete: if request.auth != null &&
                       resource.data.orgId == orgId &&
                       request.auth.customClaims.orgId == orgId;
    }
  }
}
```

### Query Patterns

#### Create Context

```javascript
db.collection("organizations").doc(orgId).collection("contexts").add({
  orgId,
  name: "My Context",
  windowSize: 4096,
  documentCount: 0,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  createdBy: userId,
});
```

#### List Contexts (Paginated with Cursor)

```javascript
// Initial query
let query = db
  .collection("organizations")
  .doc(orgId)
  .collection("contexts")
  .orderBy("updatedAt", "desc")
  .limit(25);

let snapshot = await query.get();
let items = snapshot.docs.map((doc) => doc.data());
let lastDoc = snapshot.docs[snapshot.docs.length - 1];
let nextCursor = lastDoc ? `${lastDoc.data().updatedAt}|${lastDoc.id}` : null;

// Next page: start after last document
if (nextCursor) {
  const [timestamp, docId] = nextCursor.split("|");
  const lastDocSnap = await db
    .collection("organizations")
    .doc(orgId)
    .collection("contexts")
    .doc(docId)
    .get();

  query = query.startAfter(lastDocSnap).limit(25);
  snapshot = await query.get();
  items = snapshot.docs.map((doc) => doc.data());
}
```

#### Update Context with Transaction (FR-019 Conflict Detection)

```javascript
await db.runTransaction(async (transaction) => {
  const contextRef = db
    .collection("organizations")
    .doc(orgId)
    .collection("contexts")
    .doc(contextId);

  // Read current state
  const contextSnap = await transaction.get(contextRef);
  if (!contextSnap.exists) throw new Error("Not found");

  const currentData = contextSnap.data();

  // Check for conflicts: if field has changed since client read, abort
  if (currentData.name !== clientReadData.name) {
    throw new Error("Conflict: name was modified");
  }

  // Validation
  if (inputData.name.length < 1 || inputData.name.length > 100) {
    throw new Error("Validation: name must be 1-100 chars");
  }

  // Update
  transaction.update(contextRef, {
    name: inputData.name,
    windowSize: inputData.windowSize,
    updatedAt: serverTimestamp(),
  });
});
```

#### Delete Context with Cascade (Async)

```javascript
// Server action
await db.runTransaction(async (transaction) => {
  const contextRef = db
    .collection("organizations")
    .doc(orgId)
    .collection("contexts")
    .doc(contextId);

  const contextSnap = await transaction.get(contextRef);
  if (!contextSnap.exists) throw new Error("Not found");

  // Delete Firestore document
  transaction.delete(contextRef);

  // Trigger Cloud Function for RTDB cleanup
  // (documented below)
});

// Cloud Function (triggered by Firestore delete)
export const onContextDeleted = functions.firestore
  .document("/organizations/{orgId}/contexts/{contextId}")
  .onDelete(async (snap, context) => {
    const { contextId } = context.params;

    // Delete all RTDB documents in this context
    await realtimeDb.ref(`/contexts/${contextId}/documents`).remove();

    // Delete access grants
    const snapshot = await realtimeDb
      .ref(`/contextAccessControl`)
      .limitToChild(contextId)
      .once("value");

    for (const userId of Object.keys(snapshot.val() || {})) {
      await realtimeDb
        .ref(`/contextAccessControl/${userId}/${contextId}`)
        .remove();
    }
  });
```

---

## RTDB Paths: `/contexts/{contextId}/documents`

### Document Structure

```typescript
interface Document {
  // Identity
  id: string; // Unique within context; generated as UUID
  contextId: string; // Parent context ID (must match path)

  // Content (from FR-009)
  name?: string; // Optional user-provided identifier
  metadata?: Record<string, any>; // Flexible JSON structure (conversation turn, etc.)

  // Audit (FR-018)
  createdAt: number; // Unix timestamp (milliseconds); RTDB native
  updatedAt: number; // Unix timestamp (milliseconds); last modification
  createdBy: string; // User ID from session
}
```

### RTDB Path Structure

```
/contexts/
  {contextId}/
    documents/
      {docId1}/
        id: "docId1"
        contextId: "{contextId}"
        name: "conversation-turn-1"
        metadata:
          role: "user"
          content: "Hello, what is this context about?"
        createdAt: 1713018000123
        updatedAt: 1713018000123
        createdBy: "user123"

      {docId2}/
        id: "docId2"
        contextId: "{contextId}"
        name: "conversation-turn-2"
        metadata:
          role: "assistant"
          content: "This context manages conversation state..."
        createdAt: 1713018005234
        updatedAt: 1713018005234
        createdBy: "user123"
```

### RTDB Security Rules

```json
{
  "rules": {
    "contexts": {
      "{contextId}": {
        // Only users with access grant can read/write this context
        ".read": "root.child('contextAccessControl').child(auth.uid).child($contextId).exists()",
        ".write": "root.child('contextAccessControl').child(auth.uid).child($contextId).exists()",

        "documents": {
          "{docId}": {
            // Validate document structure
            ".validate": "newData.hasChildren(['id', 'contextId', 'createdAt', 'updatedAt', 'createdBy'])",

            // Validate id matches path
            "id": {
              ".validate": "newData.val() == $docId"
            },

            // Validate contextId matches parent
            "contextId": {
              ".validate": "newData.val() == $contextId"
            },

            // Optional fields: name, metadata
            "name": {
              ".validate": "!newData.exists() || newData.isString()"
            },
            "metadata": {
              ".validate": "!newData.exists() || newData.isString() || newData.val() is object"
            },

            // Timestamps must be valid Unix timestamps
            "createdAt": {
              ".validate": "newData.isNumber() && newData.val() > 0"
            },
            "updatedAt": {
              ".validate": "newData.isNumber() && newData.val() > 0"
            },

            // createdBy must be a string
            "createdBy": {
              ".validate": "newData.isString() && newData.val().length > 0"
            }
          }
        }
      }
    },

    // Access control table: {userId} → {contextId} → true
    "contextAccessControl": {
      "{userId}": {
        ".read": "auth.uid == $userId",
        ".write": "auth.uid == $userId",
        "{contextId}": {
          ".validate": "newData.val() === true"
        }
      }
    }
  }
}
```

### Query Patterns

#### Create Document

```javascript
const docId = uuid();
const now = Date.now();

await realtimeDb.ref(`/contexts/${contextId}/documents/${docId}`).set({
  id: docId,
  contextId,
  name: input.name || null,
  metadata: input.metadata || {},
  createdAt: now,
  updatedAt: now,
  createdBy: userId,
});
```

#### List Documents with Sort & Pagination

```typescript
// Fetch all documents (client-side pagination)
const snapshot = await realtimeDb
  .ref(`/contexts/${contextId}/documents`)
  .orderByChild("createdAt") // Sort by creation time
  .limitToFirst(500) // Fetch up to 500 (adjust as needed)
  .once("value");

const allDocs = [];
snapshot.forEach((childSnap) => {
  allDocs.push(childSnap.val());
});

// Client-side sorting (after fetch)
const sortedDocs = allDocs.sort((a, b) => {
  if (sortField === "name") {
    return direction === "asc"
      ? a.name.localeCompare(b.name)
      : b.name.localeCompare(a.name);
  } else if (sortField === "createdAt") {
    return direction === "asc"
      ? a.createdAt - b.createdAt
      : b.createdAt - a.createdAt;
  }
  // ... other sort fields
});

// Client-side filtering (exact match by docId)
if (filterId) {
  const filtered = sortedDocs.filter((doc) => doc.id === filterId);
  return filtered;
}

// Client-side pagination
const pageSize = 25;
const startIdx = (page - 1) * pageSize;
const endIdx = startIdx + pageSize;
const pageDocs = sortedDocs.slice(startIdx, endIdx);
const hasNext = endIdx < sortedDocs.length;

return { items: pageDocs, hasNext };
```

#### Get Single Document

```javascript
const snapshot = await realtimeDb
  .ref(`/contexts/${contextId}/documents/${docId}`)
  .once("value");

if (!snapshot.exists()) {
  throw new Error("Document not found");
}

const doc = snapshot.val();
```

#### Update Document

```javascript
await realtimeDb.ref(`/contexts/${contextId}/documents/${docId}`).update({
  name: input.name,
  metadata: input.metadata,
  updatedAt: Date.now(),
});
```

#### Delete Document

```javascript
await realtimeDb.ref(`/contexts/${contextId}/documents/${docId}`).remove();
```

#### Real-Time Subscription (Optional - Phase 6)

```javascript
const unsubscribe = realtimeDb
  .ref(`/contexts/${contextId}/documents`)
  .on("value", (snapshot) => {
    const documents = [];
    snapshot.forEach((childSnap) => {
      documents.push(childSnap.val());
    });
    // Update UI with live documents
    setDocumentsInState(documents);
  });

// Cleanup subscription on unmount
// unsubscribe();
```

---

## Access Control Flow

### Context Access Grant

When a context is created or accessed, the system grants the user access via:

```
/contextAccessControl/{userId}/{contextId} = true
```

**When Created**:

```javascript
// In createContext() action
await realtimeDb.ref(`/contextAccessControl/${userId}/${contextId}`).set(true);
```

**When Deleted**:

```javascript
// In onContextDeleted Cloud Function
// Remove all user access grants for this context
const snapshot = await realtimeDb.ref(`/contextAccessControl`).once("value");

for (const userKey of Object.keys(snapshot.val() || {})) {
  await realtimeDb
    .ref(`/contextAccessControl/${userKey}/${contextId}`)
    .remove();
}
```

**On Document Access**:

- RTDB rules check: `contextAccessControl[auth.uid][contextId]` exists
- If missing → access denied (403)
- If present → read/write allowed

---

## Data Consistency

### Denormalization: `documentCount`

The `documentCount` field in Firestore Context documents is **denormalized** (can become out-of-sync with actual RTDB documents).

**Why**:

- RTDB documents are independent; no foreign key constraints
- Query efficiency: Display count without iterating RTDB
- Transactional consistency at Firestore level

**Consistency Guarantee**:

- On every `createDocument()` or `deleteDocument()`, increment/decrement in **same Firestore transaction**
- If RTDB delete succeeds but Firestore transaction fails → count is stale
- **Remediation**: Periodic reconciliation job (Cloud Scheduler) to verify counts match actual doc count

**Reconciliation Job** (optional, post-v1):

```javascript
export const reconcileContextCounts = functions.pubsub
  .schedule("every 24 hours")
  .onRun(async (context) => {
    // For each context in Firestore
    const contextsSnap = await db.collectionGroup("contexts").get(); // collectionGroup query across all /organizations/{orgId}/contexts

    for (const contextDoc of contextsSnap.docs) {
      // Count actual documents in RTDB
      const docsSnap = await realtimeDb
        .ref(`/contexts/${contextDoc.id}/documents`)
        .once("value");
      const actualCount = docsSnap.numChildren();

      // Compare and update if mismatch
      if (contextDoc.data().documentCount !== actualCount) {
        await contextDoc.ref.update({ documentCount: actualCount });
        console.log(
          `Reconciled ${contextDoc.id}: ${contextDoc.data().documentCount} → ${actualCount}`,
        );
      }
    }
  });
```

---

## Timestamps & Timezone Handling

### Firestore Timestamps

- Type: `Timestamp` (server-generated via `serverTimestamp()`)
- Timezone: UTC
- Precision: Milliseconds
- Serialization: Converted to ISO 8601 string in JSON responses

### RTDB Timestamps

- Type: Unix timestamp (milliseconds)
- Timezone: UTC (implicit)
- Precision: Milliseconds
- Serialization: Number

**Client-side Display**:

```typescript
const formatTimestamp = (ts: number | Timestamp): string => {
  const ms = ts instanceof Timestamp ? ts.toMillis() : ts;
  return new Date(ms).toLocaleString();
};
```

---

## Scalability Considerations

### Firestore (`/organizations/{orgId}/contexts`)

- **Read Scalability**: Indexed queries handle 1M+ documents efficiently
- **Write Scalability**: Transactions limited to ~25 writes per transaction; for bulk operations, batch (max 500 docs per batch)
- **Growth**: One context document ≈ 1 KB; 1M contexts ≈ 1 GB

### RTDB (`/contexts/{contextId}/documents`)

- **Read Scalability**: RTDB downloads full path on read; limit queries to < 10K document paths per context
- **Write Scalability**: No transactions; eventually consistent; concurrent writes are safe
- **Growth**: One document ≈ 1 KB; 1M documents per context exceeds practical limits; split across multiple contexts

**Practical Limits for v1**:

- Contexts per org: Unlimited (Firestore scales to billions)
- Documents per context: Up to 500K (RTDB path size limits; pagination reduces client-side load)
- Concurrent users: No hard limit; scale with Firestore/RTDB provisioned capacity

---

## Backup & Recovery

### Firestore Backup

- Automatic daily backups via Firebase
- Manual export via `gcloud firestore export` to Cloud Storage

### RTDB Backup

- Automatic daily backups via Firebase
- Manual export via Firebase Console → Backup

### Recovery Procedure

1. Restore from Firebase Console backup
2. Verify data integrity
3. Reconcile `documentCount` values (if needed)
4. Verify access grants in `/contextAccessControl`

---

## Migration Path (Future)

If document volume grows beyond RTDB practical limits:

1. **Phase 1**: Migrate documents to Firestore subcollection: `/organizationanizations/{orgId}/contexts/{contextId}/documents/{docId}`
2. **Phase 2**: Update security rules to reference Firestore instead of RTDB
3. **Phase 3**: Update server actions to query Firestore for documents
4. **Phase 4**: Decommission RTDB path

Cost/performance tradeoff: Firestore reads are more expensive but handle larger scale.
