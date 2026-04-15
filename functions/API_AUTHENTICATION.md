# Organization Members Authentication API

## Overview

This API provides magic link authentication for organization members using reCAPTCHA for spam protection and Firebase for authentication. All endpoints require API key authentication.

## Authentication

All authentication endpoints require an API key which must be provided via one of these headers:

- `Authorization: Bearer <api-key>`
- `X-API-Key: <api-key>`

The organization ID is automatically extracted from the API key, ensuring secure organization isolation.

## Endpoints

### 1. POST /api/v1/auth/magic-link

Send a magic link to an email address for organization member authentication.

**Headers:**

```
Authorization: Bearer <api-key>
Content-Type: application/json
```

**Request Body:**

```json
{
  "email": "user@example.com",
  "captchaToken": "recaptcha-v3-token"
}
```

**Parameters:**

- `email` (required): User's email address (must be valid)
- `captchaToken` (optional): reCAPTCHA v3 token for spam protection
- Organization ID is extracted from the API key

**Response (Success - 200):**

```json
{
  "success": true,
  "message": "Magic link sent to email"
}
```

**Response (Error - 403):**

```json
{
  "error": "reCAPTCHA verification failed",
  "details": "Low score"
}
```

**Response (Error - 500):**

```json
{
  "error": "Failed to send magic link",
  "details": "Error message"
}
```

---

### 2. POST /api/v1/auth/callback

Validate the magic link and create a session for the user. This endpoint is called after the user clicks the magic link and Firebase returns an ID token.

**Headers:**

```
Authorization: Bearer <api-key>
Content-Type: application/json
```

**Request Body:**

```json
{
  "idToken": "firebase-id-token"
}
```

**Parameters:**

- `idToken` (required): Firebase ID token obtained from the magic link flow
- Organization ID is extracted from the API key

**Response (Success - 200):**

```json
{
  "success": true,
  "sessionCookie": "session-cookie-value",
  "user": {
    "uid": "user-id",
    "email": "user@example.com",
    "orgId": "org-uuid-123",
    "role": "member"
  }
}
```

**Response (Error - 401):**

```json
{
  "error": "Invalid magic link",
  "details": "Invalid or expired ID token"
}
```

**Response (Error - 404):**

```json
{
  "error": "User is not authorized for this organization",
  "details": "User is not a member of this organization"
}
```

**Response (Error - 403):**

```json
{
  "error": "User is not authorized for this organization",
  "details": "User membership has been removed from this organization"
}
```

---

## Authentication Flow

1. **Request Magic Link**
   - Frontend collects user's email
   - Frontend generates reCAPTCHA v3 token
   - Frontend calls POST `/api/v1/auth/magic-link` with API key in Authorization header
   - Server validates API key to extract organization ID
   - Server validates reCAPTCHA and sends magic link email

2. **User Clicks Magic Link**
   - Email contains a link to `/{base_url}/auth/verify?orgId={orgId}`
   - Firebase SDK automatically processes the magic link
   - Firebase SDK returns an ID token to the frontend

3. **Exchange ID Token for Session**
   - Frontend calls POST `/api/v1/auth/callback` with ID token and API key in Authorization header
   - Server validates API key to extract organization ID
   - Server validates the ID token
   - Server checks if user is a member of the organization
   - Server creates a session cookie
   - Server returns the session cookie and user details to frontend

4. **Subsequent Requests**
   - Frontend includes the session cookie with all authenticated requests
   - Server validates the session cookie before processing requests

---

## Technical Details

### reCAPTCHA Integration

- Uses reCAPTCHA v3 (invisible, risk scoring-based)
- Server secret key: Configured in `RECAPTCHA_SECRET_KEY` environment variable
- Minimum score: 0.5 (configurable, higher = lower spam likelihood)
- Returns the score along with success/failure

### Firebase Integration

- Uses Firebase Identity Toolkit API for magic link flow
- Server-side validation using Firebase Admin SDK
- Session cookies valid for 14 days by default
- Organization ID stored as a custom user claim

### Organization Membership Verification

- Checks `organizations/{orgId}/memberships/{userId}` collection
- Verifies membership is not soft-deleted (`deletedAt` field)
- Returns user's role (`baseRole`) which can be `member`, `admin`, or `owner`

---

## Environment Variables

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_BASE_URL=http://localhost:3000/

# reCAPTCHA
RECAPTCHA_SECRET_KEY=your-server-secret-key
```

---

## Error Handling

All errors follow a consistent format:

```json
{
  "error": "Error category",
  "details": "Detailed error message"
}
```

Common error codes:

- `400` - Invalid request parameters
- `401` - Authentication failed (invalid/missing API key, invalid token, expired magic link)
- `403` - Forbidden (failed captcha, membership removed)
- `404` - Not found (user not a member of organization)
- `500` - Server error

---

## Security Considerations

1. **API Key Authentication**: All endpoints require valid API key for organization verification
2. **Organization Isolation**: Organization ID is tied to API key, ensuring server-side validation
3. **reCAPTCHA Validation**: All magic link requests must pass reCAPTCHA v3
4. **Token Expiration**: Magic links expire after 1 hour
5. **One-time Use**: Magic links can only be used once
6. **Users can only authenticate with organizations they belong to**: Server verifies membership
7. **Session Cookies**: Signed with Firebase key, cannot be forged
8. **Rate Limiting**: Magic link requests are rate-limited to 5 per hour per email
9. **No Client-Side Organization Override**: Organization ID cannot be manipulated by client

---

## Database Schema

### Requirement: organizations/{orgId}/memberships/{userId}

Expected document structure:

```json
{
  "userId": "user-id",
  "email": "user@example.com",
  "baseRole": "member",
  "joinedAt": "2024-04-14T12:00:00Z",
  "lastActiveAt": "2024-04-14T13:00:00Z",
  "deletedAt": null
}
```

When a membership is removed:

- Set `deletedAt` to current timestamp
- Do NOT physically delete the document (soft delete pattern)
