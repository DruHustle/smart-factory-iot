/**
 * REST API Authentication Service
 * 
 * Handles authentication using standard REST API calls instead of tRPC.
 * Provides login, logout, and user session management.
 */

import { safeLocalStorage, safeSessionStorage } from "./storage";
import type { User } from "../../../drizzle/schema";

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  error?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

/**
 * Get the best available storage for the current environment
 */
function getAvailableStorage() {
  if (safeLocalStorage.isAvailable()) {
    return safeLocalStorage;
  }
  if (safeSessionStorage.isAvailable()) {
    return safeSessionStorage;
  }
  return safeLocalStorage;
}

/**
 * Get the stored authentication token
 */
export function getAuthToken(): string | null {
  const storage = getAvailableStorage();
  return storage.getItem("token");
}

/**
 * Set the authentication token
 */
export function setAuthToken(token: string): void {
  const storage = getAvailableStorage();
  storage.setItem("token", token);
}

/**
 * Clear the authentication token
 */
export function clearAuthToken(): void {
  const storage = getAvailableStorage();
  storage.removeItem("token");
}

/**
 * Make an authenticated API request
 */
async function makeAuthenticatedRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  headers.set("Content-Type", "application/json");

  return fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: "include",
  });
}

/**
 * Login with email and password
 */
export async function login(email: string, password: string): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return {
        success: false,
        error: error.message || "Login failed",
      };
    }

    const data = await response.json();

    if (data.token) {
      setAuthToken(data.token);
    }

    return {
      success: true,
      token: data.token,
      user: data.user,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Network error",
    };
  }
}

/**
 * Register a new account
 */
export async function register(
  email: string,
  password: string,
  name: string
): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, name }),
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return {
        success: false,
        error: error.message || "Registration failed",
      };
    }

    const data = await response.json();

    if (data.token) {
      setAuthToken(data.token);
    }

    return {
      success: true,
      token: data.token,
      user: data.user,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Network error",
    };
  }
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<AuthResponse> {
  try {
    const response = await makeAuthenticatedRequest("/auth/me");

    if (!response.ok) {
      if (response.status === 401) {
        clearAuthToken();
      }
      return {
        success: false,
        error: "Failed to fetch user",
      };
    }

    const user = await response.json();

    return {
      success: true,
      user,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Network error",
    };
  }
}

/**
 * Logout
 */
export async function logout(): Promise<AuthResponse> {
  try {
    await makeAuthenticatedRequest("/auth/logout", {
      method: "POST",
    });

    clearAuthToken();

    return {
      success: true,
    };
  } catch (error: any) {
    clearAuthToken();
    return {
      success: true,
    };
  }
}

/**
 * Check if running on GitHub Pages (no backend available)
 */
export function isGitHubPagesDeployment(): boolean {
  if (typeof window === "undefined") return false;

  const url = window.location.href;
  return url.includes("github.io") && !import.meta.env.VITE_API_URL;
}
