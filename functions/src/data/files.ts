import { Timestamp } from "firebase-admin/firestore";
import { v4 as uuidv4 } from "uuid";
import { adminDb } from "../lib/admin-firestore.js";
import { getBucket } from "../lib/admin-storage.js";
import { logApiKeyUsageSuccess } from "../lib/audit-logger.js";

/** File kind type (matches src/data/files/models/file.model.ts) */
type FileKind =
  | "image"
  | "pdf"
  | "doc"
  | "sheet"
  | "video"
  | "audio"
  | "text"
  | "other";

interface CreateFileInput {
  orgId: string;
  apiKeyId: string;
  originalName: string;
  mimeType: string;
  fileBuffer: Buffer;
}

interface FileData {
  id: string;
  orgId: string;
  originalName: string;
  fileName: string;
  size: number;
  mimeType: string;
  kind: FileKind;
  uploadedBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Infer file kind from MIME type
 */
export function inferFileKind(mimeType: string): FileKind {
  const lowerMime = mimeType.toLowerCase();

  if (/^image\//i.test(lowerMime)) return "image";
  if (/^application\/pdf$/i.test(lowerMime)) return "pdf";
  if (
    /^application\/(msword|vnd\.openxmlformats-officedocument\.wordprocessingml)/i.test(
      lowerMime,
    )
  )
    return "doc";
  if (
    /^application\/(vnd\.ms-excel|vnd\.openxmlformats-officedocument\.spreadsheetml|vnd\.oasis\.opendocument\.spreadsheet)|text\/csv$/i.test(
      lowerMime,
    )
  )
    return "sheet";
  if (/^video\//i.test(lowerMime)) return "video";
  if (/^audio\//i.test(lowerMime)) return "audio";
  if (/^text\/(plain|markdown)/i.test(lowerMime)) return "text";

  return "other";
}

/**
 * Extract file extension from MIME type
 */
export function getFileExtension(mimeType: string): string {
  const lowerMime = mimeType.toLowerCase();

  if (/^image\/jpeg/.test(lowerMime)) return "jpg";
  if (/^image\/png/.test(lowerMime)) return "png";
  if (/^image\/gif/.test(lowerMime)) return "gif";
  if (/^image\/webp/.test(lowerMime)) return "webp";
  if (/^application\/pdf/.test(lowerMime)) return "pdf";
  if (
    /^application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document/.test(
      lowerMime,
    )
  )
    return "docx";
  if (/^application\/msword/.test(lowerMime)) return "doc";
  if (
    /^application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/.test(
      lowerMime,
    )
  )
    return "xlsx";
  if (/^application\/vnd\.ms-excel/.test(lowerMime)) return "xls";
  if (/^text\/csv/.test(lowerMime)) return "csv";
  if (/^text\/plain/.test(lowerMime)) return "txt";
  if (/^text\/markdown/.test(lowerMime)) return "md";
  if (/^audio\/mpeg/.test(lowerMime)) return "mp3";
  if (/^audio\/wav/.test(lowerMime)) return "wav";
  if (/^video\/mp4/.test(lowerMime)) return "mp4";
  if (/^video\/quicktime/.test(lowerMime)) return "mov";

  // Fallback
  return "bin";
}

/**
 * Create and upload a new file
 */
export async function createFile(input: CreateFileInput): Promise<FileData> {
  const { orgId, apiKeyId, originalName, mimeType, fileBuffer } = input;

  // Validate file size (50 MB max)
  const MAX_FILE_SIZE = 52_428_800; // 50 MB
  if (fileBuffer.length > MAX_FILE_SIZE) {
    throw new Error("File exceeds 50 MB limit");
  }

  // Generate file ID and name
  const fileId = uuidv4();
  const extension = getFileExtension(mimeType);
  const fileName = `${fileId}.${extension}`;
  const storagePath = `organizations/${orgId}/files/${fileName}`;

  // Upload to Firebase Cloud Storage
  const bucket = getBucket();
  const file = bucket.file(storagePath);

  try {
    await file.save(fileBuffer, {
      metadata: {
        contentType: mimeType,
        metadata: {
          originalName,
          uploadedBy: `api:${apiKeyId}`,
          uploadedAt: new Date().toISOString(),
        },
      },
    });
  } catch (err) {
    throw new Error(`Failed to upload file to storage: ${String(err)}`);
  }

  // Create Firestore document
  const now = Timestamp.now();
  const kind = inferFileKind(mimeType);
  const ref = adminDb.collection(`organizations/${orgId}/files`).doc(fileId);
  const fileData = {
    orgId,
    originalName,
    fileName,
    size: fileBuffer.length,
    mimeType,
    kind,
    uploadedBy: `api:${apiKeyId}`,
    createdAt: now,
    updatedAt: now,
  };

  await adminDb.runTransaction(async (tx) => {
    tx.set(ref, fileData);
  });

  await logApiKeyUsageSuccess(orgId, apiKeyId, {
    action: "upload_file",
    fileId,
    fileName: originalName,
    size: fileBuffer.length,
  });

  return { id: fileId, ...fileData };
}

/**
 * Get a file by ID
 */
export async function getFile(
  orgId: string,
  fileId: string,
): Promise<FileData | null> {
  const ref = adminDb.doc(`organizations/${orgId}/files/${fileId}`);
  const snap = await ref.get();

  if (!snap.exists) {
    return null;
  }

  const data = snap.data() as Record<string, unknown>;
  return {
    id: snap.id,
    orgId: data.orgId as string,
    originalName: data.originalName as string,
    fileName: data.fileName as string,
    size: data.size as number,
    mimeType: data.mimeType as string,
    kind: data.kind as FileKind,
    uploadedBy: data.uploadedBy as string,
    createdAt: data.createdAt as Timestamp,
    updatedAt: data.updatedAt as Timestamp,
  };
}

/**
 * Delete a file
 */
export async function deleteFile(
  orgId: string,
  fileId: string,
  apiKeyId: string,
): Promise<boolean> {
  // Get file document to find storage path
  const fileDoc = await getFile(orgId, fileId);
  if (!fileDoc) {
    return false;
  }

  // Delete from Cloud Storage
  const storagePath = `organizations/${orgId}/files/${fileDoc.fileName}`;
  const bucket = getBucket();
  const file = bucket.file(storagePath);

  try {
    await file.delete();
  } catch (err) {
    // Log but don't fail if storage deletion fails
    console.error(`Failed to delete file from storage: ${String(err)}`);
  }

  // Delete Firestore document
  const ref = adminDb.doc(`organizations/${orgId}/files/${fileId}`);
  await adminDb.runTransaction(async (tx) => {
    tx.delete(ref);
  });

  await logApiKeyUsageSuccess(orgId, apiKeyId, {
    action: "delete_file",
    fileId,
    fileName: fileDoc.originalName,
  });

  return true;
}

/**
 * List files for an organisation
 */
export async function listFiles(
  orgId: string,
  options: {
    search?: string;
    sort?: "name" | "createdAt" | "size";
    order?: "asc" | "desc";
    kinds?: string[];
    limit?: number;
  } = {},
): Promise<{ files: FileData[]; total: number }> {
  const limit = options.limit ?? 25;
  const sort = options.sort ?? "createdAt";
  const order = options.order ?? "desc";

  let query: any = adminDb.collection(`organizations/${orgId}/files`);

  // Apply search filter
  if (options.search) {
    const searchTerm = options.search.toLowerCase();
    query = query
      .where("originalName", ">=", searchTerm)
      .where("originalName", "<", searchTerm + "\uf8ff");
  }

  // Apply sorting
  const orderDirection = order === "desc" ? "desc" : "asc";
  query = query.orderBy(sort, orderDirection).limit(limit);

  const snap = await query.get();

  let files = snap.docs.map((doc: any) => {
    const data = doc.data() as Record<string, unknown>;
    return {
      id: doc.id,
      orgId: data.orgId as string,
      originalName: data.originalName as string,
      fileName: data.fileName as string,
      size: data.size as number,
      mimeType: data.mimeType as string,
      kind: data.kind as FileKind,
      uploadedBy: data.uploadedBy as string,
      createdAt: data.createdAt as Timestamp,
      updatedAt: data.updatedAt as Timestamp,
    };
  });

  // Apply kind filter (in-memory)
  if (options.kinds && options.kinds.length > 0) {
    files = files.filter((f: FileData) => options.kinds?.includes(f.kind));
  }

  return { files, total: snap.size };
}
