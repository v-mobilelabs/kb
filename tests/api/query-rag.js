#!/usr/bin/env node

/**
 * Test RAG Queries Against Seeded Store
 *
 * Usage:
 *   API_KEY=<key> ORG_ID=<org> STORE_ID=<store> node query-rag.js [--query "Your question?"]
 *
 * Environment variables:
 *   API_KEY      - Firebase Cloud Functions API key
 *   ORG_ID       - Organization ID
 *   STORE_ID     - Store ID (from seeding script)
 *   API_BASE_URL - Base URL (default: https://api-kmmv2nm7nq-uc.a.run.app)
 *
 * Interactive mode (no --query):
 *   Prompts for questions and streams results
 */

const https = require("https");
const readline = require("readline");

// ────────────────────────────────────────────────────────────────────────
// Configuration
// ────────────────────────────────────────────────────────────────────────

const API_KEY = process.env.API_KEY;
const ORG_ID = process.env.ORG_ID;
const STORE_ID = process.env.STORE_ID;
const API_BASE_URL =
  process.env.API_BASE_URL || "https://api-kmmv2nm7nq-uc.a.run.app";

const args = process.argv.slice(2);
const queryArg = args.includes("--query")
  ? args[args.indexOf("--query") + 1]
  : null;
const topKArg = args.includes("--topk") ? args[args.indexOf("--topk") + 1] : 5;
const kindArg = args.includes("--kind")
  ? args[args.indexOf("--kind") + 1]
  : null;
const sourceIdArg = args.includes("--source-id")
  ? args[args.indexOf("--source-id") + 1]
  : null;
const sourceCollectionArg = args.includes("--source-collection")
  ? args[args.indexOf("--source-collection") + 1]
  : null;

// ────────────────────────────────────────────────────────────────────────
// Validation
// ────────────────────────────────────────────────────────────────────────

if (!API_KEY) {
  console.error("❌ ERROR: API_KEY environment variable is required");
  process.exit(1);
}

if (!ORG_ID) {
  console.error("❌ ERROR: ORG_ID environment variable is required");
  process.exit(1);
}

if (!STORE_ID) {
  console.error("❌ ERROR: STORE_ID environment variable is required");
  process.exit(1);
}

// ────────────────────────────────────────────────────────────────────────
// Pre-defined Test Queries
// ────────────────────────────────────────────────────────────────────────

const TEST_QUERIES = [
  "What is machine learning?",
  "How do we handle fault tolerance in distributed systems?",
  "Best practices for performance optimization",
  "What are microservices and their benefits?",
  "Explain the principles of cloud computing",
  "How does kubernetes help with container orchestration?",
  "What is API-driven development?",
  "Security considerations for modern applications",
  "Monitoring and observability in production systems",
  "Database design patterns and best practices",
];

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

function formatResult(result) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`✅ Query Successful\n`);

  if (result.data.results && Array.isArray(result.data.results)) {
    console.log(
      `📊 Results (${result.data.results.length} documents found):\n`,
    );

    result.data.results.forEach((doc, idx) => {
      console.log(`[${idx + 1}] ${doc.name || "Unnamed Document"}`);
      if (doc.summary) {
        console.log(`    Summary: ${doc.summary}`);
      }
      if (doc.keywords && doc.keywords.length > 0) {
        console.log(`    Keywords: ${doc.keywords.join(", ")}`);
      }
      console.log(`    Status: ${doc.aiStatus || "unknown"}`);
      if (doc.similarity !== undefined) {
        console.log(`    Similarity: ${(doc.similarity * 100).toFixed(1)}%`);
      }
      console.log();
    });
  }

  if (result.data.answer) {
    console.log(`💬 Generated Answer:\n${result.data.answer}\n`);
  }

  if (result.data.context) {
    console.log(`📖 Context:\n${result.data.context}\n`);
  }

  console.log(`${"═".repeat(60)}\n`);
}

function displayError(result, query) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`❌ Query Failed\n`);
  console.log(`Query: "${query}"`);
  console.log(`Status: ${result.status}`);
  console.log(`Error: ${result.data.error || "Unknown error"}`);
  if (result.data.details) {
    console.log(`Details: ${result.data.details}`);
  }
  console.log(`${"═".repeat(60)}\n`);
}

function prompt(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function executeQuery(query, filters = {}, topK = null) {
  try {
    console.log(`\n🔍 Querying: "${query}"`);
    if (Object.keys(filters).length > 0) {
      console.log(`📋 Filters: ${JSON.stringify(filters)}`);
    }
    console.log(`⏳ Waiting for results...\n`);

    const payload = {
      storeId: STORE_ID,
      query,
      topK: topK !== null ? topK : parseInt(topKArg),
    };

    if (Object.keys(filters).length > 0) {
      payload.filters = filters;
    }

    const result = await makeRequest("POST", `/api/v1/query`, payload);

    if (result.status === 200) {
      formatResult(result);
      return true;
    } else {
      displayError(result, query);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error executing query:`, error.message);
    return false;
  }
}

async function interactiveMode() {
  console.log(`\n🧪 RAG Query Tester — Interactive Mode`);
  console.log(`════════════════════════════════════════════════════\n`);
  console.log(`Store ID: ${STORE_ID}`);
  console.log(`Top-K Results: ${topKArg}\n`);

  console.log(`Enter your questions or choose from suggestions:\n`);
  console.log(`Suggested queries:`);
  TEST_QUERIES.slice(0, 5).forEach((q, idx) => {
    console.log(`  ${idx + 1}. ${q}`);
  });
  console.log(`  6. ${TEST_QUERIES[5]}`);
  console.log(`  (type 'help' for more, 'quit' to exit)\n`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let currentFilters = {};

  const askQuestion = () => {
    rl.question("Enter query or option: ", async (input) => {
      const cmd = input.trim().toLowerCase();

      if (cmd === "quit" || cmd === "exit") {
        console.log(`\n👋 Goodbye!\n`);
        rl.close();
        process.exit(0);
      }

      if (cmd === "help") {
        console.log(`\nAvailable commands:`);
        console.log(
          `  help                                   - Show this help message`,
        );
        console.log(
          `  list                                   - Show all suggested queries`,
        );
        console.log(
          `  filters                                - Show current filters`,
        );
        console.log(
          `  filter:kind=<type>                     - Set document kind filter (e.g., pdf, doc, sheet)`,
        );
        console.log(
          `  filter:source-id=<id>                  - Set source ID filter`,
        );
        console.log(
          `  filter:source-collection=<collection>  - Set source collection filter`,
        );
        console.log(
          `  clear-filters                          - Clear all filters`,
        );
        console.log(
          `  /query                                 - Interactive query builder`,
        );
        console.log(
          `  1-10                                   - Run suggested query by number`,
        );
        console.log(
          `  <text>                                 - Run custom query`,
        );
        console.log(
          `  quit                                   - Exit interactive mode\n`,
        );
        askQuestion();
        return;
      }

      if (cmd === "filters") {
        if (Object.keys(currentFilters).length === 0) {
          console.log(`\n📋 No filters currently set\n`);
        } else {
          console.log(`\n📋 Current filters:`);
          Object.entries(currentFilters).forEach(([k, v]) => {
            console.log(`   ${k}: ${v}`);
          });
          console.log();
        }
        askQuestion();
        return;
      }

      if (cmd === "clear-filters") {
        currentFilters = {};
        console.log(`✨ Filters cleared\n`);
        askQuestion();
        return;
      }

      if (cmd === "/query") {
        console.log(`\n📝 Query Builder\n`);
        (async () => {
          const query = await prompt(rl, "Enter your query: ");
          if (!query) {
            console.log(`❌ Query cannot be empty\n`);
            askQuestion();
            return;
          }

          const topKStr = await prompt(
            rl,
            `Enter top-K results (default: ${topKArg}): `,
          );
          const topK = topKStr ? parseInt(topKStr) : parseInt(topKArg);
          if (isNaN(topK) || topK < 1 || topK > 50) {
            console.log(`❌ Invalid topK. Must be 1-50\n`);
            askQuestion();
            return;
          }

          console.log(
            `\nCurrent filters: ${JSON.stringify(currentFilters) || "(none)"}`,
          );
          const addFilters = await prompt(
            rl,
            "Add more filters? (y/n, default: n): ",
          );

          if (addFilters.toLowerCase() === "y") {
            console.log(`\nFilter options: kind, source-id, source-collection`);
            const filterStr = await prompt(
              rl,
              "Enter filter (format: key=value): ",
            );
            if (filterStr) {
              const [key, value] = filterStr.split("=");
              if (key && value) {
                const filterKeyMap = {
                  kind: "kind",
                  "source-id": "source.id",
                  "source-collection": "source.collection",
                };
                const mappedKey = filterKeyMap[key.trim()];
                if (mappedKey) {
                  currentFilters[mappedKey] = value.trim();
                  console.log(
                    `✅ Added filter: ${mappedKey} = ${value.trim()}\n`,
                  );
                } else {
                  console.log(`❌ Unknown filter key: ${key}\n`);
                }
              }
            }
          }

          const summary = {
            query,
            topK,
            filters:
              Object.keys(currentFilters).length > 0
                ? currentFilters
                : "(none)",
          };
          console.log(`\n📊 Query Summary:`);
          console.log(`   Query: "${query}"`);
          console.log(`   Top-K: ${topK}`);
          console.log(`   Filters: ${JSON.stringify(summary.filters)}\n`);

          const confirm = await prompt(rl, "Execute query? (y/n): ");
          if (confirm.toLowerCase() === "y") {
            await executeQuery(query, currentFilters, topK);
          }

          askQuestion();
        })();
        return;
      }

      if (cmd.startsWith("filter:")) {
        const filterPart = cmd.replace("filter:", "");
        const [key, value] = filterPart.split("=");
        if (key && value) {
          const filterKeyMap = {
            kind: "kind",
            "source-id": "source.id",
            "source-collection": "source.collection",
          };
          const mappedKey = filterKeyMap[key];
          if (mappedKey) {
            currentFilters[mappedKey] = value;
            console.log(`✅ Set filter ${mappedKey} = ${value}\n`);
          } else {
            console.log(
              `❌ Unknown filter key: ${key}. Valid keys: kind, source-id, source-collection\n`,
            );
          }
        } else {
          console.log(`❌ Invalid filter format. Use: filter:key=value\n`);
        }
        askQuestion();
        return;
      }

      if (cmd === "list") {
        console.log(`\nAll suggested queries:\n`);
        TEST_QUERIES.forEach((q, idx) => {
          console.log(`  ${idx + 1}. ${q}`);
        });
        console.log();
        askQuestion();
        return;
      }

      const num = parseInt(cmd);
      if (!isNaN(num) && num > 0 && num <= TEST_QUERIES.length) {
        const success = await executeQuery(
          TEST_QUERIES[num - 1],
          currentFilters,
        );
        askQuestion();
        return;
      }

      if (cmd.length > 0) {
        const success = await executeQuery(cmd, currentFilters);
        askQuestion();
        return;
      }

      askQuestion();
    });
  };

  askQuestion();
}

async function batchMode() {
  console.log(`\n🧪 RAG Query Tester — Batch Mode`);
  console.log(`════════════════════════════════════════════════════\n`);
  console.log(`Store ID: ${STORE_ID}`);
  console.log(`Query: "${queryArg}"`);
  console.log(`Top-K Results: ${topKArg}\n`);

  const filters = {};
  if (kindArg) {
    filters.kind = kindArg;
    console.log(`📋 Filter: kind = ${kindArg}`);
  }
  if (sourceIdArg) {
    filters["source.id"] = sourceIdArg;
    console.log(`📋 Filter: source.id = ${sourceIdArg}`);
  }
  if (sourceCollectionArg) {
    filters["source.collection"] = sourceCollectionArg;
    console.log(`📋 Filter: source.collection = ${sourceCollectionArg}`);
  }
  if (Object.keys(filters).length > 0) {
    console.log();
  }

  await executeQuery(queryArg, filters);
}

// ────────────────────────────────────────────────────────────────────────
// Main Execution
// ────────────────────────────────────────────────────────────────────────

if (queryArg) {
  batchMode();
} else {
  interactiveMode();
}
