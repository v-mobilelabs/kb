/**
 * Composable hooks for optimistic mutations with TanStack Query v5
 * Pattern: Use these hooks to add optimistic updates to mutations
 *
 * Example:
 * ```ts
 * const mutation = useMutation({
 *   mutationFn: updateAction,
 *   ...useOptimisticUpdate('profile', uid, { displayName: newName })
 * })
 * ```
 */

import { QueryClient, useQueryClient } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";

type MutationOptions = Pick<
  UseMutationOptions<unknown, Error, unknown, unknown>,
  "onMutate" | "onError" | "onSettled"
>;

/**
 * Prepare cache update for optimistic updates
 * Returns snapshot of previous data for rollback
 */
function prepareCacheUpdate<T>(
  queryClient: QueryClient,
  queryKey: unknown[],
  updateFn: (prev?: T) => T,
): { prevData?: T } {
  queryClient.cancelQueries({ queryKey });
  const prevData = queryClient.getQueryData<T>(queryKey);
  const newData = updateFn(prevData);
  queryClient.setQueryData(queryKey, newData);
  return { prevData };
}

/**
 * Rollback cache to previous state
 */
function rollbackCache<T>(
  queryClient: QueryClient,
  queryKey: unknown[],
  prevData?: T,
) {
  if (prevData !== undefined) {
    queryClient.setQueryData(queryKey, prevData);
  }
}

/**
 * Hook for optimistic update mutations (e.g., update display name)
 * Usage:
 * ```ts
 * const mutation = useMutation({
 *   mutationFn: updateAction,
 *   ...useOptimisticUpdate('profile', uid, { displayName: newName })
 * })
 * ```
 */
export function useOptimisticUpdate<T>(
  queryKeyPrefix: string | string[],
  queryKeyId: string | number,
  optimisticData: Partial<T>,
): MutationOptions {
  const queryClient = useQueryClient();
  const queryKey = Array.isArray(queryKeyPrefix)
    ? queryKeyPrefix
    : [queryKeyPrefix, queryKeyId];

  return {
    onMutate: async () => {
      const ctx = prepareCacheUpdate(
        queryClient,
        queryKey,
        (prev?: T) =>
          ({
            ...(prev || ({} as T)),
            ...optimisticData,
          }) as T,
      );
      return ctx;
    },
    onError: (_err, _vars, onMutateResult) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rollbackCache(queryClient, queryKey, (onMutateResult as any)?.prevData);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  };
}

/**
 * Hook for optimistic list updates (add item)
 * Usage with useInfiniteQuery:
 * ```ts
 * const mutation = useMutation({
 *   mutationFn: createAction,
 *   ...useOptimisticListAdd('documents', [orgId, storeId], newItem)
 * })
 * ```
 * Or without optimisticData:
 * ```ts
 * const mutation = useMutation({
 *   mutationFn: createStoreAction,
 *   ...useOptimisticListAdd('stores', [orgId])
 * })
 * ```
 */
export function useOptimisticListAdd<T extends { id?: string | number }>(
  queryKeyPrefix: string,
  queryKeyParams: (string | number)[],
  optimisticData?: T,
): MutationOptions {
  const queryClient = useQueryClient();
  const queryKey = [queryKeyPrefix, ...queryKeyParams];

  return {
    onMutate: async () => {
      queryClient.cancelQueries({ queryKey });
      const prevData = queryClient.getQueryData(queryKey);
      // For infinite queries, update first page with optimistic data if provided
      if (
        optimisticData &&
        prevData &&
        typeof prevData === "object" &&
        "pages" in prevData
      ) {
        queryClient.setQueryData(
          queryKey,
          (old: Record<string, unknown> | undefined) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const oldAny = old as any;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pages = oldAny?.pages as any[];
            return {
              ...old,
              pages: pages
                ? [optimisticData, ...(pages || []).slice(1)]
                : oldAny?.pages,
            };
          },
        );
      }
      return { prevData };
    },
    onError: (_err, _vars, onMutateResult) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = onMutateResult as any;
      if (result?.prevData) {
        queryClient.setQueryData(queryKey, result.prevData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  };
}

/**
 * Hook for optimistic list updates (remove item)
 * Usage:
 * ```ts
 * const mutation = useMutation({
 *   mutationFn: deleteAction,
 *   ...useOptimisticListRemove('documents', orgId, storeId, itemId)
 * })
 * ```
 */
export function useOptimisticListRemove<T extends { id: string | number }>(
  queryKeyPrefix: string,
  ...queryKeyParams: (string | number)[]
): MutationOptions {
  const queryClient = useQueryClient();
  const queryKey = [queryKeyPrefix, ...queryKeyParams];
  const itemIdToRemove = queryKeyParams.at(-1);

  return {
    onMutate: async () => {
      queryClient.cancelQueries({ queryKey });
      const prevData = queryClient.getQueryData(queryKey);

      // Handle both regular and infinite queries
      if (prevData && typeof prevData === "object") {
        if ("pages" in prevData) {
          // Infinite query - filter items from all pages
          queryClient.setQueryData(
            queryKey,
            (old: Record<string, unknown> | undefined) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const oldAny = old as any;
              const newPages = (oldAny?.pages?.map(
                (page: Record<string, unknown>) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const pageAny = page as any;
                  return {
                    ...page,
                    items:
                      pageAny.items?.filter(
                        (item: T) => item.id !== itemIdToRemove,
                      ) || [],
                  };
                },
              ) || []) as unknown[];
              return { ...old, pages: newPages };
            },
          );
        } else if (Array.isArray(prevData)) {
          // Regular query returning array
          queryClient.setQueryData(
            queryKey,
            (old: T[] | undefined) =>
              old?.filter((item) => item.id !== itemIdToRemove) || [],
          );
        } else if (
          "data" in prevData &&
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          Array.isArray((prevData as Record<string, unknown> as any)?.data)
        ) {
          // Query object with data array

          queryClient.setQueryData(
            queryKey,
            (old: Record<string, unknown> | undefined) => ({
              ...old,
              data:
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (old as any)?.data?.filter(
                  (item: T) => item.id !== itemIdToRemove,
                ) || [],
            }),
          );
        }
      }
      return { prevData };
    },
    onError: (_err, _vars, onMutateResult) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = onMutateResult as any;
      if (result?.prevData) {
        queryClient.setQueryData(queryKey, result.prevData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  };
}

/**
 * Hook for batch invalidation after mutations
 * Usage when multiple related queries need invalidation:
 * ```ts
 * const mutation = useMutation({
 *   mutationFn: updateAction,
 *   onSettled: useInvalidateQueries(['profile', uid], ['organization', orgId])
 * })
 * ```
 */
export function useInvalidateQueries(
  ...queryKeys: (string | (string | number)[])[]
) {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all(
      queryKeys.map((key) => {
        const resolvedKey = Array.isArray(key) ? key : [key];
        return queryClient.invalidateQueries({
          queryKey: resolvedKey,
          exact: false,
        });
      }),
    );
  };
}
