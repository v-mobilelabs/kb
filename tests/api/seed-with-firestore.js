#!/usr/bin/env node

/**
 * Seed Store with Random Documents (using Firestore Admin SDK)
 *
 * This script:
 * 1. Creates a new store via API
 * 2. Seeded documents directly into Firestore with random technical content
 * 3. Displays the store ID and document summaries
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=<path> API_KEY=<key> ORG_ID=<org> node seed-with-firestore.js [--documents 10]
 *
 * Environment variables:
 *   GOOGLE_APPLICATION_CREDENTIALS - Path to Firebase service account JSON
 *   API_KEY                         - Firebase Cloud Functions API key
 *   ORG_ID                          - Organization ID
 *   API_BASE_URL                    - Base URL (default: https://api-kmmv2nm7nq-uc.a.run.app)
 */

const https = require("https");
const { initializeApp, cert } = require("firebase-admin/app");
const {
  getFirestore,
  Timestamp,
  FieldValue,
} = require("firebase-admin/firestore");
const fs = require("fs");
const path = require("path");

// ────────────────────────────────────────────────────────────────────────
// Configuration
// ────────────────────────────────────────────────────────────────────────

const CREDENTIALS_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const API_KEY = process.env.API_KEY;
const ORG_ID = process.env.ORG_ID;
const API_BASE_URL =
  process.env.API_BASE_URL || "https://api-kmmv2nm7nq-uc.a.run.app";

const args = process.argv.slice(2);
const storeName = args.includes("--store-name")
  ? args[args.indexOf("--store-name") + 1]
  : `Test Store ${Date.now()}`;
const documentCount = parseInt(
  args.includes("--documents") ? args[args.indexOf("--documents") + 1] : "10",
);

// ────────────────────────────────────────────────────────────────────────
// Validation
// ────────────────────────────────────────────────────────────────────────

if (!CREDENTIALS_PATH) {
  console.error(
    "❌ ERROR: GOOGLE_APPLICATION_CREDENTIALS environment variable is required",
  );
  process.exit(1);
}

if (!fs.existsSync(CREDENTIALS_PATH)) {
  console.error(`❌ ERROR: Credentials file not found at ${CREDENTIALS_PATH}`);
  process.exit(1);
}

if (!API_KEY) {
  console.error("❌ ERROR: API_KEY environment variable is required");
  process.exit(1);
}

if (!ORG_ID) {
  console.error("❌ ERROR: ORG_ID environment variable is required");
  process.exit(1);
}

console.log(`\n🌱 Seeding Store with Random Documents\n`);
console.log(`📋 Configuration:`);
console.log(`   API Base URL: ${API_BASE_URL}`);
console.log(`   Organization: ${ORG_ID}`);
console.log(`   Store Name: ${storeName}`);
console.log(`   Documents to Create: ${documentCount}`);
console.log(`   Credentials: ${CREDENTIALS_PATH}\n`);

// ────────────────────────────────────────────────────────────────────────
// Initialize Firebase
// ────────────────────────────────────────────────────────────────────────

let db;
try {
  const serviceAccount = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf-8"));
  const app = initializeApp({
    credential: cert(serviceAccount),
  });
  db = getFirestore(app);
  console.log(`✅ Firebase initialized\n`);
} catch (error) {
  console.error(`❌ Failed to initialize Firebase:`, error.message);
  process.exit(1);
}

// ────────────────────────────────────────────────────────────────────────
// Utilities
// ────────────────────────────────────────────────────────────────────────

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
      },
    };

    const fullUrl = new URL(path, API_BASE_URL);
    const request = https.request(fullUrl, options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: parsed });
        } catch (err) {
          resolve({ status: res.statusCode, data, raw: true });
        }
      });
    });

    request.on("error", reject);
    if (body) request.write(JSON.stringify(body));
    request.end();
  });
}

// ────────────────────────────────────────────────────────────────────────
// Random Data Generators
// ────────────────────────────────────────────────────────────────────────

const TOPICS = [
  "machine learning",
  "distributed systems",
  "cloud computing",
  "kubernetes",
  "microservices",
  "database design",
  "api development",
  "security",
  "performance optimization",
  "monitoring",
  "testing",
  "devops",
];

const SUBTOPICS = {
  "machine learning": [
    "neural networks",
    "transformers",
    "nlp",
    "computer vision",
    "model training",
  ],
  "distributed systems": [
    "consensus",
    "replication",
    "partitioning",
    "fault tolerance",
    "load balancing",
  ],
  "cloud computing": [
    "serverless",
    "containers",
    "infrastructure as code",
    "auto-scaling",
    "cost optimization",
  ],
  kubernetes: [
    "deployment",
    "services",
    "operators",
    "helm",
    "security policies",
  ],
  microservices: [
    "service discovery",
    "circuit breakers",
    "rate limiting",
    "api gateway",
    "tracing",
  ],
  "database design": [
    "indexing",
    "sharding",
    "replication",
    "caching",
    "query optimization",
  ],
  "api development": [
    "rest",
    "graphql",
    "authentication",
    "rate limiting",
    "versioning",
  ],
  security: [
    "encryption",
    "authentication",
    "authorization",
    "vulnerability scanning",
    "penetration testing",
  ],
  "performance optimization": [
    "caching",
    "profiling",
    "memory management",
    "database queries",
    "algorithmic efficiency",
  ],
};

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomContent(topic, subtopic) {
  const sentences = [
    `This document covers best practices for ${topic} with a focus on ${subtopic}.`,
    `Understanding ${subtopic} in the context of ${topic} is essential for modern engineering.`,
    `Our team has learned valuable lessons about ${subtopic} after working with ${topic} systems.`,
    `Key considerations when implementing ${subtopic} for ${topic}:`,
    `1. Scalability: Design for growth from the start`,
    `2. Reliability: Implement proper error handling and monitoring`,
    `3. Performance: Profile and optimize hotspots`,
    `4. Maintainability: Keep code clean and well-documented`,
    `5. Security: Follow industry best practices`,
    `Common pitfalls to avoid when working with ${subtopic}:`,
    `- Premature optimization without profiling`,
    `- Ignoring edge cases and failure modes`,
    `- Skipping observability until problems arise`,
    `- Over-engineering simple solutions`,
    `- Neglecting documentation and knowledge sharing`,
  ];

  return sentences.join(" ");
}

function generateRandomDocument() {
  const topic = randomChoice(TOPICS);
  const subtopic = randomChoice(
    SUBTOPICS[topic] || ["fundamentals", "best practices"],
  );

  const data = {
    topic,
    subtopic,
    title: `${topic} — ${subtopic}`,
    content: generateRandomContent(topic, subtopic),
    tags: [topic, subtopic, "engineering"],
    timestamp: new Date().toISOString(),
    origin: "seed-with-firestore",
  };

  return {
    name: `${topic.replace(/ /g, "-")}-${subtopic.replace(/ /g, "-")}-${Math.random().toString(36).substr(2, 9)}`,
    kind: "data",
    data,
    source: { id: "firestore-seed", collection: "seeded-documents" },
    keywords: [topic, subtopic, "engineering"],
  };
}

// ────────────────────────────────────────────────────────────────────────
// Main Execution
// ────────────────────────────────────────────────────────────────────────

async function main() {
  try {
    // 1. Create Store via API
    console.log(`📦 Creating store via API...\n`);

    const storeResponse = await makeRequest("POST", `/api/v1/store`, {
      name: storeName,
      description: `Seeded with ${documentCount} random documents for testing RAG queries`,
      source: {
        id: "firestore-seed",
        collection: "seeded-documents",
      },
    });

    if (storeResponse.status !== 201) {
      console.error(
        `❌ Failed to create store: ${storeResponse.status}`,
        storeResponse.data,
      );
      process.exit(1);
    }

    const storeId = storeResponse.data.store.id;
    console.log(`✅ Store created: ${storeId}\n`);

    // 2. Seed documents via Firestore
    console.log(`📄 Seeding ${documentCount} documents via Firestore...\n`);

    const seedResults = [];
    const batch = db.batch();

    for (let i = 0; i < documentCount; i++) {
      const doc = generateRandomDocument();
      const docRef = db.doc(
        `organizations/${ORG_ID}/stores/${storeId}/documents/${doc.name}`,
      );

      batch.set(docRef, {
        id: doc.name,
        orgId: ORG_ID,
        storeId,
        name: doc.name,
        kind: doc.kind,
        data: doc.data,
        source: doc.source,
        keywords: doc.keywords,
        type: "json",
        status: "pending",
        embedding: null,
        content: {
          summary: null,
        },
        error: null,
        createdBy: "seed-script",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      seedResults.push({
        id: doc.name,
        ...doc.data,
      });

      console.log(`   [${i + 1}/${documentCount}] ${doc.name}`);
    }

    await batch.commit();
    console.log(`\n✅ All documents seeded to Firestore\n`);

    // Update store's documentCount
    console.log(`📊 Updating store document count...\n`);
    const storeRef = db.doc(`organizations/${ORG_ID}/stores/${storeId}`);
    await storeRef.update({
      documentCount: documentCount,
      customCount: documentCount,
    });
    console.log(`✅ Store document count updated\n`);

    // 3. Display Results
    console.log(`════════════════════════════════════════════════════`);
    console.log(`🎯 Store Seeding Complete\n`);
    console.log(`Store Details:`);
    console.log(`  ID: ${storeId}`);
    console.log(`  Name: ${storeName}`);
    console.log(`  Organization: ${ORG_ID}`);
    console.log(`  Documents Created: ${documentCount}\n`);

    console.log(`📊 Document Examples:\n`);
    seedResults.slice(0, 3).forEach((doc, idx) => {
      console.log(`  [${idx + 1}] ${doc.title}`);
      console.log(`      Topic: ${doc.topic} → ${doc.subtopic}`);
    });

    if (documentCount > 3) {
      console.log(`  ... and ${documentCount - 3} more documents\n`);
    } else {
      console.log();
    }

    console.log(`⏳ Next Steps:\n`);
    console.log(
      `1. Wait for documents to be enriched (check Google Cloud Functions logs)`,
    );
    console.log(`   Status progression: pending → processing → done\n`);

    console.log(`2. Run RAG query tests:`);
    console.log(
      `   API_KEY=${API_KEY} ORG_ID=${ORG_ID} STORE_ID=${storeId} node query-rag.js\n`,
    );

    console.log(`3. Example queries to try:`);
    console.log(`   - "What is machine learning?"`);
    console.log(`   - "How do we handle fault tolerance?"`);
    console.log(`   - "Best practices for performance optimization"`);

    console.log(`\n📋 Store ID for testing: ${storeId}`);
    console.log(`════════════════════════════════════════════════════\n`);

    process.exit(0);
  } catch (error) {
    console.error(`❌ Error during seeding:`, error.message);
    process.exit(1);
  }
}

main();
