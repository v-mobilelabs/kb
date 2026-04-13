# Quickstart: Context Module Development

**Feature**: 005-context-module  
**For**: Developers implementing context CRUD operations  
**Target**: Phase 0 through Phase 5 implementation

---

## Prerequisites

- Node.js 22+
- Firebase CLI (`firebase` command)
- Firebase project configured (see `firebase.json`)
- Authentication module (001-auth-onboarding-platform) deployed
- Basic familiarity with:
  - Firestore + RTDB
  - Next.js 16+ App Router
  - TanStack Query v5
  - TypeScript 5.x
  - Zod for schema validation

---

## Development Environment Setup

### 1. Clone & Install Dependencies

```bash
cd /Users/vasanth/Documents/workspace/CosmoOps/kb

# Install root dependencies
pnpm install

# Install function dependencies
cd functions
pnpm install
cd ..
```

### 2. Configure Firebase Emulator (Optional, for local testing)

```bash
# Install Firebase Emulator Suite
firebase setup:emulators:database
firebase setup:emulators:firestore

# Start emulators (separate terminal)
firebase emulators:start --import=./emulators-data
```

### 3. Environment Variables

Create `.env.local` in root:

```bash
# Firebase Project ID
NEXT_PUBLIC_FIREBASE_PROJECT_ID=knowledge-base-cosmoops

# Auth
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_API_KEY=...

# Optional: Emulator (local development)
FIREBASE_EMULATOR_HOST=127.0.0.1:9099
FIREBASE_DATABASE_EMULATOR_HOST=127.0.0.1:9000
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
```

---

## Project Structure

```
src/
  actions/
    context-actions.ts          ← All server actions (CRUD + API)
  components/
    contexts/                   ← Context UI components
      ContextList.tsx
      ContextDetail.tsx
      ContextForm.tsx
    documents/                  ← Document UI components
      DocumentList.tsx
      DocumentDetail.tsx
      DocumentForm.tsx
    feedback/                   ← Toast, ConfirmDialog
      Toast.tsx
      ConfirmDialog.tsx
  lib/
    hooks/
      use-contexts.ts           ← TanStack Query hooks for contexts
      use-documents.ts          ← TanStack Query hooks for documents
      use-retry-mutation.ts     ← Auto-retry wrapper
      use-conflict-handler.ts   ← 409 conflict handling
      use-validated-form.ts     ← Form validation (blur + debounce)
    schemas/
      context-schema.ts         ← Zod schemas
    query-keys.ts               ← TanStack Query key factory
    logging.ts                  ← Cloud Logging integrations
  data/
    contexts/                   ← (Optional) Data fetching layer

functions/
  src/
    triggers/
      on-context-deleted.ts     ← Cloud Function for cascade delete
    lib/
      context-service.ts        ← Business logic
      admin-firestore.ts        ← Firestore admin client
      vertex-ai.ts              ← (Optional) Gemini integration

firestore.indexes.json          ← Firestore composite indexes
firestore.rules                 ← Firestore security rules
database.rules.json             ← RTDB security rules
```

---

## Phase 0: Infrastructure Setup

### Task 0.1: Deploy Firestore Indexes

1. **Review indexes in `firestore.indexes.json`**:

```json
{
  "indexes": [
    {
      "collectionGroup": "contexts",
      "queryScope": "Collection",
      "fields": [
        { "fieldPath": "orgId", "order": "ASCENDING" },
        { "fieldPath": "updatedAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

2. **Deploy**:

```bash
firebase deploy --only firestore:indexes
```

3. **Verify in Firebase Console**: Navigate to Firestore → Indexes; wait for "Enabled" status.

### Task 0.2: Deploy Security Rules

1. **Review `firestore.rules`** (contains org scoping logic)

2. **Deploy**:

```bash
firebase deploy --only firestore:rules
firebase deploy --only database:rules
```

3. **Verify**: Firebase Console → Firestore/Database → Rules tab

### Task 0.3: Create Zod Schemas

File: `src/lib/schemas/context-schema.ts`

```typescript
import { z } from "zod";

export const contextInputSchema = z.object({
  name: z.string().min(1).max(100, "Name must be 1-100 characters"),
  windowSize: z
    .number()
    .positive("Window size must be a positive integer")
    .optional()
    .nullable(),
});

export type ContextInput = z.infer<typeof contextInputSchema>;

export const documentInputSchema = z.object({
  name: z.string().optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
});

export type DocumentInput = z.infer<typeof documentInputSchema>;
```

### Task 0.4: Generate Server Action Stubs

File: `src/actions/context-actions.ts`

```typescript
"use server";

import {
  contextInputSchema,
  documentInputSchema,
} from "@/lib/schemas/context-schema";

// Context operations
export async function createContext(orgId: string, input: unknown) {
  // TODO: Implementation
  throw new Error("Not implemented");
}

export async function getContext(orgId: string, contextId: string) {
  throw new Error("Not implemented");
}

export async function listContexts(
  orgId: string,
  options: {
    page?: number;
    sort?: "name" | "createdAt";
    direction?: "asc" | "desc";
  },
) {
  throw new Error("Not implemented");
}

export async function updateContext(
  orgId: string,
  contextId: string,
  input: unknown,
) {
  throw new Error("Not implemented");
}

export async function deleteContext(orgId: string, contextId: string) {
  throw new Error("Not implemented");
}

// Document operations
export async function createDocument(
  orgId: string,
  contextId: string,
  input: unknown,
) {
  throw new Error("Not implemented");
}

export async function getDocument(
  orgId: string,
  contextId: string,
  docId: string,
) {
  throw new Error("Not implemented");
}

export async function listDocuments(
  orgId: string,
  contextId: string,
  options: {
    page?: number;
    sort?: "id" | "name" | "createdAt" | "updatedAt";
    direction?: "asc" | "desc";
    filterId?: string;
  },
) {
  throw new Error("Not implemented");
}

export async function updateDocument(
  orgId: string,
  contextId: string,
  docId: string,
  input: unknown,
) {
  throw new Error("Not implemented");
}

export async function deleteDocument(
  orgId: string,
  contextId: string,
  docId: string,
) {
  throw new Error("Not implemented");
}
```

---

## Phase 1: Context Lifecycle

### Task 1.1: Implement `createContext()`

```typescript
// src/actions/context-actions.ts

export async function createContext(orgId: string, input: unknown) {
  "use server";

  // Validate input
  const parsed = contextInputSchema.parse(input);

  // Get Firebase admin
  const { db, realtimeDb } = await getFirebaseAdmin();
  const userId = await getCurrentUserId(); // From session

  // Firestore transaction
  const contextId = doc(collection(db, "placeholder")).id; // Generate ID

  await runTransaction(db, async (transaction) => {
    // Write Firestore document
    const contextRef = doc(db, "orgs", orgId, "contexts", contextId);

    transaction.set(contextRef, {
      id: contextId,
      orgId,
      name: parsed.name,
      windowSize: parsed.windowSize || null,
      documentCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userId,
    });
  });

  // Initialize RTDB path
  await realtimeDb.ref(`/contexts/${contextId}/documents`).set({});

  // Grant user access
  await realtimeDb
    .ref(`/contextAccessControl/${userId}/${contextId}`)
    .set(true);

  // Log
  console.log(`[createContext] Created context ${contextId} in org ${orgId}`);

  return {
    id: contextId,
    name: parsed.name,
    windowSize: parsed.windowSize,
    documentCount: 0,
    createdAt: new Date().toISOString(),
  };
}
```

### Task 1.2: Implement `listContexts()` + TanStack Query Hook

**Server Action**:

```typescript
export async function listContexts(
  orgId: string,
  options: {
    page?: number;
    pageSize?: number;
    sort?: "name" | "createdAt";
    direction?: "asc" | "desc";
  } = {},
) {
  "use server";

  const { db } = await getFirebaseAdmin();
  const pageSize = options.pageSize || 25;
  const sort = options.sort || "createdAt";
  const direction = options.direction || "desc";

  let q = query(
    collection(db, "orgs", orgId, "contexts"),
    orderBy(sort, direction === "asc" ? "asc" : "desc"),
    limit(pageSize + 1), // Fetch one extra to determine hasNext
  );

  const snapshot = await getDocs(q);
  const hasNext = snapshot.docs.length > pageSize;
  const items = snapshot.docs.slice(0, pageSize).map((doc) => doc.data());

  const cursor =
    items.length > 0
      ? `${items[items.length - 1][sort]}|${items[items.length - 1].id}`
      : null;

  return { items, hasNext, cursor };
}
```

**TanStack Query Hook**:

```typescript
// src/lib/hooks/use-contexts.ts

export function useContextList(orgId: string) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["contexts", "list", orgId],
    queryFn: () => listContexts(orgId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateContext(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ContextInput) => createContext(orgId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["contexts", "list", orgId],
      });
    },
  });
}
```

---

## Phase 3: Document Management

### Task 3.1: Implement `createDocument()`

```typescript
export async function createDocument(
  orgId: string,
  contextId: string,
  input: unknown,
) {
  "use server";

  const parsed = documentInputSchema.parse(input);
  const { db, realtimeDb } = await getFirebaseAdmin();
  const userId = await getCurrentUserId();
  const docId = uuidv4();
  const now = Date.now();

  // RTDB write + Firestore increment (transaction)
  await runTransaction(db, async (transaction) => {
    // Write to RTDB
    await realtimeDb.ref(`/contexts/${contextId}/documents/${docId}`).set({
      id: docId,
      contextId,
      name: parsed.name || null,
      metadata: parsed.metadata || {},
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
    });

    // Increment Firestore documentCount
    const contextRef = doc(db, "orgs", orgId, "contexts", contextId);
    transaction.update(contextRef, {
      documentCount: increment(1),
    });
  });

  return {
    id: docId,
    contextId,
    name: parsed.name,
    metadata: parsed.metadata,
    createdAt: now,
  };
}
```

---

## Phase 4: Error Handling & Resilience

### Auto-Retry Mutation Hook

```typescript
// src/lib/hooks/use-retry-mutation.ts

export function useRetryMutation<TData, TError, TVariables>(
  options: UseMutationOptions<TData, TError, TVariables>,
  maxRetries = 3,
) {
  return useMutation({
    ...options,
    mutationFn: async (variables) => {
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await options.mutationFn!(variables);
        } catch (error) {
          lastError = error as Error;

          // Don't retry on validation errors (400, 401, 403, 404)
          if (
            error instanceof Error &&
            (error.message.includes("400") ||
              error.message.includes("401") ||
              error.message.includes("403") ||
              error.message.includes("404"))
          ) {
            throw error;
          }

          // Wait before retry (exponential backoff)
          if (attempt < maxRetries) {
            const delayMs = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        }
      }

      throw lastError;
    },
  });
}
```

### Form Validation Hook

```typescript
// src/lib/hooks/use-validated-form.ts

export function useValidatedForm<T extends Record<string, any>>(
  schema: z.ZodSchema,
  initialValues: T,
) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const debounceTimerRef = useRef<NodeJS.Timeout>();

  const validate = useCallback(
    (fieldName: string, value: any) => {
      const partial = schema.partial();
      const result = partial.safeParse({ [fieldName]: value });

      if (result.success) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[fieldName];
          return next;
        });
      } else {
        const fieldError = result.error.issues.find(
          (issue) => issue.path[0] === fieldName,
        );
        if (fieldError) {
          setErrors((prev) => ({
            ...prev,
            [fieldName]: fieldError.message,
          }));
        }
      }
    },
    [schema],
  );

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    validate(name, value);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));

    // Debounce validation on keystroke
    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      if (touched[name]) {
        validate(name, value);
      }
    }, 500);
  };

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
  };
}
```

---

## Testing

### Unit Test Example

```typescript
// tests/context-creation.test.ts

import { createContext } from "@/actions/context-actions";

describe("Context Creation", () => {
  it("should create a context with valid input", async () => {
    const orgId = "test-org";
    const input = {
      name: "My Test Context",
      windowSize: 4096,
    };

    const result = await createContext(orgId, input);

    expect(result).toHaveProperty("id");
    expect(result.name).toBe("My Test Context");
    expect(result.windowSize).toBe(4096);
  });

  it("should reject invalid input", async () => {
    const orgId = "test-org";
    const input = {
      name: "", // Invalid: empty
      windowSize: 4096,
    };

    await expect(createContext(orgId, input)).rejects.toThrow();
  });
});
```

### Integration Test: Concurrent Edits

```typescript
// tests/concurrent-edits.test.ts

import { updateContext, getContext } from "@/actions/context-actions";

describe("Concurrent Edits (FR-019)", () => {
  it("should detect conflicts on concurrent updates", async () => {
    const orgId = "test-org";
    const contextId = "test-context";

    // Get initial state
    const initial = await getContext(orgId, contextId);

    // Simulate edit from Tab 1
    const edit1 = updateContext(orgId, contextId, {
      ...initial,
      name: "Updated from Tab 1",
    });

    // Simulate edit from Tab 2 (starts from same initial state)
    const edit2 = updateContext(orgId, contextId, {
      ...initial,
      name: "Updated from Tab 2",
    });

    // First should succeed
    await expect(edit1).resolves.toBeDefined();

    // Second should fail with 409 conflict
    await expect(edit2).rejects.toThrow("409");
  });
});
```

---

## Local Development Checklist

- [ ] Firebase Emulator running
- [ ] `npm run dev` starts Next.js server on `localhost:3000`
- [ ] Can create a context from UI
- [ ] Context appears in list
- [ ] Can update context name
- [ ] Can delete context
- [ ] Can create document in context
- [ ] Validation errors show correctly
- [ ] Success/error toasts appear

---

## Deployment

### Pre-Deployment Checklist

- [ ] All tests passing (`npm test`)
- [ ] Linting clean (`npm run lint`)
- [ ] Firestore indexes deployed
- [ ] Security rules deployed
- [ ] Cloud Functions deployed (`firebase deploy --only functions`)
- [ ] Environment variables set in Firebase/Vercel
- [ ] Database backups configured

### Deploy to Production

```bash
# Build
npm run build

# Deploy everything
firebase deploy

# Or deploy selectively
firebase deploy --only firestore:rules,database:rules,functions
```

---

## Troubleshooting

### Issue: "Permission denied" on Firestore reads

**Cause**: Security rules not deployed or org context not in session  
**Solution**:

1. Check `firestore.rules` deployed: `firebase deploy --only firestore:rules`
2. Verify session includes `customClaims.orgId`

### Issue: "Context not found" on RTDB reads

**Cause**: User doesn't have access grant in `/contextAccessControl`  
**Solution**:

1. Recreate the context to reinitialize access grant
2. Manually verify `/contextAccessControl/{userId}/{contextId}` exists

### Issue: Concurrent edit doesn't detect conflict

**Cause**: Transaction not comparing field values before update  
**Solution**: Check `updateContext()` reads current state and validates against input

---

## Resources

- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [RTDB Documentation](https://firebase.google.com/docs/database)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Zod Validation](https://zod.dev/)
- [Next.js 16 App Router](https://nextjs.org/docs/app)

---

## Support & Questions

For implementation questions, refer to:

1. [Plan](plan.md) — Architecture & design decisions
2. [Data Model](data-model.md) — Schema & query patterns
3. [Tasks](tasks.md) — Detailed task list
4. Existing modules: `001-auth-onboarding-platform`, `002-store-module`
