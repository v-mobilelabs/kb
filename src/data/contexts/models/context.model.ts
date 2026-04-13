export interface Context {
  id: string;
  orgId: string;
  name: string;
  windowSize: number | null;
  documentCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
