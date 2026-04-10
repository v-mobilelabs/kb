import { ai } from "../../lib/genkit.js";

const JSON_SYSTEM_PROMPT = [
  "You are a metadata tagger. Given a JSON document name",
  "and its content, return up to 20 relevant keyword tags",
  "and a concise 2-sentence summary. Return JSON only.",
  "",
  "Response format:",
  "{ \"keywords\": [\"<tag1>\", \"<tag2>\", ...],",
  "  \"summary\": \"<2-sentence summary>\" }.",
].join("\n");

interface LlmEnrichmentResult {
  keywords: string[];
  summary: string | null;
}

export async function extractKeywordsAndSummary(
  name: string,
  text: string,
): Promise<LlmEnrichmentResult> {
  if (process.env.FUNCTIONS_EMULATOR === "true") {
    return { keywords: [], summary: null };
  }

  const jsonText = text.slice(0, 6000);
  const result = await ai.generate({
    model: "vertexai/gemini-2.5-flash",
    system: JSON_SYSTEM_PROMPT,
    prompt: `Document name: ${name}\nJSON content:\n${jsonText}`,
    output: { format: "json" },
  });

  const data = result.output as {
    keywords?: string[];
    summary?: string;
  } | null;

  const keywords = (data?.keywords ?? [])
    .filter((k): k is string => typeof k === "string")
    .slice(0, 20)
    .map((k) => k.toLowerCase());

  return {
    keywords,
    summary: data?.summary ?? null,
  };
}
