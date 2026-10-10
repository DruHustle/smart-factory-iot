import { expect, test } from "vitest";
import { spawn } from "node:child_process";
import { createServer } from "node:net";

test("startup dependency failures leave liveness responsive and API readiness unavailable", async () => {
  const socket = createServer();
  await new Promise<void>(resolve => socket.listen(0, "127.0.0.1", resolve));
  const address = socket.address();
  if (!address || typeof address === "string") throw new Error("No isolated test port");
  const port = address.port;
  await new Promise<void>(resolve => socket.close(() => resolve()));
  const child = spawn(process.execPath, ["--import", "tsx", "server/_core/index.ts"], {
    env: {
      ...process.env, NODE_ENV: "test", PORT: String(port), API_ONLY: "true",
      BACKEND_DEPLOYMENT_MODE: "standalone",
      DATABASE_URL: "postgresql://test:test@127.0.0.1:1/startup_test",
      TEST_DATABASE_URL: "postgresql://test:test@127.0.0.1:1/startup_test",
      DATABASE_SSL_MODE: "disable", REDIS_URL: "redis://127.0.0.1:1",
      JWT_SECRET: "isolated-startup-test-secret-at-least-32-bytes",
      ENABLE_DEMO_ACCOUNTS: "false", ENABLE_DEMO_DATA: "false", ASSISTANT_PROVIDER: "disabled",
    },
    stdio: "ignore",
  });
  try {
    let live = false;
    for (let attempt = 0; attempt < 150; attempt++) {
      try { live = (await fetch(`http://127.0.0.1:${port}/health/live`)).status === 200; } catch { /* Wait for the HTTP listener. */ }
      if (live) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    expect(live).toBe(true);
    const ready = await fetch(`http://127.0.0.1:${port}/health/ready`);
    expect(ready.status).toBe(503);
    expect((await ready.json()).dependency).toBe("startup");
    expect((await fetch(`http://127.0.0.1:${port}/api/trpc/auth.me`)).status).toBe(503);
  } finally {
    child.kill("SIGTERM");
    await Promise.race([new Promise(resolve => child.once("exit", resolve)), new Promise(resolve => setTimeout(resolve, 1000))]);
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
  }
}, 20_000);
