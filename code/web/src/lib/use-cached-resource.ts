import {
  useState,
  useEffect,
  useCallback,
  use,
  useLayoutEffect,
  useRef,
} from "react";
import type { z } from "zod";

/**
 * FUNCTIONAL REQUIREMENTS SPECIFICATION:
 *
 * FR1: Persistence - The hook shall persist and retrieve data from `localStorage`
 *      using a caller-provided unique key.
 * FR2: Schema Validation - The hook shall require a Zod schema to validate data
 *      retrieved from both `localStorage`, the `fetcher` callback, and `initialPromise`.
 *      Invalid data shall be discarded.
 * FR3: Stale-While-Revalidate (SWR) - On mount, the hook shall return cached
 *      data from `localStorage` immediately if available, while initiating
 *      a background fetch to ensure data freshness.
 * FR4: Cache Synchronization - Upon a successful fetch and validation, the
 *      hook shall update the React state and synchronize the new data back
 *      to `localStorage`.
 * FR5: Suspense Support - When the `suspense` option is enabled and no valid
 *      data exists in cache, the hook shall throw a Promise (or use React `use`)
 *      to trigger a parent React Suspense boundary. This supports both Client
 *      and Server-Side Rendering (SSR).
 * FR6: Request Deduplication - The hook shall use a global in-memory cache
 *      to prevent redundant network requests for the same key during the
 *      same session.
 * FR7: Type Safety - The hook shall be generic (`T`) and provide full
 *      TypeScript inference based on the provided Zod schema.
 * FR8: Server-Side Promise Fast-Tracking - The hook shall accept an optional
 *      `initialPromise`. If provided and no cache exists, this promise is used
 *      via React `use()` to suspend/resolve data, enabling seamless Server-to-Client
 *      handoff and proper SSR Suspense support.
 */

/**
 * USAGE EXAMPLES:
 *
 * 1. Background Refresh (Standard):
 *    ```tsx
 *    const { data, isLoading } = useCachedResource({
 *      key: 'my_data',
 *      fetcher: () => api.get('/data'),
 *      schema: MyDataSchema
 *    });
 *    ```
 *
 * 2. Strict Initial Loading (Suspense):
 *    ```tsx
 *    // Parent must be wrapped in <Suspense>
 *    const { data } = useCachedResource({
 *      key: 'critical_config',
 *      fetcher: fetchConfig,
 *      schema: ConfigSchema,
 *      suspense: true
 *    });
 *    ```
 *
 * 3. Server-Side Promise Handoff (Fast-Tracking):
 *    ```tsx
 *    // Server Component
 *    import { getData } from '@/actions/db';
 *
 *    export default function Page() {
 *      const dataPromise = getData();
 *      return <ClientComponent dataPromise={dataPromise} />;
 *    }
 *
 *    // Client Component
 *    "use client";
 *    export function ClientComponent({ dataPromise }) {
 *      const { data } = useCachedResource({
 *        key: "server_data_key",
 *        fetcher: getData,
 *        initialPromise: dataPromise,
 *        schema: DataSchema,
 *        suspense: true
 *      });
 *      // ...
 *    }
 *    ```
 */

interface UseCachedResourceOptions<T> {
  key: string;
  fetcher: () => Promise<T>;
  initialPromise?: Promise<T>;
  schema: z.ZodType<T>;
  initialData?: T | null;
  suspense?: boolean;
}

interface UseCachedResourceResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

// Global cache to coordinate between Suspense (render phase) and Effects (Client side)
const globalCache = new Map<
  string,
  {
    data?: unknown;
    promise?: Promise<unknown>;
    error?: Error;
    timestamp: number;
  }
>();

// Helper for SSR-safe layout effect
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function useCachedResource<T>({
  key,
  fetcher,
  initialPromise,
  schema,
  initialData = null,
  suspense = false,
}: UseCachedResourceOptions<T>): UseCachedResourceResult<T> {
  const [data, setData] = useState<T | null>(initialData);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [error, setError] = useState<Error | null>(null);

  // Track if we have processed the current initialPromise to avoid infinite loops
  const processedPromiseRef = useRef<Promise<T> | undefined>(undefined);

  // 1. Try to load from Global Cache (Safe for hydration if empty on first load)
  // We DO NOT read localStorage here to avoid Hydration Mismatch.
  let cachedData: T | null = null;
  if (typeof window !== "undefined") {
    const cacheEntry = globalCache.get(key);
    if (cacheEntry?.data) {
      cachedData = cacheEntry.data as T;
    }
  }

  // 2. Suspense Logic (Render Phase)

  // If we have cached data, we skip this and return it immediately (SWR behavior).

  // If we don't have cached data (or we are on Server), we check for suspension.

  if (suspense && !cachedData) {
    if (initialPromise) {
      // OPTIMIZATION: On the server, we don't want to suspend if we want to allow

      // the client to instantly hydrate from localStorage (via effect).

      if (typeof window !== "undefined") {
        // Client-side suspension with initialPromise

        try {
          const resolved = use(initialPromise);

          const result = schema.safeParse(resolved);

          if (result.success) {
            cachedData = result.data;
          } else {
            throw new Error(`Data validation failed: ${result.error.message}`);
          }
        } catch (err) {
          throw err;
        }
      }

      // On server, we do nothing (fall through), resulting in null data and no suspension.
    } else if (typeof window !== "undefined") {
      // Client-side suspension with fetcher
      let cacheEntry = globalCache.get(key);

      if (!cacheEntry?.data && !cacheEntry?.error) {
        if (!cacheEntry) {
          cacheEntry = { timestamp: Date.now() };
          globalCache.set(key, cacheEntry);
        }

        if (!cacheEntry.promise) {
          cacheEntry.promise = fetcher()
            .then((freshData) => {
              const result = schema.safeParse(freshData);
              if (result.success) {
                cacheEntry!.data = result.data;
                try {
                  localStorage.setItem(key, JSON.stringify(result.data));
                } catch {
                  /* ignore */
                }
              } else {
                throw new Error("Validation failed");
              }
            })
            .catch((err) => {
              cacheEntry!.error =
                err instanceof Error ? err : new Error(String(err));
            });
        }
        throw cacheEntry.promise;
      }

      if (cacheEntry?.data) {
        cachedData = cacheEntry.data as T;
      }
    }
  }

  // Helper to update state and caches
  const updateCache = useCallback(
    (freshData: T) => {
      const result = schema.safeParse(freshData);
      if (result.success) {
        setData(result.data);
        globalCache.set(key, {
          data: result.data,
          timestamp: Date.now(),
        });
        try {
          localStorage.setItem(key, JSON.stringify(result.data));
        } catch {
          /* ignore */
        }
      }
    },
    [key, schema],
  );

  // 3. Layout Effect for Instant LocalStorage Hydration
  // Runs synchronously after DOM mutation but before paint.
  // This avoids the "Flash of Loading State" while being safe for hydration.
  useIsomorphicLayoutEffect(() => {
    if (!cachedData && typeof window !== "undefined") {
      // Try to load from localStorage
      try {
        const local = localStorage.getItem(key);
        if (local) {
          const parsed = JSON.parse(local);
          const result = schema.safeParse(parsed);
          if (result.success) {
            // Update state immediately
            setData(result.data);
            // Update global cache
            globalCache.set(key, {
              data: result.data,
              timestamp: Date.now(),
            });
          }
        }
      } catch {
        /* ignore */
      }
    }
  }, [key, schema, cachedData]); // Depend on key/schema. cachedData check prevents overwrite if we already have it.

  // 4. Standard Effect for SWR / Initial Fetch
  // 4. Standard Effect for SWR / Initial Fetch
  useEffect(() => {
    const currentCache = globalCache.get(key);

    // We prioritize cachedData (from render or layout effect)
    const activeData = cachedData || data;

    if (activeData) {
      // We have data. Do SWR or initialPromise sync.
      if (initialPromise) {
        // Only process initialPromise if we haven't already for this exact promise instance
        if (processedPromiseRef.current !== initialPromise) {
          processedPromiseRef.current = initialPromise;
          Promise.resolve(initialPromise)
            .then((fresh) => {
              updateCache(fresh);
            })
            .catch((err) => {
              setError(err instanceof Error ? err : new Error(String(err)));
            })
            .finally(() => {
              setIsLoading(false);
            });
        }
      } else if (!currentCache || Date.now() - currentCache.timestamp > 1000) {
        // SWR revalidation
        Promise.resolve(fetcher())
          .then((fresh) => {
            updateCache(fresh);
          })
          .catch((err) => {
            console.error(
              `[useCachedResource] SWR Revalidation failed for key: ${key}`,
              err,
            );
          })
          .finally(() => {
            setIsLoading(false);
          });
      } else {
        setIsLoading(false);
      }
    } else {
      // No data. Fetch now.
      if (!suspense) {
        setIsLoading(true);
        const source = initialPromise || fetcher();

        // Mark initialPromise as processed if we are using it
        if (initialPromise) {
          processedPromiseRef.current = initialPromise;
        }

        Promise.resolve(source)
          .then((fresh) => {
            updateCache(fresh);
          })
          .catch((err) => {
            setError(err instanceof Error ? err : new Error(String(err)));
          })
          .finally(() => {
            setIsLoading(false);
          });
      }
    }
  }, [key, fetcher, initialPromise, updateCache, suspense]); // Removed data, cachedData

  return {
    data: cachedData || data,
    isLoading: isLoading && !cachedData && !data,
    error,
    refresh: async () => {
      setIsLoading(true);
      try {
        const fresh = await fetcher();
        updateCache(fresh);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    },
  };
}
