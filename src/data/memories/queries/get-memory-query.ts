"use cache";

import { cacheTag, cacheLife } from "next/cache";
import { MemoryRepository } from "@/data/memories/repositories/memory-repository";
import { memoryDetailCacheTag } from "@/lib/cache-tags";

export async function getMemoryQuery(orgId: string, memoryId: string) {
  cacheTag(memoryDetailCacheTag(orgId, memoryId));
  cacheLife("minutes");

  const repo = new MemoryRepository(orgId);
  return repo.findById(memoryId);
}
