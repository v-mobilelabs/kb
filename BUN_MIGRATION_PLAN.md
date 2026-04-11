# Bun Runtime Migration Plan

## Current State
- **Runtime**: Node.js 22 (pnpm v10)
- **Web App**: Next.js 16.2.2 with React 19
- **Backend**: Firebase Cloud Functions v6 (Node.js 22)
- **Package Manager**: pnpm
- **TypeScript**: 5.x

## Target State
- **Runtime**: Bun (for all components)
- **Package Manager**: Bun (built-in)
- **Web App**: Next.js 16.2.2 (Bun runtime)
- **Backend**: Firebase Cloud Functions (Bun runtime)

---

## Migration Strategy

### Phase 1: Assessment & Compatibility (Week 1)

**1.1 Current Architecture**
```
cosmoops-new/
├── src/                    # Next.js web app
│   ├── app/               # Next.js 16+ App Router
│   ├── actions/           # Server actions
│   ├── components/        # React 19 components
│   ├── data/              # Use cases, repos, models
│   └── lib/               # Utilities, Firebase, hooks
├── functions/             # Firebase Cloud Functions v6
│   ├── src/
│   │   ├── api/          # Express routes (Vercel-bound)
│   │   ├── handles/      # Function handlers
│   │   ├── nodes/        # LangGraph nodes
│   │   ├── workflows/    # LangGraph workflows
│   │   └── lib/          # Admin SDK wrappers
│   └── package.json      # Separate package.json
└── package.json          # Root package (web app)
```

**1.2 Key Dependencies Compatibility Check**

| Package | Current | Bun Status | Notes |
|---------|---------|------------|-------|
| next | 16.2.2 | ✅ Full support | Bun has native Next.js support |
| react/react-dom | 19.x | ✅ Full support | No issues with Bun |
| firebase | 12.11.0 | ✅ Mostly compatible | Some edge cases with Auth state |
| firebase-admin | 13.7.0 / 12.6.0 | ✅ Compatible | Works fine with Bun |
| firebase-functions | 6.0.1 | ⚠️ Partial | Uses Node.js APIs; needs testing |
| @genkit-ai/* | 1.31.0 | ✅ Compatible | AI SDK works with Bun |
| express | 5.2.1 | ✅ Full support | Bun has native Express support |
| zod | 4.3.6 | ✅ Full support | Schema validation works fine |
| @tailwindcss/postcss | 4.x | ✅ Full support | CSS processing works |
| uuid | 9.0.0 | ✅ Full support | Crypto supported in Bun |
| react-aria-components | 1.6.3 | ✅ Full support | No Node.js dependency |
| framer-motion | 12.38.0 | ✅ Full support | Browser library works in Bun |

**1.3 Potential Compatibility Issues**
- Firebase Admin SDK: Some file path handling differences
- Firebase Functions: Uses Node.js module patterns
- Express server in functions: May need minor adjustments
- OpenTelemetry: Some instrumentation might need adaptation

---

### Phase 2: Development Environment Setup (Week 1)

**2.1 Install Bun**
```bash
curl -fsSL https://bun.sh/install | bash
bun --version  # Should be 1.x+
```

**2.2 Migrate Package Manager**
```bash
# Root package.json migration
rm pnpm-lock.yaml package-lock.json
bun install

# Functions package.json migration (separate)
cd functions
rm package-lock.json
bun install
```

**2.3 Update package.json Scripts**

Root `package.json`:
```json
{
  "scripts": {
    "dev": "bun next dev",
    "build": "bun next build",
    "start": "bun next start",
    "test": "bun test",
    "lint": "bun eslint",
    "type-check": "bun tsc --noEmit"
  }
}
```

Functions `functions/package.json`:
```json
{
  "scripts": {
    "lint": "bunx eslint --ext .js,.ts .",
    "build": "bun tsc",
    "build:watch": "bun tsc --watch",
    "serve": "bun run build && firebase emulators:start --only functions",
    "deploy": "firebase deploy --only functions",
    "logs": "firebase functions:log"
  },
  "engines": {
    "node": "22",
    "bun": "1.0.0"
  }
}
```

---

### Phase 3: Runtime Migration (Week 2)

**3.1 Next.js Web App**

No code changes needed, but validate:
```bash
bun next build
bun next dev                  # Test local dev server
bun next start               # Test production server
```

**3.2 Firebase Admin SDK Adjustments**

File: `src/lib/firebase/admin.ts` (or similar)
```typescript
// Current (pnpm/Node.js)
import * as admin from 'firebase-admin';

// With Bun - same import, but ensure cert paths are correct
// Bun uses different module resolution for file paths
const serviceAccount = require(process.env.FIREBASE_ADMIN_KEY_PATH);
// Better approach:
const serviceAccount = JSON.parse(
  Bun.file(process.env.FIREBASE_ADMIN_KEY_PATH).text()
);
```

**3.3 Environment Variables**

Create `bunfig.toml` (Bun config):
```toml
[env]
development = { variables = { NODE_ENV = "development" } }
production = { variables = { NODE_ENV = "production" } }

# Use .env.local as usual (Bun loads it automatically)
```

**3.4 TypeScript Configuration**

Update `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "moduleResolution": "bundler",  // Changed from "node"
    "resolveJsonModule": true,
    "allowJs": true,
    "isolatedModules": true
  }
}
```

---

### Phase 4: Cloud Functions Migration (Week 2-3)

**4.1 Update functions/package.json**

```json
{
  "engines": {
    "node": "22",
    "bun": "1.0.0+"
  },
  "type": "module",  // Enable ESM (Bun prefers it)
  "dependencies": {
    "firebase-functions": "^6.0.1",
    "firebase-admin": "^12.6.0+",
    "express": "^5.2.1+",
    "@genkit-ai/firebase": "^1.31.0+",
    "@genkit-ai/google-genai": "^1.31.0+",
    "@genkit-ai/vertexai": "^1.31.0+"
  }
}
```

**4.2 Update Firebase Functions Runtime**

File: `firebase.json`
```json
{
  "functions": {
    "source": ".",
    "runtime": "nodejs_22",
    "codebase": "default"
  }
}
```
⚠️ Note: Firebase may require updating `firebase-tools` CLI

**4.3 Test Functions Locally**

```bash
cd functions
bun run build
firebase emulators:start --only functions
```

**4.4 Address Express Server (if needed)**

File: `functions/src/api/app.ts` or similar
```typescript
// Should work as-is with Bun
// If issues arise with middleware:

// Current
app.use(express.json());
app.use(cors());

// Add explicit type if needed
import type { Express } from 'express';
const app: Express = express();
```

---

### Phase 5: Testing & Validation (Week 3)

**5.1 Unit Tests**

Create `tests/example.test.ts`:
```typescript
import { test, expect } from "bun:test";

test("example test", () => {
  expect(1 + 1).toBe(2);
});
```

Run with:
```bash
bun test
```

**5.2 Integration Tests**

```bash
# Test web app
bun next build
bun next dev &
# Run E2E tests

# Test Cloud Functions
cd functions
bun run build
firebase emulators:start --only functions &
# Test API endpoints
```

**5.3 Performance Benchmarking**

```bash
# Compare cold start times
time bun next dev
time bun run build

# Functions startup (via emulator)
firebase emulators:start --only functions --debug
```

---

## File-by-File Changes

### Root Level

1. **package.json**
   - Remove pnpm overrides if present
   - Update scripts to use `bun` prefix
   - Add `type: "module"` if using ESM

2. **tsconfig.json**
   - Change `moduleResolution` to `"bundler"`
   - Update `target` to `"ES2020"`

3. **Delete**
   - `pnpm-lock.yaml`
   - `bun.lockb` (auto-generated after first install)

### Functions

1. **functions/package.json**
   - Add `"type": "module"`
   - Update scripts
   - Add `bun` to engines

2. **functions/tsconfig.json**
   - Same as root tsconfig changes

3. **functions/src/lib/admin-firestore.ts** (if applicable)
   - Verify cert loading handles Bun's file system APIs

---

## Risk Mitigation

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| Firebase Admin SDK incompatibility | Low | Test in emulator first; rollback ready |
| Cloud Functions deployment failure | Medium | Deploy/test locally before production |
| Performance regression | Low | Monitor cold start times |
| ESM module resolution issues | Medium | Verbose error messages; check module docs |
| Build time increase | Low | Bun builds are typically faster |

---

## Rollback Strategy

If issues arise:
```bash
# Restore pnpm
git restore pnpm-lock.yaml package.json
pnpm install

# Restore functions
cd functions
git restore package-lock.json package.json
npm install
```

---

## Implementation Timeline

| Phase | Duration | Effort | Keys |
|-------|----------|--------|------|
| 1. Assessment | 2 days | Low | Verify compatibility |
| 2. Dev Setup | 1 day | Low | Local environment ready |
| 3. Web App Migration | 2 days | Low | Build & test locally |
| 4. Functions Migration | 3 days | Medium | Emulator testing critical |
| 5. Testing & Validation | 3 days | High | Comprehensive testing |
| **Total** | **11 days** | **Medium** | **~2 weeks** |

---

## Success Criteria

✅ `bun next dev` runs without errors  
✅ `bun next build` completes successfully  
✅ All API routes work in Cloud Functions emulator  
✅ TypeScript type checking passes  
✅ Firebase Admin SDK operations complete successfully  
✅ Performance metrics show improvement or parity  
✅ All tests pass with Bun test runner  

---

## Next Steps

1. **Run Bun installation** (5 min)
2. **Test current stack with Bun** (1 hour)
3. **Create feature branch** `feature/bun-migration`
4. **Implement Phase 2 & 3** (iterative)
5. **Run comprehensive tests**
6. **Deploy to staging** for validation
7. **Merge to main** with monitoring

---

## References

- [Bun Documentation](https://bun.sh/docs)
- [Bun Next.js Support](https://bun.sh/docs/guides/nextjs)
- [Firebase Admin SDK with Bun](https://firebase.google.com/docs/admin/setup)
- [Bun Built-in Test Runner](https://bun.sh/docs/test/overview)
