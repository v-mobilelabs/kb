#!/usr/bin/env node

/**
 * Debug: Check if seeded data matches user's organization
 * Lists stores and documents in the database
 */

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const fs = require("fs");

const CREDS_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!CREDS_PATH || !fs.existsSync(CREDS_PATH)) {
  console.error("❌ GOOGLE_APPLICATION_CREDENTIALS not set or file not found");
  process.exit(1);
}

try {
  const serviceAccount = JSON.parse(fs.readFileSync(CREDS_PATH, "utf-8"));
  const app = initializeApp({
    credential: cert(serviceAccount),
  });
  const db = getFirestore(app);

  (async () => {
    try {
      console.log("\n🔍 Database Debug Info\n");

      // 1. List all organizations
      console.log("📋 Organizations in database:\n");
      const orgsSnap = await db.collection("organizations").limit(10).get();
      if (orgsSnap.empty) {
        console.log("  (none found)");
      } else {
        orgsSnap.forEach((doc) => {
          console.log(`  - ${doc.id}`);
        });
      }

      // 2. List all stores (grouped by org)
      console.log("\n📦 Stores by organization:\n");
      const storesSnap = await db.collectionGroup("stores").limit(20).get();

      if (storesSnap.empty) {
        console.log("  (no stores found)");
      } else {
        const storesByOrg = {};
        storesSnap.forEach((doc) => {
          const data = doc.data();
          const orgId = data.orgId;
          if (!storesByOrg[orgId]) storesByOrg[orgId] = [];
          storesByOrg[orgId].push({
            id: doc.id,
            name: data.name,
            docCount: data.documentCount || 0,
          });
        });

        Object.entries(storesByOrg).forEach(([orgId, stores]) => {
          console.log(`  Organization: ${orgId}`);
          stores.forEach((store) => {
            console.log(`    - Store: ${store.name} (${store.id})`);
            console.log(`      Documents: ${store.docCount}`);
          });
          console.log();
        });
      }

      // 3. List all documents (grouped by store)
      console.log("📄 Documents by store:\n");
      const docsSnap = await db.collectionGroup("documents").limit(50).get();

      if (docsSnap.empty) {
        console.log("  (no documents found)");
      } else {
        const docsByStore = {};
        docsSnap.forEach((doc) => {
          const data = doc.data();
          const key = `${data.orgId}/${data.storeId}`;
          if (!docsByStore[key]) docsByStore[key] = [];
          docsByStore[key].push({
            id: doc.id,
            name: data.name,
            kind: data.kind,
            status: data.aiStatus,
          });
        });

        Object.entries(docsByStore).forEach(([key, docs]) => {
          const [orgId, storeId] = key.split("/");
          console.log(`  Store: ${storeId} (org: ${orgId})`);
          docs.slice(0, 3).forEach((doc) => {
            console.log(`    - ${doc.name}`);
            console.log(`      Kind: ${doc.kind} | Status: ${doc.status}`);
          });
          if (docs.length > 3) {
            console.log(`    ... and ${docs.length - 3} more`);
          }
          console.log();
        });
      }

      // 4. Check profiles
      console.log("👤 User Profiles:\n");
      const profilesSnap = await db.collection("profiles").limit(5).get();
      if (profilesSnap.empty) {
        console.log("  (no profiles found)");
      } else {
        profilesSnap.forEach((doc) => {
          const data = doc.data();
          console.log(`  User: ${doc.id}`);
          console.log(`    Organization: ${data.orgId}`);
          console.log(`    Name: ${data.displayName || "(not set)"}`);
        });
      }

      console.log();
      console.log(
        "💡 If stores are empty or using different ORG_ID than your profile:",
      );
      console.log("   Reseed with the correct ORG_ID from your profile\n");

      process.exit(0);
    } catch (error) {
      console.error("❌ Error:", error.message);
      process.exit(1);
    }
  })();
} catch (error) {
  console.error("❌ Firebase initialization error:", error.message);
  process.exit(1);
}
