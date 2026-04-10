import { getStorage, type Storage } from "firebase-admin/storage";
import { adminDb as _adminDb } from "@/lib/firebase/admin";

// Reuse the existing admin app that was already initialised in admin.ts.
// Importing adminDb ensures the app singleton is created before we call getStorage().
void _adminDb;

export const adminStorage: Storage = getStorage();

export function getBucket() {
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  if (!bucketName) throw new Error("FIREBASE_STORAGE_BUCKET is not set");
  return adminStorage.bucket(bucketName);
}
