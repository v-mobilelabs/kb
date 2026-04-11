# Audit Consolidation Migration

## Overview

This migration consolidates audit logs from three scattered locations into a single flat `/audits` collection:

**Before:**
- `/organizations/_system/audits/{id}` - system events (auth, magic link, etc.)
- `/organizations/{orgId}/audits/{id}` - org-specific events
- `/auditLog/{id}` - legacy flat structure
- `/audits/{id}` - partially migrated data

**After:**
- `/audits/{id}` - all audits in one flat collection with `orgId` field

## Changes Made

### 1. Code Updates

#### Repository Changes
- `AuditLogRepository` no longer takes `orgId` in constructor
- Writes to flat `/audits` collection
- `findByEventType()` now accepts optional `orgId` parameter for filtering

**Before:**
```typescript
const repo = new AuditLogRepository("org123");
const result = await repo.create({ ... });
```

**After:**
```typescript
const repo = new AuditLogRepository();
const result = await repo.create({
  orgId: "org123",
  ...
});
```

#### Updated Files
- `src/data/audit/repositories/audit-log-repository.ts`
- `src/data/audit/use-cases/create-audit-log-use-case.ts`
- `src/data/audit/use-cases/query-audit-logs-use-case.ts`
- `src/data/audit/use-cases/check-rate-limit-use-case.ts`
- `src/data/audit/README.md`

### 2. Migration Function
- New file: `functions/src/migrations/migrate-audits-to-flat-collection.ts`
- Handles all three source locations
- Ensures `orgId` field is set for all documents
- Generates migration statistics

### 3. Cloud Function Endpoint
- New HTTP endpoint: `POST /migrateAudits`
- Requires Firebase ID token with `admin` claim
- Runs migration safely with proper auth checks

## Running the Migration

### Option 1: Via HTTP Endpoint (Recommended)

1. Get an admin ID token:
```bash
# Using Firebase CLI (if you have admin access)
firebase login
```

2. Call the migration endpoint:
```bash
curl -X POST \
  https://us-central1-knowledge-base-cosmoops.cloudfunctions.net/migrateAudits \
  -H "Authorization: Bearer $(gcloud auth application-default print-access-token)" \
  -H "Content-Type: application/json"
```

### Option 2: Direct Execution

Import and run in a Node.js script:
```typescript
import { migrateAuditsToFlatCollection } from "./functions/src/migrations/migrate-audits-to-flat-collection";

const result = await migrateAuditsToFlatCollection();
console.log(result);
```

## Migration Statistics

The migration endpoint returns:
```json
{
  "success": true,
  "stats": {
    "migratedFromOrgNested": 150,
    "migratedFromAuditLog": 45,
    "alreadyInAudits": 230,
    "errors": []
  }
}
```

## Firestore Rules Updates

Update `firestore.rules` to support the new flat collection:

```
match /audits/{document=**} {
  // Only allow authenticated users to read their org's audits
  allow read: if isAuthenticated() && (
    resource.data.orgId == request.auth.uid ||
    resource.data.orgId in getUserOrgs(request.auth.uid) ||
    hasAdminRole(request.auth.uid)
  );
  // Only Cloud Functions can write audits
  allow write: if false;
}
```

## Firestore Composite Indexes

Add these composite indexes to `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "audits",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "eventType", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "audits",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "orgId", "order": "ASCENDING" },
        { "fieldPath": "eventType", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "audits",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "actorEmail", "order": "ASCENDING" },
        { "fieldPath": "eventType", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "DESCENDING" }
      ]
    }
  ]
}
```

Deploy indexes:
```bash
firebase deploy --only firestore:indexes
```

## Rollback Plan

If the migration fails or needs to be rolled back:

1. The original documents remain untouched in their original locations
2. Audit queries will still work against the old locations until code is reverted
3. To rollback: Revert code changes and queries will resume using nested structure

However, **do not revert code after migration completes**, as new audits will be written to the flat collection while old code tries to read from nested structure—creating inconsistency.

## Cleanup (Post-Migration)

After verifying the migration was successful for several days:

```bash
# Delete old nested audit collections
firebase shell
db.collection('organizations').doc('_system').collection('audits').limit(1000).get()
# ... review then delete

# Delete legacy auditLog collection
db.collection('auditLog').limit(1000).get()
# ... review then delete
```

## Validation Steps

After migration:

1. **Check migration statistics**: All documents should be migrated
2. **Sample audit queries**: Query `/audits` with orgId filters
3. **Verify orgId field**: All documents should have orgId set
4. **Test rate limiting**: Ensure rate limit checks still work
5. **Monitor logs**: Watch for any audit-related errors

## Timeline

- **Phase 1**: Deploy code changes (backward compatible)
- **Phase 2**: Run migration
- **Phase 3**: Monitor for 1-2 days
- **Phase 4**: (Optional) Clean up old documents
