import { adminRtdb } from "@/lib/firebase/admin";

export interface CacheEntry {
  orgId: string;
  apiKeyId: string;
}

/**
 * Repository for API key cache backed by Firebase Realtime Database.
 * Keys are stored at /apiKeys/{plaintext-key} for O(1) middleware lookups.
 * Entries are removed immediately on revoke or account deletion so that
 * the Cloud Functions middleware rejects them without a Firestore round-trip.
 */
export class CacheRepository {
  private ref(key: string) {
    return adminRtdb.ref(`apiKeys/${key}`);
  }

  async set(key: string, entry: CacheEntry): Promise<void> {
    await this.ref(key).set(entry);
  }

  async remove(key: string): Promise<void> {
    await this.ref(key).remove();
  }

  async removeMany(keys: string[]): Promise<void> {
    await Promise.all(keys.map((k) => this.ref(k).remove()));
  }
}
