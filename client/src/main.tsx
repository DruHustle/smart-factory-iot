import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import { safeLocalStorage, safeSessionStorage } from "@/lib/storage";
import App from "./App";
import "./index.css";

// Earlier versions kept session JWTs in Web Storage. Remove those persisted
// values after upgrading to the HttpOnly cookie session.
safeLocalStorage.removeItem("token");
safeSessionStorage.removeItem("token");

const queryClient = new QueryClient();

const getTRPCUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    return `${apiUrl}/trpc`;
  }
  // Fallback for relative paths
  return "/api/trpc";
};

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: getTRPCUrl(),
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
