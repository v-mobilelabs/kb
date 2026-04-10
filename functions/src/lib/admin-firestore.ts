import { initializeApp, getApps, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

function getAdminApp(): App {
  const existing = getApps();
  if (existing.length > 0) return existing[0] as App;

  const app = initializeApp();

  // Ensure options are populated (in Cloud Functions, this happens automatically)
  if (!app.options.projectId) {
    console.warn("[admin-firestore] Project ID not set on admin app");
  }

  return app;
}

export const adminApp: App = getAdminApp();
export const adminDb: Firestore = getFirestore(adminApp);

/**
 * Get project ID with fallback to environment variables.
 * Cloud Functions v2 does not set GOOGLE_CLOUD_PROJECT env var,
 * so we rely on admin SDK initialization which has access to credentials.
 */
export function getProjectId(): string {
  const projectId =
    adminApp.options.projectId ??
    process.env.GOOGLE_CLOUD_PROJECT ??
    process.env.FIREBASE_PROJECT_ID;

  if (!projectId) {
    throw new Error(
      "Project ID not found in admin app options or environment variables",
    );
  }

  return projectId;
}
