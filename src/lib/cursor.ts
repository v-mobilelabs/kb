/**
 * Cursor encoding/decoding for Firestore cursor-based pagination
 * Cursors encode a Firestore reference point (id + sortValue) for keyset pagination
 */

/**
 * Represents a Firestore cursor reference point
 */
export interface CursorPayload {
  id: string;
  sortValue: string | number;
}

/**
 * Base64url encodes a cursor object for safe transmission via URL params
 * @param item - Object with id and sortValue
 * @returns Base64url-encoded cursor string
 * @example
 * const cursor = encodeCursor({ id: 'store-123', sortValue: '2024-01-15T10:00:00Z' });
 * // cursor = 'eyJpZCI6InN0b3JlLTEyMyIsInNvcnRWYWx1ZSI6IjIwMjQtMDEtMTVUMTA6MDA6MDBaIn0'
 */
export function encodeCursor(item: CursorPayload): string {
  const json = JSON.stringify(item);
  return Buffer.from(json, "utf-8").toString("base64url");
}

/**
 * Base64url decodes a cursor string back into id and sortValue
 * Returns null if the cursor is invalid (malformed base64, invalid JSON, or missing fields)
 * Does NOT throw on invalid input
 * @param cursor - Base64url-encoded cursor string
 * @returns Decoded cursor object or null if invalid
 * @example
 * const decoded = decodeCursor('eyJpZCI6InN0b3JlLTEyMyIsInNvcnRWYWx1ZSI6IjIwMjQtMDEtMTVUMTA6MDA6MDBaIn0');
 * // decoded = { id: 'store-123', sortValue: '2024-01-15T10:00:00Z' }
 *
 * const invalid = decodeCursor('invalid-cursor');
 * // invalid = null (no throw)
 */
export function decodeCursor(cursor: string): CursorPayload | null {
  try {
    const json = Buffer.from(cursor, "base64url").toString("utf-8");
    const payload = JSON.parse(json);

    // Validate required fields
    if (
      typeof payload !== "object" ||
      payload === null ||
      typeof payload.id !== "string" ||
      (typeof payload.sortValue !== "string" &&
        typeof payload.sortValue !== "number")
    ) {
      return null;
    }

    return payload as CursorPayload;
  } catch {
    // Catch base64 decoding errors, JSON parse errors, etc.
    return null;
  }
}
