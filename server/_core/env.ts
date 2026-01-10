export const ENV = {
  appId: process.env.VITE_APP_ID ?? "smart-factory-iot",
  cookieSecret: process.env.JWT_SECRET ?? "default-secret-change-me",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
};
