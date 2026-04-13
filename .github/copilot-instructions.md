# kb Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-13

## Active Technologies
- TypeScript 5.x (Next.js 16+ App Router + Cloud Functions v2 Node.js 22) + Firebase Admin SDK, LangGraph.js, `@google-cloud/vertexai`, TanStack Query v5, HeroUI v3+, Zod, OpenTelemetry SDK (002-store-module)
- Firestore (documents + vector embeddings), Firebase Cloud Storage (binary files) (002-store-module)
- TypeScript 5.x · Next.js 16+ App Router · React 19 + TanStack Query v5, Firebase Admin SDK, `next/cache` (`'use cache'`, `cacheTag`, `cacheLife`, `revalidateTag`), Zod, HeroUI v3+ (002-store-module)
- Firestore — cursor-based pagination via `startAfter(sortValue, docId)` (002-store-module)

- TypeScript 5.x + Firebase Admin SDK (Session Cookies, Firestore, Auth — magic link), Firebase Client SDK (Auth state); TanStack Query v5; Hero UI v3+; Tailwind CSS v4; Recharts (activity + error bar charts); Zod (DTO validation); OpenTelemetry SDK (tracing via `BaseUseCase`) (001-auth-onboarding-platform)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript 5.x: Follow standard conventions

## Recent Changes
- 002-store-module: Added TypeScript 5.x · Next.js 16+ App Router · React 19 + TanStack Query v5, Firebase Admin SDK, `next/cache` (`'use cache'`, `cacheTag`, `cacheLife`, `revalidateTag`), Zod, HeroUI v3+
- 002-store-module: Added TypeScript 5.x (Next.js 16+ App Router + Cloud Functions v2 Node.js 22) + Firebase Admin SDK, LangGraph.js, `@google-cloud/vertexai`, TanStack Query v5, HeroUI v3+, Zod, OpenTelemetry SDK


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
