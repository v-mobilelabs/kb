/**
 * A context document represents a message or content piece in a context.
 */
export interface ContextDocument {
  /**
   * A unique identifier for the document.
   */
  id: string;

  /**
   * The role of the document (system, user, or assistant).
   */
  role: "system" | "user" | "assistant";

  /**
   * Optional metadata associated with the document.
   */
  metadata?: unknown;

  /**
   * The parts/content of the document.
   */
  parts: unknown[];
}
