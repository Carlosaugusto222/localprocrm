import type { QueryClient } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { persistQueryClient } from "@tanstack/react-query-persist-client";

const CACHE_KEY = "localpro-offline-cache";
const MAX_AGE = 1000 * 60 * 60 * 24; // 24h

/**
 * Persiste o cache do React Query no localStorage para que os dados
 * continuem disponíveis mesmo sem conexão (offline-first).
 */
export function setupOfflinePersistence(queryClient: QueryClient) {
  if (typeof window === "undefined") return;
  try {
    const persister = createSyncStoragePersister({
      storage: window.localStorage,
      key: CACHE_KEY,
      throttleTime: 2000, // Increase throttle to reduce disk I/O (from 1s)
    });

    persistQueryClient({
      queryClient,
      persister,
      maxAge: MAX_AGE,
      buster: "v1",
      dehydrateOptions: {
        shouldDehydrateQuery: (query) => query.state.status === "success",
      },
    });
  } catch {
    /* localStorage indisponível (modo privado) — segue sem persistência */
  }
}

export function clearOfflineCache() {
  try {
    window.localStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}
