import { genkit } from "genkit";
import { vertexAI } from "@genkit-ai/google-genai";
import { vertexRerankers } from "@genkit-ai/vertexai/rerankers";
import { enableFirebaseTelemetry } from "@genkit-ai/firebase";

enableFirebaseTelemetry();

console.log("[genkit] Initializing with vertexAI and vertexRerankers plugins");

export const ai = genkit({
  plugins: [vertexAI(), vertexRerankers()],
});

console.log("[genkit] Initialization complete");
