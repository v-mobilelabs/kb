import type {
  QueryDocumentSnapshot,
  DocumentData,
  Query,
} from "firebase-admin/firestore";
import { Timestamp } from "firebase-admin/firestore";
import { AbstractFirebaseRepository } from "@/lib/abstractions/abstract-firebase-repository";
import type { File, FileKind } from "@/data/files/models/file.model";
import { decodeCursor, encodeCursor } from "@/lib/cursor";

export class FileRepository extends AbstractFirebaseRepository<File> {
  constructor(private readonly orgId: string) {
    super();
  }

  protected get collectionPath() {
    return `organizations/${this.orgId}/files`;
  }

  protected fromFirestore(snap: QueryDocumentSnapshot<DocumentData>): File {
    const d = snap.data();
    return {
      id: snap.id,
      orgId: d.orgId as string,
      originalName: d.originalName as string,
      fileName: d.fileName as string,
      size: d.size as number,
      mimeType: d.mimeType as string,
      kind: d.kind as FileKind,
      uploadedBy: d.uploadedBy as string,
      createdAt:
        d.createdAt instanceof Timestamp
          ? d.createdAt.toDate()
          : new Date(d.createdAt),
      updatedAt:
        d.updatedAt instanceof Timestamp
          ? d.updatedAt.toDate()
          : new Date(d.updatedAt),
    };
  }

  async createFile(
    fileData: Omit<File, "id" | "createdAt" | "updatedAt">,
  ): Promise<File> {
    const ref = this.collection().doc();
    const now = Timestamp.now();
    await ref.set({ ...fileData, createdAt: now, updatedAt: now });
    return {
      ...fileData,
      id: ref.id,
      createdAt: now.toDate(),
      updatedAt: now.toDate(),
    };
  }

  async getFile(fileId: string): Promise<File | null> {
    const snap = await this.docRef(fileId).get();
    if (!snap.exists) return null;
    return this.fromFirestore(snap as QueryDocumentSnapshot<DocumentData>);
  }

  async listFiles(
    options: {
      search?: string;
      sort?: "name" | "createdAt" | "size";
      order?: "asc" | "desc";
      kinds?: string[];
      cursor?: string;
      limit?: number;
    } = {},
  ): Promise<{ files: File[]; nextCursor: string | null; total: number }> {
    const limit = options.limit ?? 25;
    const sort = options.sort ?? "createdAt";
    const order = options.order ?? "desc";
    // "name" maps to the Firestore field "originalName"
    const firestoreField = sort === "name" ? "originalName" : sort;

    let query: Query<DocumentData> = this.collection();

    if (options.search) {
      const term = options.search.toLowerCase();
      query = query
        .where("originalName", ">=", term)
        .where("originalName", "<", term + "\uf8ff");
    }

    query = query.orderBy(firestoreField, order);

    let pageQuery = query.limit(limit + 1);
    if (options.cursor) {
      const decoded = decodeCursor(options.cursor);
      if (decoded) {
        pageQuery = pageQuery.startAfter(decoded.sortValue, decoded.id);
      }
    }

    const snap = await pageQuery.get();
    let files = snap.docs.map((doc) =>
      this.fromFirestore(doc as QueryDocumentSnapshot<DocumentData>),
    );

    // OR-filter on kind (in-memory; Firestore doesn't natively support multi-value OR)
    if (options.kinds && options.kinds.length > 0) {
      files = files.filter((f) => options.kinds!.includes(f.kind));
    }

    const hasMore = files.length > limit;
    if (hasMore) files.pop();

    const nextCursor =
      hasMore && files.length > 0
        ? encodeCursor({
            id: files[files.length - 1].id,
            sortValue:
              sort === "name"
                ? files[files.length - 1].originalName
                : files[files.length - 1].createdAt.getTime(),
          })
        : null;

    const countSnap = await query.count().get();
    const total = countSnap.data().count;

    return { files, nextCursor, total };
  }

  async deleteFile(fileId: string): Promise<boolean> {
    const existsRes = await this.exist(fileId);
    if (!existsRes.ok || !existsRes.value) return false;
    await this.delete(fileId);
    return true;
  }

  async updateFile(
    fileId: string,
    updates: Partial<Omit<File, "id" | "orgId" | "createdAt">>,
  ): Promise<File | null> {
    await this.docRef(fileId).update({
      ...updates,
      updatedAt: Timestamp.now(),
    });
    return this.getFile(fileId);
  }
}
