import { getStorage, type Storage } from "firebase-admin/storage";
import { adminApp, getProjectId } from "./admin-firestore.js";

export const adminStorage: Storage = getStorage(adminApp);

export function getBucket() {
  const bucketName =
    process.env.FIREBASE_STORAGE_BUCKET ??
    `${getProjectId()}.firebasestorage.app`;
  return adminStorage.bucket(bucketName);
}
