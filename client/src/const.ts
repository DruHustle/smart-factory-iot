export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Environment Configuration Service
 */

interface EnvironmentConfig {
  appId: string;
}

function validateEnvironmentConfig(): EnvironmentConfig {
  const appId = import.meta.env.VITE_APP_ID || "smart-factory-iot";
  return { appId };
}

export const getLoginUrl = (): string => {
  return "/login";
};
