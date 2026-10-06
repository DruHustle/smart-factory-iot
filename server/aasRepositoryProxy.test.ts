import { afterEach, describe, expect, it, vi } from "vitest";
import { Writable } from "node:stream";
import type { Request, Response } from "express";
import type { User } from "../drizzle/schema";
import { sdk } from "./_core/sdk";
import * as db from "./db";
import { aasRepositoryProxy } from "./aasRepositoryProxy";

function makeUser(role: User["role"]) {
  return { id: 9, openId: "test-user", email: "engineer@example.test", name: "Test Engineer", role } as User;
}

function makeRequest(path: string, method = "GET", body?: unknown) {
  const headers: Record<string, string> = body ? { "content-type": "application/json" } : {};
  return {
    originalUrl: path,
    path: path.split("?")[0],
    method,
    body,
    get: (name: string) => headers[name.toLowerCase()],
    is: (type: string) => headers["content-type"] === type,
  } as unknown as Request;
}

function makeResponse() {
  const chunks: Buffer[] = [];
  const state: { statusCode?: number; headers: Record<string, string>; body?: unknown; ended: boolean } = { headers: {}, ended: false };
  const response = Object.assign(new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(Buffer.from(chunk));
      callback();
    },
  }), {
    status(code: number) { state.statusCode = code; return response; },
    setHeader(name: string, value: string) { state.headers[name.toLowerCase()] = value; return response; },
    json(body: unknown) { state.body = body; response.end(); return response; },
    send(body: unknown) { state.body = body; response.end(); return response; },
  }) as unknown as Response;
  response.on("finish", () => {
    state.ended = true;
    if (chunks.length) state.body = Buffer.concat(chunks);
  });
  return { response, state };
}

const envKeys = ["AAS_REPOSITORY_URL", "AASX_FILE_SERVER_URL", "AAS_OIDC_TOKEN_URL", "AAS_OIDC_DISCOVERY_URL", "AAS_OIDC_SCOPE", "AAS_OIDC_CLIENT_ID", "AAS_OIDC_CLIENT_SECRET"] as const;
const previousEnv = new Map<string, string | undefined>();

afterEach(() => {
  for (const key of envKeys) {
    const value = previousEnv.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  previousEnv.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function configureRepository() {
  for (const key of envKeys) previousEnv.set(key, process.env[key]);
  process.env.AAS_REPOSITORY_URL = "http://aas.private:8082/";
  process.env.AASX_FILE_SERVER_URL = "http://aasx.private:8086/";
  process.env.AAS_OIDC_TOKEN_URL = "http://identity.private/token";
  delete process.env.AAS_OIDC_DISCOVERY_URL;
  delete process.env.AAS_OIDC_SCOPE;
  process.env.AAS_OIDC_CLIENT_ID = "smart-factory-gateway";
  process.env.AAS_OIDC_CLIENT_SECRET = "test-only-secret";
}

describe("AAS repository gateway", () => {
  it("rejects unauthenticated and non-engineering users before contacting the repository", async () => {
    const authenticate = vi.spyOn(sdk, "authenticateRequest");
    const unauthenticated = makeResponse();
    authenticate.mockRejectedValueOnce(new Error("no session"));
    await aasRepositoryProxy(makeRequest("/api/aas/shells"), unauthenticated.response);
    expect(unauthenticated.state.statusCode).toBe(401);

    const viewer = makeResponse();
    authenticate.mockResolvedValueOnce(makeUser("viewer"));
    await aasRepositoryProxy(makeRequest("/api/aas/shells"), viewer.response);
    expect(viewer.state.statusCode).toBe(403);
  });

  it("forwards standard AAS API paths with a server-side OAuth token", async () => {
    configureRepository();
    vi.spyOn(sdk, "authenticateRequest").mockResolvedValue(makeUser("engineer"));
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === "http://identity.private/token") {
        expect(init?.method).toBe("POST");
        return new Response(JSON.stringify({ access_token: "service-token", expires_in: 300 }), { status: 200 });
      }
      expect(String(input)).toBe("http://aas.private:8082/shells?limit=20");
      expect(new Headers(init?.headers).get("authorization")).toBe("Bearer service-token");
      return new Response(JSON.stringify({ result: [], paging_metadata: {} }), { status: 200, headers: { "content-type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = makeResponse();
    await aasRepositoryProxy(makeRequest("/api/aas/shells?limit=20"), result.response);
    expect(result.state.statusCode).toBe(200);
    expect(result.state.headers["content-type"]).toBe("application/json");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("discovers the OAuth token endpoint and sends the configured client-credentials scope", async () => {
    configureRepository();
    delete process.env.AAS_OIDC_TOKEN_URL;
    process.env.AAS_OIDC_DISCOVERY_URL = "http://identity.private/.well-known/openid-configuration";
    process.env.AAS_OIDC_SCOPE = "aas.read aas.write";
    vi.spyOn(sdk, "authenticateRequest").mockResolvedValue(makeUser("engineer"));
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === process.env.AAS_OIDC_DISCOVERY_URL) {
        expect(init?.method).toBeUndefined();
        return new Response(JSON.stringify({ token_endpoint: "http://identity.private/token" }), { status: 200 });
      }
      if (url === "http://identity.private/token") {
        const form = new URLSearchParams(init?.body as URLSearchParams);
        expect(form.get("grant_type")).toBe("client_credentials");
        expect(form.get("scope")).toBe("aas.read aas.write");
        return new Response(JSON.stringify({ access_token: "discovered-token", expires_in: 300 }), { status: 200 });
      }
      expect(url).toBe("http://aas.private:8082/shells");
      expect(new Headers(init?.headers).get("authorization")).toBe("Bearer discovered-token");
      return new Response("ok", { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = makeResponse();
    await aasRepositoryProxy(makeRequest("/api/aas/shells"), result.response);
    expect(result.state.statusCode).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("uses the IDTA binary media type for AASX downloads and preserves package bytes", async () => {
    configureRepository();
    vi.spyOn(sdk, "authenticateRequest").mockResolvedValue(makeUser("engineer"));
    const packageBytes = Buffer.from([0x50, 0x4b, 0x03, 0x04, ...Buffer.from("aasx-package-fixture")]);
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => String(input).includes("identity.private")
      ? new Response(JSON.stringify({ access_token: "service-token", expires_in: 300 }), { status: 200 })
      : new Response(packageBytes, { status: 200, headers: { "content-type": "application/aasx+json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = makeResponse();
    await aasRepositoryProxy(makeRequest("/api/aas/packages/cGtnLWxpdmU"), result.response);
    expect(result.state.statusCode).toBe(200);
    expect(result.state.headers["content-type"]).toBe("application/asset-administration-shell-package");
    expect(result.state.body).toEqual(packageBytes);
  });

  it("prevents direct repository writes from bypassing managed AAS version history", async () => {
    vi.spyOn(sdk, "authenticateRequest").mockResolvedValue(makeUser("engineer"));
    vi.spyOn(db, "findManagedAasShellId").mockResolvedValue("urn:factory:compressor-01");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = makeResponse();
    await aasRepositoryProxy(makeRequest("/api/aas/shells", "PUT", { id: "urn:factory:compressor-01" }), result.response);

    expect(result.state.statusCode).toBe(409);
    expect(result.state.body).toMatchObject({ error: expect.stringContaining("versioned asset workflow") });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps absolute-looking request paths beneath the configured repository origin", async () => {
    configureRepository();
    vi.spyOn(sdk, "authenticateRequest").mockResolvedValue(makeUser("engineer"));
    const forwarded: string[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      forwarded.push(url);
      return url.includes("identity.private")
        ? new Response(JSON.stringify({ access_token: "service-token", expires_in: 300 }), { status: 200 })
        : new Response("ok", { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = makeResponse();
    await aasRepositoryProxy(makeRequest("/api/aas/https://attacker.example/shells"), result.response);

    const repositoryRequest = forwarded.find((url) => new URL(url).hostname === "aas.private");
    expect(repositoryRequest).toBeDefined();
    expect(new URL(repositoryRequest!).origin).toBe("http://aas.private:8082");
    // The caller's text may remain in a path segment, but it cannot become a
    // new origin and therefore cannot receive the repository service token.
    expect(forwarded.filter((url) => new URL(url).hostname !== "identity.private")).toHaveLength(1);
    expect(String(result.state.body)).toBe("ok");
  });

  it("rejects path traversal and streams repository response headers through the gateway", async () => {
    configureRepository();
    vi.spyOn(sdk, "authenticateRequest").mockResolvedValue(makeUser("engineer"));
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => String(input).includes("identity.private")
      ? new Response(JSON.stringify({ access_token: "service-token", expires_in: 300 }), { status: 200 })
      : new Response("created", { status: 201, headers: { location: "http://aas.private:8082/shells/new", "content-type": "text/plain" } }));
    vi.stubGlobal("fetch", fetchMock);

    const traversal = makeResponse();
    await aasRepositoryProxy(makeRequest("/api/aas/%2e%2e/private"), traversal.response);
    expect(traversal.state.statusCode).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();

    const created = makeResponse();
    await aasRepositoryProxy(makeRequest("/api/aas/shells"), created.response);
    expect(created.state.statusCode).toBe(201);
    expect(created.state.headers.location).toBe("/api/aas/shells/new");
    expect(String(created.state.body)).toBe("created");
  });

  it("does not return repository credentials or tokens to the browser response", async () => {
    configureRepository();
    vi.spyOn(sdk, "authenticateRequest").mockResolvedValue(makeUser("admin"));
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => String(input).includes("identity.private")
      ? new Response(JSON.stringify({ access_token: "do-not-forward-to-browser", expires_in: 300 }), { status: 200 })
      : new Response("ok", { status: 200, headers: { "content-type": "text/plain" } }));
    vi.stubGlobal("fetch", fetchMock);
    const result = makeResponse();
    await aasRepositoryProxy(makeRequest("/api/aas/description"), result.response);
    expect(result.state.body).toBeInstanceOf(Buffer);
    expect(String(result.state.body)).toBe("ok");
    expect(String(result.state.body)).not.toContain("do-not-forward-to-browser");
  });
});
