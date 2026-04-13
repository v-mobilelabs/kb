export interface ContextDocument {
  id: string;
  contextId: string;
  name?: string;
  metadata?: Record<string, unknown>;
  createdBy: string;
  createdAt: number; // Unix ms
  updatedAt: number; // Unix ms
}
