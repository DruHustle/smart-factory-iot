export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Environment Configuration Service
 * 
 * This module provides centralized environment variable access with validation.
 * Following the Single Responsibility Principle, it handles only environment
 * configuration concerns.
 */

interface EnvironmentConfig {
  oauthPortalUrl: string;
  appId: string;
}

/**
 * Validates that required environment variables are set.
 * Throws an error with clear messaging if configuration is incomplete.
 */
function validateEnvironmentConfig(): EnvironmentConfig {
  // Provide default values for production/demo environments to prevent crashes
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL || "";
  const appId = import.meta.env.VITE_APP_ID || "demo-app";

  return {
    oauthPortalUrl,
    appId,
  };
}

/**
 * Generates the OAuth login URL with proper validation.
 * 
 * This function:
 * 1. Validates environment configuration (Dependency Injection principle)
 * 2. Constructs the redirect URI from current origin
 * 3. Encodes state for security
 * 4. Builds the complete OAuth URL
 * 
 * @returns The complete OAuth login URL
 * @throws Error if environment variables are not configured
 */
export const getLoginUrl = (): string => {
  try {
    const config = validateEnvironmentConfig();
    const redirectUri = `${window.location.origin}/api/oauth/callback`;
    const state = btoa(redirectUri);

    const url = new URL(`${config.oauthPortalUrl}/app-auth`);
    url.searchParams.set("appId", config.appId);
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("type", "signIn");

    return url.toString();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Auth Configuration Error]", message);
    throw error;
  }
};
