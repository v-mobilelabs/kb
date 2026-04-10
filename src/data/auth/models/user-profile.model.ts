export type OrgSize = "1-10" | "11-50" | "51-200" | "201-1000" | "1000+";

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  orgId: string;
  onboardingCompletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
