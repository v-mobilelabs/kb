import type { FileKind } from "@/data/files/models/file.model";

/**
 * Exact MIME-type → FileKind mappings
 */
const MIME_EXACT: Record<string, FileKind> = {
  // Images
  "image/jpeg": "image",
  "image/png": "image",
  "image/gif": "image",
  "image/webp": "image",
  "image/svg+xml": "image",
  "image/tiff": "image",
  "image/bmp": "image",
  "image/avif": "image",
  "image/heic": "image",
  // PDF
  "application/pdf": "pdf",
  // Documents
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "doc",
  "application/vnd.oasis.opendocument.text": "doc",
  "application/rtf": "doc",
  // Sheets
  "application/vnd.ms-excel": "sheet",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "sheet",
  "application/vnd.oasis.opendocument.spreadsheet": "sheet",
  "text/csv": "sheet",
  // Video
  "video/mp4": "video",
  "video/webm": "video",
  "video/ogg": "video",
  "video/quicktime": "video",
  "video/x-msvideo": "video",
  // Audio
  "audio/mpeg": "audio",
  "audio/mp3": "audio",
  "audio/ogg": "audio",
  "audio/wav": "audio",
  "audio/webm": "audio",
  "audio/flac": "audio",
  "audio/aac": "audio",
  // Text
  "text/plain": "text",
  "text/markdown": "text",
  "text/html": "text",
  "text/xml": "text",
  "application/json": "text",
  "application/xml": "text",
};

/**
 * Prefix → FileKind fallback (checked if exact match not found)
 */
const MIME_PREFIX: Array<[string, FileKind]> = [
  ["image/", "image"],
  ["video/", "video"],
  ["audio/", "audio"],
  ["text/", "text"],
];

/**
 * Infer a FileKind from a MIME type.
 * Checks exact match first, then falls back to prefix matching,
 * then returns "other".
 */
export function inferFileKind(mimeType: string): FileKind {
  const normalised = mimeType.toLowerCase().trim();

  const exact = MIME_EXACT[normalised];
  if (exact) return exact;

  for (const [prefix, kind] of MIME_PREFIX) {
    if (normalised.startsWith(prefix)) return kind;
  }

  return "other";
}
