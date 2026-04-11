import { ai } from "../../lib/genkit.js";
import type { QueryOutput } from "./query-rag-schema.js";

const MODEL = "vertexai/gemini-2.5-flash";

const SYSTEM_PROMPT = [
  "You are a RAG quality judge. Given a user query and a list of retrieved document summaries,",
  "evaluate whether the documents collectively answer the query.",
  "Return JSON only — no markdown, no explanation outside the JSON object.",
  "",
  "Response format:",
  "{",
  "  \"relevant\": <true if the documents sufficiently answer the query, false otherwise>,",
  "  \"confidence\": <float 0.0–1.0 representing how confident you are in the relevance judgment>,",
  "  \"reasoning\": \"<one concise sentence explaining the judgment>\",",
  "  \"answer\": \"<synthesised answer drawn only from the provided documents, or an empty string if not relevant>\"",
  "}",
].join("\n");

export interface JudgmentResult {
  relevant: boolean;
  confidence: number;
  reasoning: string;
  answer: string;
}

export async function judgeRagResult(
  query: string,
  sources: QueryOutput["sources"],
): Promise<JudgmentResult> {
  const fallback: JudgmentResult = {
    relevant: sources.length > 0,
    confidence: 0,
    reasoning: "LLM judge failed.",
    answer: "",
  };

  try {
    const judgment = await ai.run("query-rag-judge", async () => {
      const context = sources
        .map((s, i) => {
          const summary = s.summary ?? s.id;
          const dataStr = s.data ? JSON.stringify(s.data) : "";
          return `[${i + 1}] Summary: ${summary}\nData: ${dataStr}`;
        })
        .join("\n\n");

      const result = await ai.generate({
        model: MODEL,
        system: SYSTEM_PROMPT,
        prompt: `Query: ${query}\n\nRetrieved documents:\n${context}`,
        output: { format: "json" },
      });

      const data = result.output as Partial<JudgmentResult> | null;

      const judgment: JudgmentResult = {
        relevant: data?.relevant ?? sources.length > 0,
        confidence: typeof data?.confidence === "number" ?
          Math.min(1, Math.max(0, data.confidence)) :
          0,
        reasoning: typeof data?.reasoning === "string" ? data.reasoning : "",
        answer: typeof data?.answer === "string" ? data.answer : "",
      };
      return judgment;
    });
    return judgment;
  } catch (err) {
    const e = err instanceof Error ? err : new Error(String(err));
    console.warn(`[queryRag] LLM judge failed, using fallback: ${e.message}`);
    return fallback;
  }
}
