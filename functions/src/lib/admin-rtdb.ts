import { getDatabase, type Database } from "firebase-admin/database";
import { adminApp } from "./admin-firestore.js";

let _adminRtdb: Database | undefined;

export function getAdminRtdb(): Database {
  if (!_adminRtdb) {
    _adminRtdb = getDatabase(adminApp);
  }
  return _adminRtdb;
}
