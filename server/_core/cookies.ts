import type { CookieOptions, Request } from "express";

function isSecureRequest(req: Request) {
  // Express resolves protocol through the configured trusted proxy boundary.
  // Production cookies stay Secure even on the private ingress-to-pod hop.
  return process.env.NODE_ENV === "production" || req.protocol === "https";
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const secure = isSecureRequest(req);
  return {
    httpOnly: true,
    path: "/",
    sameSite: secure ? "none" : "lax",
    secure,
  };
}
