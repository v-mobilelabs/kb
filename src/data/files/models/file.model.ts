/**
 * File type discriminator for different file kinds
 */
export type FileKind =
  | "image"
  | "pdf"
  | "doc"
  | "sheet"
  | "video"
  | "audio"
  | "text"
  | "other";

/**
 * File model representing an uploaded file in an organization's store
 * Stored at: /organizations/{orgId}/files/{id}
 */
export interface File {
  /** Firestore document ID (UUID) */
  id: string;

  /** Organisation ID (denormalised for security scoping) */
  orgId: string;

  /** Original filename as provided by the user (displayed in UI) */
  originalName: string;

  /** File name stored in Firebase Cloud Storage (UUID.extension) */
  fileName: string;

  /** File size in bytes (max 50 MB = 52,428,800 bytes) */
  size: number;

  /** MIME type detected from the uploaded file */
  mimeType: string;

  /** File kind inferred from MIME type: image, pdf, doc, sheet, video, audio, text, other */
  kind: FileKind;

  /** User ID of the uploader */
  uploadedBy: string;

  /** Creation timestamp */
  createdAt: Date;

  /** Last updated timestamp */
  updatedAt: Date;
}

/**
 * File with cursor metadata for pagination
 */
export interface FileWithCursor extends File {
  /** Cursor for keyset pagination */
  cursor?: string;
}

/**
 * Paginated list response for files
 */
export interface FilesListResponse {
  /** Array of files in this page */
  files: File[];

  /** Cursor for fetching the next page (null if no more items) */
  nextCursor: string | null;

  /** Total count of files matching the query (informational, not used for pagination) */
  total: number;
}

/**
 * File upload response after successful upload
 */
export interface FileUploadResponse {
  file: File;
}

/**
 * Download response containing a signed URL
 */
export interface FileDownloadResponse {
  url: string;
  expiresIn: number; // Expiry time in seconds (e.g., 900 for 15 minutes)
}

/**
 * Thumbnail response — discriminated union on `isImage`.
 * - Image files: signed Firebase Storage URL (5-min expiry)
 * - Non-image files: SVG data URL (data:image/svg+xml;base64,...)
 */
export type FileThumbnailResponse =
  | {
      isImage: true;
      /** Signed Firebase Storage URL for image thumbnail */
      url: string;
      contentType: string;
    }
  | {
      isImage: false;
      /** Base64-encoded SVG data URL: data:image/svg+xml;base64,... */
      data: string;
      contentType: "image/svg+xml";
    };
