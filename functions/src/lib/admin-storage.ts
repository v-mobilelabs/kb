import { getStorage, type Storage } from "firebase-admin/storage";
import { adminApp } from "./admin-firestore.js";

export const adminStorage: Storage = getStorage(adminApp);

export function getBucket() {
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  if (!bucketName) throw new Error("FIREBASE_STORAGE_BUCKET is not set");
  return adminStorage.bucket(bucketName);
}
