import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  // Only redirect on explicit unauthorized errors, not transient failures
  const isUnauthorized = error.message === UNAUTHED_ERR_MSG && error.data?.code === 'UNAUTHORIZED';

  if (!isUnauthorized) return;

  console.warn('[Auth] Redirecting to login due to unauthorized error');
  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    // Only redirect on auth errors, not on other failures
    if (error instanceof TRPCClientError && error.data?.code === 'UNAUTHORIZED') {
      redirectToLoginIfUnauthorized(error);
    }
    // Log all errors for debugging but don't treat them as fatal
    if (error) {
      console.error("[API Query Error]", error instanceof Error ? error.message : String(error));
    }
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    // Only redirect on auth errors, not on other failures
    if (error instanceof TRPCClientError && error.data?.code === 'UNAUTHORIZED') {
      redirectToLoginIfUnauthorized(error);
    }
    // Log all errors for debugging but don't treat them as fatal
    if (error) {
      console.error("[API Mutation Error]", error instanceof Error ? error.message : String(error));
    }
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
