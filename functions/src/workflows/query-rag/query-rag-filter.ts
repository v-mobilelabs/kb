import { type Document } from "genkit/retriever";

export function formatResults(docs: Document[]) {
  return docs.map((doc) => {
    const meta = doc.metadata ?? {};
    return {
      id: (meta.docId ?? meta.id ?? "") as string,
      data: (meta.data ?? null) as Record<string, unknown> | string | null,
      source: (meta.source ?? null) as {
        id: string;
        collection: string;
      } | null,
      summary: (meta.summary ?? doc.text ?? null) as string | null,
      updatedAt: (meta.updatedAt ?? null) as string | null,
      score: meta.score as number | undefined,
    };
  });
}
