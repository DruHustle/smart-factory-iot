/**
 * tRPC Authentication Service
 *
 * Keeps frontend auth in sync with server auth router.
 */

import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { safeLocalStorage, safeSessionStorage } from "./storage";
import type { User } from "../../../drizzle/schema";
import type { AppRouter } from "../../../server/routers";

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  error?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

function getAvailableStorage() {
  if (safeLocalStorage.isAvailable()) {
    return safeLocalStorage;
  }
  if (safeSessionStorage.isAvailable()) {
    return safeSessionStorage;
  }
  return safeLocalStorage;
}

function getTRPCUrl() {
  return `${API_BASE_URL}/trpc`;
}

const trpcAuthClient = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: getTRPCUrl(),
      transformer: superjson,
      fetch(input, init) {
        const token = getAuthToken();
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
          headers: {
            ...(init?.headers ?? {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
      },
    }),
  ],
});

export function getAuthToken(): string | null {
  const storage = getAvailableStorage();
  return storage.getItem("token");
}

export function setAuthToken(token: string): void {
  const storage = getAvailableStorage();
  storage.setItem("token", token);
}

export function clearAuthToken(): void {
  const storage = getAvailableStorage();
  storage.removeItem("token");
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error && typeof (error as { message?: unknown }).message === "string") {
    return (error as { message: string }).message;
  }
  return fallback;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  try {
    const data = await trpcAuthClient.auth.login.mutate({ email, password });

    if (data.token) {
      setAuthToken(data.token);
    }

    return {
      success: true,
      token: data.token,
      user: data.user,
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Login failed"),
    };
  }
}

export async function register(
  email: string,
  password: string,
  name: string,
): Promise<AuthResponse> {
  try {
    const data = await trpcAuthClient.auth.register.mutate({ email, password, name });

    if (data.token) {
      setAuthToken(data.token);
    }

    return {
      success: true,
      token: data.token,
      user: data.user,
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Registration failed"),
    };
  }
}

export async function getCurrentUser(): Promise<AuthResponse> {
  try {
    const user = await trpcAuthClient.auth.me.query();

    if (!user) {
      clearAuthToken();
      return {
        success: false,
        error: "No active session",
      };
    }

    return {
      success: true,
      user,
    };
  } catch (error) {
    clearAuthToken();
    return {
      success: false,
      error: getErrorMessage(error, "Failed to fetch user"),
    };
  }
}

export async function logout(): Promise<AuthResponse> {
  try {
    await trpcAuthClient.auth.logout.mutate();
  } catch (_error) {
    // Ignore network/logout errors and clear client state regardless.
  }

  clearAuthToken();
  return { success: true };
}

export function isGitHubPagesDeployment(): boolean {
  if (typeof window === "undefined") return false;

  const url = window.location.href;
  return url.includes("github.io") && !import.meta.env.VITE_API_URL;
}
