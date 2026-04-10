# Optimistic Updates Implementation Guide

## Overview

This guide documents the optimistic update implementation for TanStack Query mutations across the CosmoOps KB application.

## What is Optimistic Updates?

Optimistic updates immediately reflect changes in the UI before the server confirms them, providing instant feedback to users. If the server request fails, the UI rolls back to the previous state.

## Implementation Pattern

### Core Utility File

Location: `src/lib/hooks/use-optimistic-mutation.ts`

Provides three reusable hooks:

#### 1. `useOptimisticUpdate` - for single item updates

```typescript
const mutation = useMutation({
  mutationFn: updateAction,
  ...useOptimisticUpdate("profile", uid, { displayName: newName }),
});
```

- Updates a single cached item
- Rollsback on error
- Ideal for: profile updates, store details, organization settings

#### 2. `useOptimisticListAdd` - for adding items to lists

```typescript
const mutation = useMutation({
  mutationFn: createAction,
  ...useOptimisticListAdd("stores", orgId),
});
```

- Adds item to list cache
- Works with both regular and infinite queries
- Ideal for: creating stores, documents, API keys

#### 3. `useOptimisticListRemove` - for removing items from lists

```typescript
const mutation = useMutation({
  mutationFn: deleteAction,
  ...useOptimisticListRemove("documents", orgId, storeId, docId),
});
```

- Removes item from list cache
- Works with both regular and infinite queries
- Ideal for: deleting documents, stores, API keys

## Components Updated

### 1. Store Management

- **store-create-form.tsx**: Creates new store with optimistic add
- **store-edit-form.tsx**: Updates store details with optimistic update

### 2. Document Management

- **document-list-client.tsx**: Deletes documents with optimistic remove
- **custom-document-form.tsx**: Creates/updates custom documents

### 3. User Management

- **profile-client.tsx**: Already had optimistic updates for name changes
- **onboarding-modal.tsx**: Added optimistic update for display name

### 4. Settings & Organization

- **org-details-form.tsx**: Updates organization name with optimistic update
- **api-key-create-form.tsx**: Creates API keys with optimistic add
- **api-key-list.tsx**: Already had optimistic updates for key revocation

## Key Benefits

1. **Instant Feedback**: Users see changes immediately
2. **Better UX**: No latency-induced UI flicker
3. **Resilient**: Automatic rollback on failure
4. **Consistent**: Centralized pattern reduces code duplication

## Usage Pattern

```typescript
import { useMutation } from "@tanstack/react-query";
import { useOptimisticUpdate } from "@/lib/hooks/use-optimistic-mutation";

export function MyComponent() {
  const mutation = useMutation({
    mutationFn: myAction,
    ...useOptimisticUpdate(["myQuery"], id, { field: newValue }),
    onSuccess: (result) => {
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      // Additional logic on success
    },
  });
}
```

## Important Notes

1. **Hook Rules**: Always call hooks at top level, avoid conditional hook calls
2. **Query Keys**: Ensure query keys match between mutation and query components
3. **Type Safety**: Use proper TypeScript generics for mutation options
4. **Error Handling**: Always check `result.ok` before processing

## Testing Optimistic Updates

1. Create/update/delete an item
2. Expected: Item appears/updates/disappears immediately
3. On network error: Item reverts to previous state
4. On success: Confirmation toast if applicable

## Future Enhancements

- [ ] Add skeleton loaders during optimistic updates
- [ ] Add undo functionality with time limit
- [ ] Enhanced error messaging with retry options
