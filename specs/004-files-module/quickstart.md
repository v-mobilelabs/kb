# Files Module: Quick Start & Testing Guide

**Module**: 004-files-module  
**Last Updated**: 2026-04-13  
**Feature Branch**: `004-files-module`

---

## API Overview

### Endpoints

| Method | Endpoint                        | Purpose                                        |
| ------ | ------------------------------- | ---------------------------------------------- |
| GET    | `/api/files`                    | List files (paginated, searchable, filterable) |
| POST   | `/api/files`                    | Upload a file (multipart form)                 |
| GET    | `/api/files/{fileId}`           | Get file metadata                              |
| GET    | `/api/files/{fileId}/download`  | Get signed download URL (15-min expiry)        |
| GET    | `/api/files/{fileId}/thumbnail` | Get thumbnail or SVG fallback icon             |
| DELETE | `/api/files/{fileId}`           | Delete file (Firestore + Storage atomicity)    |

### Query Parameters (GET /api/files)

```
search=<prefix>              # Prefix match on originalName (case-insensitive)
sort=<name|createdAt|size>   # Sort field
order=<asc|desc>             # Sort direction
kinds=<kind1,kind2>          # Comma-separated file kinds (OR logic)
cursor=<opaque>              # Cursor for pagination
limit=<1-100>                # Items per page (default 25)
```

---

## Security Rules Testing

### Rule Definition

**Firestore Security Rules** (in `firestore.rules`):

```firestore
match /organizations/{orgId}/files/{fileId} {
  allow read, create, update, delete: if isOrgMember(orgId);
}

function isOrgMember(orgId) {
  return request.auth != null
    && exists(/databases/{default}/documents/organizations/{orgId}/members/{request.auth.uid});
}
```

**Storage Security Rules** (in `storage.rules`):

```plaintext
match /organizations/{orgId}/files/{allPaths=**} {
  // Only org members can read/write files in their org's bucket
  allow read, write: if request.auth != null
    && request.auth.token.orgId == orgId;
}
```

### Manual Test Cases

#### Test 1: Org Member — Can Read Own Org's Files

**Setup**:

1. Create two organisations: `org-a` and `org-b`
2. Add user `alice@example.com` to `org-a`
3. Upload a file to `org-a` → Firestore document at `/organizations/org-a/files/{fileId}`

**Test**:

```javascript
// Authenticate as Alice (org-a member)
const db = getFirestore();
const fileRef = doc(db, "organizations", "org-a", "files", "{fileId}");
const snap = await getDoc(fileRef);
// Expected: ✅ Success — Alice can read her org's file
```

**Pass Criteria**: Document read succeeds, file data is returned.

---

#### Test 2: Non-Org Member — Cannot Read Other Org's Files

**Setup**:

1. File already exists in `org-a` (from Test 1)
2. User `bob@example.com` belongs only to `org-b` (not `org-a`)

**Test**:

```javascript
// Authenticate as Bob (org-b member, not org-a)
const db = getFirestore();
const fileRef = doc(db, "organizations", "org-a", "files", "{fileId}");
try {
  const snap = await getDoc(fileRef);
  // Expected: ❌ Failure — Permission denied
} catch (e) {
  console.log("Expected permission-denied error:", e.code);
}
```

**Pass Criteria**: Firestore throws `permission-denied` error; no cross-org data access.

---

#### Test 3: Deleted User — Cannot Access Files After Removal

**Setup**:

1. User `charlie@example.com` is member of `org-c`, has files
2. Remove Charlie from `org-c` members list → delete `/organizations/org-c/members/charlie-uid`

**Test**:

```javascript
// Authenticate as Charlie (now deactivated from org)
const db = getFirestore();
const fileRef = doc(db, "organizations", "org-c", "files", "{fileId}");
try {
  const snap = await getDoc(fileRef);
  // Expected: ❌ Failure — No longer a member
} catch (e) {
  console.log("Expected permission-denied:", e.code);
}
```

**Pass Criteria**: `permission-denied` error even though Charlie is still authenticated; org membership check fails.

---

#### Test 4: Unauthenticated User — Cannot Access Files

**Test**:

```javascript
// No authentication
const db = getFirestore();
const fileRef = doc(db, "organizations", "org-a", "files", "{fileId}");
try {
  const snap = await getDoc(fileRef);
  // Expected: ❌ Failure — Unauthenticated
} catch (e) {
  console.log("Expected permission-denied:", e.code);
}
```

**Pass Criteria**: `permission-denied` error; public access is blocked.

---

### Automated Test Case (Vitest)

```typescript
// tests/security/files-security.test.ts (pseudocode)

import { describe, it, expect } from "vitest";
import { getDoc, doc, collection } from "firebase-admin/firestore";
import { admin } from "@/lib/firebase/admin-firestore";

describe("Files Module — Firestore Security Rules", () => {
  it("T040: Org member can read own org files", async () => {
    // Setup: Alice in org-a with a file
    const aliceDb = getFirestore(); // authenticated as Alice, org-a
    const fileRef = doc(aliceDb, "organizations", "org-a", "files", fileId);

    const snap = await getDoc(fileRef);
    expect(snap.exists()).toBe(true);
    expect(snap.data()?.orgId).toBe("org-a");
  });

  it("T040: Non-member cannot read other org files", async () => {
    // Setup: Bob in org-b tries to read org-a file
    const bobDb = getFirestore(); // authenticated as Bob, org-b
    const fileRef = doc(bobDb, "organizations", "org-a", "files", fileId);

    await expect(getDoc(fileRef)).rejects.toThrow("permission-denied");
  });

  it("T040: Unauthenticated user cannot read files", async () => {
    // No auth
    const unauthDb = getFirestore(); // no authentication
    const fileRef = doc(unauthDb, "organizations", "org-a", "files", fileId);

    await expect(getDoc(fileRef)).rejects.toThrow("permission-denied");
  });
});
```

---

## API Usage Examples

### Example 1: Upload a File

```bash
curl -X POST http://localhost:3000/api/files \
  -H "Authorization: Bearer <SESSION_TOKEN>" \
  -F "file=@report.pdf"
```

**Response** (201 Created):

```json
{
  "file": {
    "id": "f1a2b3c4-d5e6-f7g8-h9i0-j1k2l3m4n5o6",
    "orgId": "org-123",
    "originalName": "report.pdf",
    "fileName": "f1a2b3c4.pdf",
    "size": 102400,
    "mimeType": "application/pdf",
    "kind": "pdf",
    "uploadedBy": "user-uid",
    "createdAt": "2026-04-13T10:30:00Z"
  }
}
```

---

### Example 2: List Files with Filters

```bash
# Search prefix "annual", filter for PDF and DOC, sort by date newest
curl "http://localhost:3000/api/files?search=annual&kinds=pdf,doc&sort=createdAt&order=desc&limit=25" \
  -H "Authorization: Bearer <SESSION_TOKEN>"
```

**Response** (200 OK):

```json
{
  "files": [
    {
      "id": "f1a2b3c4-...",
      "orgId": "org-123",
      "originalName": "Annual Report 2026.pdf",
      "fileName": "f1a2b3c4.pdf",
      "size": 2097152,
      "mimeType": "application/pdf",
      "kind": "pdf",
      "uploadedBy": "user-uid",
      "createdAt": "2026-04-13T10:30:00Z"
    },
    {
      "id": "a1b2c3d4-...",
      "orgId": "org-123",
      "originalName": "Annual Budget Document.docx",
      "fileName": "a1b2c3d4.docx",
      "size": 512000,
      "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "kind": "doc",
      "uploadedBy": "user-uid",
      "createdAt": "2026-04-10T14:20:00Z"
    }
  ],
  "nextCursor": "eyJpZCI6ImExYjJjM2Q0LWUuLi4iLCJzb3J0VmFsdWUiOjE3NDQ3NjQwMDB9",
  "total": 12
}
```

---

### Example 3: Get Download URL

```bash
curl "http://localhost:3000/api/files/f1a2b3c4-d5e6-f7g8-h9i0-j1k2l3m4n5o6/download" \
  -H "Authorization: Bearer <SESSION_TOKEN>"
```

**Response** (200 OK):

```json
{
  "url": "https://storage.googleapis.com/kb-project.appspot.com/organizations/org-123/files/f1a2b3c4.pdf?X-Goog-Algorithm=...",
  "expiresIn": 900,
  "fileName": "report.pdf"
}
```

---

### Example 4: Get Thumbnail

**Image File** (200 OK):

```json
{
  "isImage": true,
  "url": "https://storage.googleapis.com/kb-project.appspot.com/organizations/org-123/files/abc123.jpg?X-Goog-Algorithm=...",
  "contentType": "image/jpeg"
}
```

**Non-Image File** (200 OK):

```json
{
  "isImage": false,
  "data": "data:image/svg+xml;base64,PHN2Zz4...",
  "contentType": "image/svg+xml"
}
```

---

### Example 5: Delete a File

```bash
curl -X DELETE "http://localhost:3000/api/files/f1a2b3c4-d5e6-f7g8-h9i0-j1k2l3m4n5o6" \
  -H "Authorization: Bearer <SESSION_TOKEN>"
```

**Response** (200 OK):

```json
{
  "success": true
}
```

---

## Known Limitations (v1)

- **Upload integration**: No UI upload form; files added via API only
- **Search scope**: Prefix matching on filename only; full-text search deferred (v2)
- **Bulk operations**: Cannot upload/delete multiple files at once (v2)
- **Versioning**: File overwrite replaces old file; no history (v2)
- **Quotas**: No per-org file count or upload rate limits (v2)
- **Audit logging**: No compliance-grade audit trail (v2)

---

## Troubleshooting

### "Failed to fetch files" (500 Error)

- Check that Firestore composite indexes exist (see `firestore.indexes.json`)
- Verify org membership in `/organizations/{orgId}/members/{uid}`
- Check server logs for Firestore query errors

### "Permission denied" on Upload (403)

- Verify session context includes `orgId` (check `withAuthenticatedContext`)
- Ensure `/organizations/{orgId}/members/{uid}` document exists
- Check Firestore Security Rules are deployed (`firebase deploy --only firestore:rules`)

### Thumbnail SVG Not Rendering

- Verify `generateSvgIcon(kind)` is called for non-image files
- Check that `data:image/svg+xml` MIME type is correctly set in response header
- Test avatar inline SVG rendering capability of target browser

---

## References

- [Files Module Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Data Model](./data-model.md)
- [Firestore Security Rules](../../firestore.rules)
- [Storage Security Rules](../../storage.rules)
