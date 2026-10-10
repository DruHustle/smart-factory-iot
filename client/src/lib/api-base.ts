// Production uses the Vercel proxy so session cookies stay on the dashboard host.
export function resolveApiBase(configured: string | undefined, production: boolean): string {
  if (production) return "/api";
  const value = configured?.trim().replace(/\/+$/, "");
  if (!value) return "/api";
  if (value === "/api") return value;
  try {
    const url = new URL(value);
    if (["http:", "https:"].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash) return value;
  } catch { /* Invalid configuration falls back to the local API proxy. */ }
  return "/api";
}
