export const SESSION_EXPIRED_EVENT = "smart-factory:session-expired";

type TrpcErrorShape = {
  data?: {
    code?: unknown;
    httpStatus?: unknown;
  };
};

/** Keep protected screens from presenting cached fleet data after auth expires. */
export function isUnauthorizedError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { data } = error as TrpcErrorShape;
  return data?.code === "UNAUTHORIZED" || data?.httpStatus === 401;
}

export function announceSessionExpired(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}
