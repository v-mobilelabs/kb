import { VertexAI } from "@google-cloud/vertexai";
import { GoogleAuth } from "google-auth-library";
import { getProjectId } from "./admin-firestore.js";

function getProject(): string {
  return getProjectId();
}

function getLocation(): string {
  return process.env.VERTEX_AI_LOCATION ?? "us-central1";
}

let _client: VertexAI | null = null;

export function getVertexAI(): VertexAI {
  if (_client) return _client;
  _client = new VertexAI({ project: getProject(), location: getLocation() });
  return _client;
}

export function getGenerativeModel() {
  return getVertexAI().getGenerativeModel({ model: "gemini-2.5-flash" });
}

/**
 * Generates a 768-dimensional text embedding using the Vertex AI REST API.
 * Returns a zero vector when running in the local emulator.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  if (process.env.FUNCTIONS_EMULATOR === "true") {
    return new Array(768).fill(0);
  }

  const project = getProject();
  const location = getLocation();
  const auth = new GoogleAuth({
    scopes: "https://www.googleapis.com/auth/cloud-platform",
  });
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();

  const base = `https://${location}-aiplatform.googleapis.com/v1`;
  const endpoint =
    `${base}/projects/${project}/locations/${location}` +
    "/publishers/google/models/text-embedding-004:predict";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      instances: [{ content: text.slice(0, 8000) }],
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Embedding API error ${response.status}: ${await response.text()}`,
    );
  }

  const data = (await response.json()) as {
    predictions: [{ embeddings: { values: number[] } }];
  };
  return data.predictions[0].embeddings.values;
}
