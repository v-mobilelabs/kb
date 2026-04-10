const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: "knowledge-base-cosmoops",
});
const db = admin.firestore();

async function resetPending() {
  const snap = await db
    .collectionGroup("documents")
    .where("kind", "==", "data")
    .get();
  console.log("Total data docs:", snap.size);

  const needsEnrich = snap.docs.filter((d) => {
    const data = d.data();
    // Documents without a top-level embedding field need re-enrichment
    return !data.embedding && data.context?.status !== "processing";
  });
  console.log("Docs needing enrichment:", needsEnrich.length);

  for (const doc of needsEnrich) {
    const old = doc.data().context?.status;
    await doc.ref.update({
      "context.status": "pending",
      updatedAt: new Date().toISOString(),
    });
    console.log("Reset:", doc.ref.path, "| old status:", old);
  }
  console.log("Done");
  process.exit(0);
}

resetPending().catch((e) => {
  console.error(e);
  process.exit(1);
});
