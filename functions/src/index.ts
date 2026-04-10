export {
  enrichCustomDocument,
  enrichCustomDocumentOnUpdate,
} from "./handles/enrich-custom-document.js";
export { onStoreDocumentDeleted } from "./handles/on-store-document-deleted.js";

import { onRequest } from "firebase-functions/v2/https";
import { app } from "./api/app.js";

export const api = onRequest({ memory: "512MiB", timeoutSeconds: 300 }, app);
