import type { OrgSize } from "../../auth/models/user-profile.model";

export interface Organization {
  id: string;
  name: string;
  size: OrgSize;
  ownerUid: string;
  createdAt: Date;
  updatedAt: Date;
}
