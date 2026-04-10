/**
 * Resource Model: AI-Native & Type-Safe (2026 Edition)
 * Flat document shape — status, type, error, summary at top level.
 */

// ── Shared sub-shapes ────────────────────────────────────────────────────

export type AiStatus = "pending" | "processing" | "completed" | "failed";

export interface DocumentSource {
  id: string;
  collection: string;
}

// ── Kind-specific type literals ──────────────────────────────────────────

export type DataDocumentType = "json" | "text" | "table";
export type FileDocumentType = "image" | "pdf" | "doc" | "csv";
export type NodeDocumentType = "chunk" | "entity" | "relation";
export type DocumentType = DataDocumentType | FileDocumentType | NodeDocumentType;

// ── Shared base ───────────────────────────────────────────────────────────

interface DocumentBase {
  id: string;
  orgId: string;
  storeId: string;
  name: string;
  keywords: string[];
  source: DocumentSource;
  data: Record<string, unknown> | string | null;
  // AI enrichment fields (top-level, flat)
  status: AiStatus;
  error: string | null;
  summary: string | null;
  // Meta
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ── The Discriminated Union (Source of Truth) ────────────────────────────

export type StoreDocument = DocumentBase &
  (
    | { kind: "file"; type: FileDocumentType; path: string; mimeType: string; sizeBytes: number; extractedText: string | null }
    | { kind: "data"; type: DataDocumentType }
    | { kind: "node"; type: NodeDocumentType; parentId: string }
  );

// For backward compatibility and UI usage
export type DocumentKind = StoreDocument["kind"];
export type Resource = StoreDocument;
