import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { setupOfflinePersistence } from "./lib/query-persist";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // mantém os dados no cache por 24h para uso offline
        gcTime: 1000 * 60 * 60 * 24,
        staleTime: 1000 * 30,
        retry: (failureCount) =>
          typeof navigator !== "undefined" && !navigator.onLine ? false : failureCount < 2,
        refetchOnReconnect: true,
      },
    },
  });

  setupOfflinePersistence(queryClient);

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
