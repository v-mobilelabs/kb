#!/usr/bin/env node

/**
 * Validate Test Environment Setup
 *
 * Checks:
 * - Required environment variables
 * - Firebase credentials
 * - Network connectivity to API
 * - Node.js version
 * - Required modules
 */

const fs = require("fs");
const https = require("https");
const path = require("path");

// Colors
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
};

function pass(msg) {
  console.log(`${colors.green}✅${colors.reset} ${msg}`);
}

function fail(msg) {
  console.log(`${colors.red}❌${colors.reset} ${msg}`);
}

function warn(msg) {
  console.log(`${colors.yellow}⚠️ ${colors.reset} ${msg}`);
}

function info(msg) {
  console.log(`${colors.blue}ℹ️ ${colors.reset} ${msg}`);
}

function section(title) {
  console.log(`\n${colors.blue}${"═".repeat(50)}${colors.reset}`);
  console.log(`${colors.blue}${title}${colors.reset}`);
  console.log(`${colors.blue}${"═".repeat(50)}${colors.reset}\n`);
}

// ────────────────────────────────────────────────────────────────────────
// Validation Functions
// ────────────────────────────────────────────────────────────────────────

function checkNode() {
  section("🔍 Node.js Version");

  const version = process.version;
  const major = parseInt(version.slice(1).split(".")[0]);

  if (major >= 14) {
    pass(`Node.js ${version} is supported`);
    return true;
  } else {
    fail(`Node.js ${version} is too old (need >= 14)`);
    return false;
  }
}

function checkEnvVariables() {
  section("🔑 Environment Variables");

  const required = ["API_KEY", "ORG_ID"];
  const optional = [
    "STORE_ID",
    "GOOGLE_APPLICATION_CREDENTIALS",
    "API_BASE_URL",
  ];

  let allPresent = true;

  for (const env of required) {
    if (process.env[env]) {
      pass(`${env} is set`);
    } else {
      fail(`${env} is NOT set (required)`);
      allPresent = false;
    }
  }

  for (const env of optional) {
    if (process.env[env]) {
      pass(`${env} is set`);
    } else {
      warn(`${env} is NOT set (optional)`);
    }
  }

  return allPresent;
}

function checkCredentials() {
  section("🔐 Firebase Credentials");

  const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!credsPath) {
    warn("GOOGLE_APPLICATION_CREDENTIALS not set");
    warn("  Firestore seeding will not work");
    warn("  Set it to use seed-with-firestore.js");
    return null;
  }

  if (!fs.existsSync(credsPath)) {
    fail(`Credentials file not found: ${credsPath}`);
    return false;
  }

  try {
    const creds = JSON.parse(fs.readFileSync(credsPath, "utf-8"));
    if (creds.type === "service_account") {
      pass(`Credentials file is valid service account`);
      pass(`  Project: ${creds.project_id}`);
      return true;
    } else {
      fail(`Credentials file is not a service account`);
      return false;
    }
  } catch (err) {
    fail(`Failed to parse credentials file: ${err.message}`);
    return false;
  }
}

function checkApiConnectivity() {
  section("🌐 API Connectivity");

  const apiBase =
    process.env.API_BASE_URL || "https://api-kmmv2nm7nq-uc.a.run.app";
  info(`Testing connectivity to: ${apiBase}/api/v1/health`);

  return new Promise((resolve) => {
    const options = {
      method: "GET",
      timeout: 5000,
    };

    const request = https.request(
      apiBase + "/api/v1/health",
      options,
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode === 200) {
            pass("API health check passed");
            pass(`  Response: ${data}`);
            resolve(true);
          } else {
            fail(`API returned status ${res.statusCode}`);
            resolve(false);
          }
        });
      },
    );

    request.on("error", (err) => {
      fail(`Failed to connect to API: ${err.message}`);
      resolve(false);
    });

    request.on("timeout", () => {
      fail("API health check timed out");
      resolve(false);
    });

    request.end();
  });
}

function checkApiKey() {
  section("🔑 API Key Validation");

  const apiKey = process.env.API_KEY;
  const apiBase =
    process.env.API_BASE_URL || "https://api-kmmv2nm7nq-uc.a.run.app";

  if (!apiKey) {
    fail("API_KEY not set");
    return Promise.resolve(false);
  }

  warn("Cannot validate API key format locally");
  info("Key will be validated when making actual API calls");

  return Promise.resolve(true);
}

function checkStoreId() {
  section("📦 Store ID");

  const storeId = process.env.STORE_ID;

  if (!storeId) {
    warn("STORE_ID not set");
    info("This is only needed for query-rag.js");
    return true;
  }

  pass(`STORE_ID is set: ${storeId}`);
  return true;
}

function checkScripts() {
  section("📝 Test Scripts");

  const scriptsDir = __dirname;
  const scripts = [
    "seed-with-firestore.js",
    "seed-store.js",
    "query-rag.js",
    "check-setup.js",
    "run-tests.sh",
  ];

  let allFound = true;

  for (const script of scripts) {
    const filepath = path.join(scriptsDir, script);
    if (fs.existsSync(filepath)) {
      pass(`${script} found`);
    } else {
      fail(`${script} NOT found`);
      allFound = false;
    }
  }

  return allFound;
}

function checkNodeModules() {
  section("📦 Node Modules");

  const modules = [
    ["https", "built-in"],
    ["firebase-admin", "optional for Firestore seeding"],
  ];

  let criticalOk = true;

  for (const [mod, usage] of modules) {
    try {
      require.resolve(mod);
      pass(`${mod} is installed (${usage})`);
    } catch (err) {
      if (usage === "optional for Firestore seeding") {
        warn(`${mod} is NOT installed (${usage})`);
        warn(`  Run: npm install firebase-admin`);
      } else {
        fail(`${mod} is NOT installed`);
        criticalOk = false;
      }
    }
  }

  return criticalOk;
}

function checkWritePermissions() {
  section("🔐 File Permissions");

  const testsDir = __dirname;
  const testFile = path.join(testsDir, ".write-test");

  try {
    fs.writeFileSync(testFile, "test");
    fs.unlinkSync(testFile);
    pass(`Write permissions OK in ${testsDir}`);
    return true;
  } catch (err) {
    fail(`Cannot write to ${testsDir}: ${err.message}`);
    return false;
  }
}

// ────────────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${colors.blue}${"═".repeat(50)}${colors.reset}`);
  console.log(`${colors.blue}Test Environment Validation${colors.reset}`);
  console.log(`${colors.blue}${"═".repeat(50)}${colors.reset}\n`);

  const checks = [
    ["Node.js", () => checkNode()],
    ["Scripts", () => checkScripts()],
    ["Node Modules", () => checkNodeModules()],
    ["Environment Variables", () => checkEnvVariables()],
    ["Credentials", () => checkCredentials()],
    ["Store ID", () => checkStoreId()],
    ["Write Permissions", () => checkWritePermissions()],
    ["API Connectivity", () => checkApiConnectivity()],
    ["API Key", () => checkApiKey()],
  ];

  let passed = 0;
  let failed = 0;

  for (const [name, check] of checks) {
    try {
      const result = await check();
      if (result === true) {
        passed++;
      } else if (result === false) {
        failed++;
      }
    } catch (err) {
      console.error(`Error during ${name} check:`, err);
      failed++;
    }
  }

  // Summary
  section("📊 Summary");

  if (failed === 0) {
    pass("All checks passed! ✨");
    console.log(`\n${colors.green}You're ready to test!${colors.reset}`);
    console.log(
      `\nTry:\n  API_KEY=key ORG_ID=org node tests/api/seed-with-firestore.js\n`,
    );
    process.exit(0);
  } else {
    fail(`${failed} check(s) failed, ${passed} passed`);
    console.log(
      `\n${colors.yellow}Fix the issues above before testing${colors.reset}\n`,
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
