const TRANSPORT_ERROR = /unexpected token|not valid json|json parse|failed to fetch|fetch failed|networkerror|network request failed|load failed|econnrefused|enotfound|502|503|504|bad gateway|gateway timeout|service unavailable/i;

/** Prevent proxy, HTML, and JSON parser details from leaking into user-facing UI. */
export function userFacingApiError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message.trim() : "";
  if (!message || message.length > 240 || TRANSPORT_ERROR.test(message) || /[<>{}]/.test(message)) return fallback;
  return message;
}
