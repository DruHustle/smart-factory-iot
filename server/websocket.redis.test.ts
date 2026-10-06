import { createServer, type Server } from "node:http";
import { once } from "node:events";
import { afterEach, describe, expect, it } from "vitest";
import { WebSocket as WebSocketClient } from "ws";
import { WebSocketManager } from "./websocket";

const integration = describe.skipIf(!process.env.REDIS_URL);
const managers: WebSocketManager[] = [];
const servers: Server[] = [];
const sockets: WebSocketClient[] = [];

function listen(server: Server): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") return reject(new Error("Expected an ephemeral TCP port"));
      resolve(address.port);
    });
  });
}

function nextJsonMessage(socket: WebSocketClient): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out waiting for a WebSocket message")), 5_000);
    socket.once("message", (data) => {
      clearTimeout(timer);
      try { resolve(JSON.parse(data.toString()) as Record<string, unknown>); }
      catch (error) { reject(error); }
    });
  });
}

integration("Redis WebSocket fan-out", () => {
  afterEach(async () => {
    for (const socket of sockets.splice(0)) socket.close();
    for (const manager of managers.splice(0)) manager.shutdown();
    await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
  });

  it("delivers an AAS change published by one replica to a socket on another", async () => {
    const publisherServer = createServer();
    const subscriberServer = createServer();
    servers.push(publisherServer, subscriberServer);
    await listen(publisherServer);
    const subscriberPort = await listen(subscriberServer);

    const publisher = new WebSocketManager();
    const subscriber = new WebSocketManager();
    managers.push(publisher, subscriber);
    await Promise.all([
      publisher.initialize(publisherServer, "/ws", async () => true),
      subscriber.initialize(subscriberServer, "/ws", async () => true),
    ]);

    const client = new WebSocketClient(`ws://127.0.0.1:${subscriberPort}/ws`);
    sockets.push(client);
    await once(client, "open");
    client.send(JSON.stringify({ type: "subscribe", channels: ["aas:all"] }));
    expect(await nextJsonMessage(client)).toMatchObject({ type: "subscription_confirm", data: { channels: ["aas:all"] } });

    const nextEvent = nextJsonMessage(client);
    publisher.broadcastAasChanged("urn:factory:compressor:1", "updated", 4);
    expect(await nextEvent).toMatchObject({
      type: "aas_changed",
      data: { assetId: "urn:factory:compressor:1", change: "updated", version: 4 },
    });
  });
});
