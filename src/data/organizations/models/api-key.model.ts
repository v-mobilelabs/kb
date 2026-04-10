export interface ApiKey {
  id: string;
  orgId: string;
  name: string;
  key: string; // plaintext; see spec Clarifications
  maskedKey: string; // cmo_...XXXX
  isRevoked: boolean;
  revokedAt: Date | null;
  createdAt: Date;
  lastUsedAt: Date | null;
}
