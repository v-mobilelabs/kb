export interface Store {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  documentCount: number;
  fileCount: number;
  customCount: number;
  enableRagEvaluation: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
