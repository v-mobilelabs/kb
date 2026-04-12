"use cache";

import { cacheTag, cacheLife } from "next/cache";
import { MemoryRepository } from "@/data/memories/repositories/memory-repository";
import { memoriesCacheTag } from "@/lib/cache-tags";
import type { MemorySortKey } from "@/data/memories/schemas";

interface ListMemoriesOptions {
  q?: string;
  sort: MemorySortKey;
  cursor?: string;
  limit: number;
}

export async function listMemoriesQuery(
  orgId: string,
  options: ListMemoriesOptions,
) {
  cacheTag(memoriesCacheTag(orgId));
  cacheLife("minutes");

  const repo = new MemoryRepository(orgId);
  return repo.findByOrgPaginated(options);
}
