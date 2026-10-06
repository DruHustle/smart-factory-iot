import { createServer } from "node:http";
import { describe, expect, it } from "vitest";
import { WebSocket as WebSocketClient } from "ws";
import { WebSocketManager } from "./websocket";

describe("WebSocket upgrade authentication", () => {
  it("fails closed when no session authorization callback accepts the client", async () => {
    const server = createServer();
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected an ephemeral TCP port");

    const manager = new WebSocketManager();
    let client: WebSocketClient | undefined;
    try {
      await manager.initialize(server);
      client = new WebSocketClient(`ws://127.0.0.1:${address.port}/ws`);
      const status = await new Promise<number>((resolve, reject) => {
        client!.once("unexpected-response", (_request, response) => resolve(response.statusCode));
        client!.once("error", reject);
      });
      expect(status).toBe(401);
    } finally {
      client?.terminate();
      manager.shutdown();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
