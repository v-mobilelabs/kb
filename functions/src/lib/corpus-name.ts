const MAX_CORPUS_NAME_LENGTH = 128;
const PREFIX = "kb-";

function sanitise(value: string): string {
  return value.replace(/[^a-zA-Z0-9-]/g, "-").toLowerCase();
}

export function deriveCorpusName(orgId: string, storeId: string): string {
  const rawName = `${PREFIX}${sanitise(orgId)}-${sanitise(storeId)}`;
  if (rawName.length <= MAX_CORPUS_NAME_LENGTH) return rawName;
  return rawName.slice(0, MAX_CORPUS_NAME_LENGTH);
}
