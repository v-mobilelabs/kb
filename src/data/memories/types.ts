export interface Memory {
  id: string;
  description: string | null;
  documentCapacity: number;
  condenseThresholdPercent: number;
  documentCount: number;
  sessionId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryDocument {
  id: string;
  title: string;
  content: string;
  isCondensationSummary: boolean;
  sessionId: string;
  createdAt: Date;
  updatedAt: Date;
}
