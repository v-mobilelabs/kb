# Quickstart: Auth, Onboarding & Core Platform

**Feature**: `001-auth-onboarding-platform`  
**Date**: 2026-04-05  
**Purpose**: End-to-end validation that the implementation is working correctly.

---

## Prerequisites

- Node.js 20+
- Firebase project with **Email Link (Passwordless)** sign-in method enabled
- Firebase Admin SDK service account JSON available at `GOOGLE_APPLICATION_CREDENTIALS`
- `.env.local` populated (see below)

---

## 1. Environment Variables

```bash
# .env.local
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

SESSION_COOKIE_SECRET=<random 32-char string>

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 2. Deploy Firestore Indexes

```bash
firebase deploy --only firestore:indexes
```

Required indexes (must be in `firestore.indexes.json`):

```json
{
  "indexes": [
    {
      "collectionGroup": "auditLog",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "orgId", "order": "ASCENDING" },
        { "fieldPath": "eventType", "order": "ASCENDING" },
        { "fieldPath": "timestamp", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "apiKeys",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "isRevoked", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## 3. Start Dev Server

```bash
npm install
npm run dev
```

---

## 4. Validation Checklist

### Auth Flow

- [ ] Open `http://localhost:3000` unauthenticated.  
      **Expect**: Redirected to `/login`.
- [ ] Submit a valid email address on the login page.  
      **Expect**: "Check your inbox" confirmation message appears. No error.
- [ ] Submit an invalid email (e.g., `notanemail`).  
      **Expect**: Inline validation error shown. No email sent.
- [ ] Click the magic link in the email.  
      **Expect**: Redirected to `/dashboard`. Session cookie set (`HttpOnly`).

### Onboarding (New User)

- [ ] After first magic link sign-in (new user), land on `/dashboard`.  
      **Expect**: Onboarding modal appears immediately over the page. Background is not interactive.
- [ ] Attempt to submit the modal with empty fields.  
      **Expect**: Inline validation errors on all empty fields. Submission blocked.
- [ ] Complete the modal (display name ≥ 2 chars, org name, org size selection).  
      **Expect**: Modal dismisses. Dashboard renders with personalized greeting. Firestore: `/profiles/{uid}` and `/organizations/{orgId}` documents exist with correct data.
- [ ] Sign out and sign in again with the same email.  
      **Expect**: Onboarding modal does NOT appear. Lands directly on Dashboard.

### Dashboard

- [ ] Dashboard shows greeting: `"Welcome, {displayName}"` (or equivalent).  
      **Expect**: Display name matches what was entered in onboarding.
- [ ] Dashboard shows KPI tile: Total Active Keys.  
      **Expect**: Shows `0` for a new account (no keys created yet).
- [ ] Dashboard shows Key Activity bar chart.  
      **Expect**: Empty state with descriptive placeholder (no error, no crash).
- [ ] Dashboard shows Errors bar chart.  
      **Expect**: Empty state with descriptive placeholder.
- [ ] Refresh the Dashboard.  
      **Expect**: Skeleton placeholders shown during load; no layout shift when content appears.

### Profile

- [ ] Navigate to `/profile`.  
      **Expect**: Current display name is pre-filled in the editable field.
- [ ] Update the display name and save.  
      **Expect**: Name updates optimistically immediately. Confirmed after server response. Dashboard greeting reflects the new name on next visit.
- [ ] Click "Delete Account".  
      **Expect**: `ReusableConfirmModal` with `danger` intent appears. Background is not interactive.
- [ ] Dismiss the modal.  
      **Expect**: Modal closes. Account still exists (verify: able to navigate to Dashboard).
- [ ] Click "Delete Account" → Confirm deletion.  
      **Expect**: Session ended. Redirected to `/login`. Firestore: `/profiles/{uid}`, `/organizations/{orgId}`, and all `/organizations/{orgId}/apiKeys/*` documents are deleted.

### Settings — Organization

- [ ] Navigate to `/settings`.  
      **Expect**: Organization name pre-filled in editable field.
- [ ] Clear the org name field and attempt to save.  
      **Expect**: Validation error. Save blocked.
- [ ] Update the org name and save.  
      **Expect**: Name updates optimistically. Confirmed after server response. Firestore: `/organizations/{orgId}.name` updated.

### Settings — API Keys

- [ ] Click "Create API Key", provide a label name.  
      **Expect**: Full key value `cmo_...` revealed in a copyable field. Key appears in the list as masked (`cmo_...XXXX`). KPI tile on Dashboard increments by 1.
- [ ] Navigate away and return to Settings.  
      **Expect**: Full key value no longer shown. Masked value shown in list only.
- [ ] Click "Revoke" on the key.  
      **Expect**: `ReusableConfirmModal` with `danger` intent appears.
- [ ] Confirm revocation.  
      **Expect**: Key removed from the active list. KPI tile on Dashboard decrements by 1. Audit log entry `API_KEY_REVOKED` present in Firestore `/auditLog`.
- [ ] Attempt to access `/settings` as another user (different session) and modify the org's API keys via a direct URL.  
      **Expect**: `403 Forbidden` or redirect. No cross-org data returned.

### Audit Log

- [ ] After completing the above steps, inspect Firestore `/auditLog` collection.  
      **Expect**: Documents present for: `MAGIC_LINK_REQUEST`, `MAGIC_LINK_REDEEMED`, `API_KEY_CREATED`, `API_KEY_REVOKED`, `ACCOUNT_DELETED` (if deletion was tested). Each entry has `actorUid`, `orgId` (null for pre-auth events), `outcome`, and `timestamp`.
