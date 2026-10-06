import { createClient } from "redis";
import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage, Server } from "http";
import { Socket } from "net";
import { EventEmitter } from "events";

/** WebSocket event kinds sent to browser clients. */
export enum WebSocketMessageType {
  SENSOR_DATA = "sensor_data",
  ALERT = "alert",
  DEVICE_STATUS = "device_status",
  AAS_CHANGED = "aas_changed",
  SUBSCRIPTION_CONFIRM = "subscription_confirm",
  ERROR = "error",
  HEARTBEAT = "heartbeat",
}

export interface WebSocketMessage {
  type: WebSocketMessageType;
  data: unknown;
  timestamp: number;
}

export interface SensorDataMessage extends WebSocketMessage {
  type: WebSocketMessageType.SENSOR_DATA;
  data: {
    deviceId: number;
    temperature?: number;
    humidity?: number;
    vibration?: number;
    power?: number;
    pressure?: number;
    rpm?: number;
    timestamp: number;
  };
}

export interface AlertMessage extends WebSocketMessage {
  type: WebSocketMessageType.ALERT;
  data: {
    alertId: number;
    deviceId: number;
    type: string;
    severity: "info" | "warning" | "critical";
    message: string;
    timestamp: number;
  };
}

export interface DeviceStatusMessage extends WebSocketMessage {
  type: WebSocketMessageType.DEVICE_STATUS;
  data: {
    deviceId: number;
    status: "online" | "offline" | "maintenance" | "error";
    timestamp: number;
  };
}

export interface AasChangedMessage extends WebSocketMessage {
  type: WebSocketMessageType.AAS_CHANGED;
  data: { assetId: string; change: string; version?: number };
}

const REDIS_CHANNEL_PREFIX = "smart-factory:websocket:";
const MAX_SUBSCRIPTIONS_PER_CLIENT = 32;
const CHANNEL_PATTERN = /^[A-Za-z0-9:_-]{1,160}$/;

type FanoutEnvelope = {
  version: 1;
  channel: string;
  message: WebSocketMessage;
};

/**
 * Redis carries broadcasts between dashboard replicas. WebSocket objects and
 * their channel membership stay local to the process that owns each socket.
 */
export class WebSocketManager extends EventEmitter {
  private wss: WebSocketServer | null = null;
  private readonly clients = new Map<string, Set<WebSocket>>();
  private readonly subscriptionsBySocket = new Map<WebSocket, Set<string>>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private redisPublisher: ReturnType<typeof createClient> | null = null;
  private redisSubscriber: ReturnType<typeof createClient> | null = null;
  private upgradeHandler: ((request: IncomingMessage, socket: Socket, head: Buffer) => void) | null = null;
  private httpServer: Server | null = null;

  public async initialize(
    server: Server,
    path = "/ws",
    authorizeUpgrade: (request: IncomingMessage) => Promise<boolean> = async () => false,
  ): Promise<void> {
    if (this.wss) throw new Error("WebSocket server is already initialized");
    await this.initializeRedis();

    this.wss = new WebSocketServer({ noServer: true, maxPayload: 1024 * 1024, perMessageDeflate: false });
    this.httpServer = server;
    this.wss.on("connection", (ws: WebSocket) => this.handleConnection(ws));
    this.upgradeHandler = (request, socket, head) => {
      const requestPath = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`).pathname;
      if (requestPath !== path) return;
      void authorizeUpgrade(request).then((authorized) => {
        if (!authorized || !this.wss) {
          socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
          socket.destroy();
          return;
        }
        this.wss.handleUpgrade(request, socket, head, (ws) => this.wss?.emit("connection", ws, request));
      }).catch(() => {
        socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
        socket.destroy();
      });
    };
    server.on("upgrade", this.upgradeHandler);
    this.heartbeatInterval = setInterval(() => this.broadcastHeartbeat(), 30_000);
    console.log("[WebSocket] Server initialized");
  }

  private async initializeRedis(): Promise<void> {
    const redisUrl = process.env.REDIS_URL?.trim();
    if (!redisUrl) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("REDIS_URL is required in production for cross-replica WebSocket fan-out");
      }
      console.warn("[WebSocket] REDIS_URL is unset; broadcasts are local to this process");
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(redisUrl);
    } catch {
      throw new Error("REDIS_URL must be a valid redis:// or rediss:// URL");
    }
    if (!["redis:", "rediss:"].includes(parsedUrl.protocol) || !parsedUrl.hostname || !/^(?:\/(?:\d+)?)?$/.test(parsedUrl.pathname)) {
      throw new Error("REDIS_URL must be a valid redis:// or rediss:// URL with an optional numeric database path");
    }
    if (process.env.NODE_ENV === "production" && parsedUrl.protocol !== "rediss:") {
      throw new Error("REDIS_URL must use rediss:// in production");
    }

    const publisher = createClient({ url: redisUrl });
    const subscriber = publisher.duplicate();
    publisher.on("error", (error) => console.error("[WebSocket] Redis publisher error:", error.message));
    subscriber.on("error", (error) => console.error("[WebSocket] Redis subscriber error:", error.message));

    try {
      await Promise.all([publisher.connect(), subscriber.connect()]);
      await subscriber.pSubscribe(`${REDIS_CHANNEL_PREFIX}*`, (payload) => this.receiveFanout(payload));
    } catch (error) {
      await Promise.allSettled([
        publisher.isOpen ? publisher.quit() : Promise.resolve(),
        subscriber.isOpen ? subscriber.quit() : Promise.resolve(),
      ]);
      throw new Error(`Could not initialize Redis WebSocket fan-out: ${error instanceof Error ? error.message : "unknown error"}`);
    }

    this.redisPublisher = publisher;
    this.redisSubscriber = subscriber;
    console.log("[WebSocket] Redis fan-out connected");
  }

  private handleConnection(ws: WebSocket): void {
    const clientId = this.generateClientId();
    this.subscriptionsBySocket.set(ws, new Set());
    console.log(`[WebSocket] Client connected: ${clientId}`);

    ws.on("message", (data) => {
      try {
        const message: unknown = JSON.parse(data.toString());
        this.handleMessage(clientId, ws, message);
      } catch (error) {
        console.error("[WebSocket] Failed to parse message:", error);
        this.sendError(ws, "Invalid message format");
      }
    });

    ws.on("close", () => {
      this.removeSocket(ws);
      console.log(`[WebSocket] Client disconnected: ${clientId}`);
    });
    ws.on("error", (error: Error) => console.error(`[WebSocket] Client error (${clientId}):`, error));
  }

  private handleMessage(clientId: string, ws: WebSocket, message: unknown): void {
    if (!message || typeof message !== "object" || !("type" in message)) {
      this.sendError(ws, "Invalid message format");
      return;
    }

    const candidate = message as { type: unknown; channels?: unknown };
    if (candidate.type !== "subscribe" && candidate.type !== "unsubscribe") {
      this.sendError(ws, "Unsupported message type");
      return;
    }
    if (!Array.isArray(candidate.channels) || candidate.channels.some((channel) => typeof channel !== "string")) {
      this.sendError(ws, "Channels must be an array of strings");
      return;
    }
    const channels = [...new Set(candidate.channels.filter((channel: string) => CHANNEL_PATTERN.test(channel)))];
    if (channels.length === 0) {
      this.sendError(ws, "No valid channels were provided");
      return;
    }

    if (candidate.type === "subscribe") this.subscribe(clientId, ws, channels);
    else this.unsubscribe(clientId, ws, channels);
  }

  private subscribe(clientId: string, ws: WebSocket, requestedChannels: string[]): void {
    const current = this.subscriptionsBySocket.get(ws) ?? new Set<string>();
    const channels = requestedChannels.filter((channel) => current.has(channel) || current.size < MAX_SUBSCRIPTIONS_PER_CLIENT);
    for (const channel of channels) {
      if (!this.clients.has(channel)) this.clients.set(channel, new Set());
      this.clients.get(channel)!.add(ws);
      current.add(channel);
    }
    this.subscriptionsBySocket.set(ws, current);
    this.send(ws, {
      type: WebSocketMessageType.SUBSCRIPTION_CONFIRM,
      data: { channels },
      timestamp: Date.now(),
    });
    console.log(`[WebSocket] Client ${clientId} subscribed to: ${channels.join(", ")}`);
  }

  private unsubscribe(clientId: string, ws: WebSocket, channels: string[]): void {
    for (const channel of channels) this.removeSubscription(ws, channel);
    console.log(`[WebSocket] Client ${clientId} unsubscribed from: ${channels.join(", ")}`);
  }

  private removeSubscription(ws: WebSocket, channel: string): void {
    const clients = this.clients.get(channel);
    clients?.delete(ws);
    if (clients?.size === 0) this.clients.delete(channel);
    this.subscriptionsBySocket.get(ws)?.delete(channel);
  }

  private removeSocket(ws: WebSocket): void {
    for (const channel of this.subscriptionsBySocket.get(ws) ?? []) this.removeSubscription(ws, channel);
    this.subscriptionsBySocket.delete(ws);
  }

  public broadcastSensorData(deviceId: number, data: Omit<SensorDataMessage["data"], "deviceId" | "timestamp">): void {
    const timestamp = Date.now();
    this.broadcast(`device:${deviceId}:sensor`, {
      type: WebSocketMessageType.SENSOR_DATA,
      data: { deviceId, ...data, timestamp },
      timestamp,
    });
  }

  public broadcastAlert(deviceId: number, alert: { id: number; type: string; severity: "info" | "warning" | "critical"; message: string }): void {
    const timestamp = Date.now();
    const message: AlertMessage = {
      type: WebSocketMessageType.ALERT,
      data: { alertId: alert.id, deviceId, type: alert.type, severity: alert.severity, message: alert.message, timestamp },
      timestamp,
    };
    this.broadcast(`device:${deviceId}:alert`, message);
    this.broadcast("alerts:all", message);
  }

  public broadcastDeviceStatus(deviceId: number, status: DeviceStatusMessage["data"]["status"]): void {
    const timestamp = Date.now();
    this.broadcast(`device:${deviceId}:status`, {
      type: WebSocketMessageType.DEVICE_STATUS,
      data: { deviceId, status, timestamp },
      timestamp,
    });
  }

  public broadcastAasChanged(assetId: string, change: string, version?: number): void {
    if (!assetId || assetId.length > 128 || !change || change.length > 32) return;
    this.broadcast("aas:all", {
      type: WebSocketMessageType.AAS_CHANGED,
      data: { assetId, change, ...(version === undefined ? {} : { version }) },
      timestamp: Date.now(),
    });
  }

  private broadcast(channel: string, message: WebSocketMessage): void {
    const envelope: FanoutEnvelope = { version: 1, channel, message };
    if (!this.redisPublisher) {
      this.deliverLocally(channel, message);
      return;
    }
    void this.redisPublisher.publish(`${REDIS_CHANNEL_PREFIX}${channel}`, JSON.stringify(envelope)).catch((error: unknown) => {
      console.error("[WebSocket] Redis publish failed; delivering to local clients only:", error instanceof Error ? error.message : "unknown error");
      this.deliverLocally(channel, message);
    });
  }

  private receiveFanout(payload: string): void {
    try {
      const envelope = JSON.parse(payload) as Partial<FanoutEnvelope>;
      if (envelope.version !== 1 || typeof envelope.channel !== "string" || !CHANNEL_PATTERN.test(envelope.channel)) return;
      const message = envelope.message;
      if (!message || !Object.values(WebSocketMessageType).includes(message.type) || !Number.isFinite(message.timestamp)) return;
      this.deliverLocally(envelope.channel, message);
    } catch (error) {
      console.error("[WebSocket] Ignored malformed Redis fan-out message:", error instanceof Error ? error.message : "unknown error");
    }
  }

  private deliverLocally(channel: string, message: WebSocketMessage): void {
    for (const ws of this.clients.get(channel) ?? []) this.send(ws, message);
  }

  private send(ws: WebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
  }

  private sendError(ws: WebSocket, error: string): void {
    this.send(ws, { type: WebSocketMessageType.ERROR, data: { error }, timestamp: Date.now() });
  }

  private broadcastHeartbeat(): void {
    const timestamp = Date.now();
    const message: WebSocketMessage = { type: WebSocketMessageType.HEARTBEAT, data: {}, timestamp };
    const sockets = new Set([...this.clients.values()].flatMap((clients) => [...clients]));
    for (const ws of sockets) this.send(ws, message);
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  public isReady(): boolean {
    return !this.redisPublisher || (this.redisPublisher.isReady && this.redisSubscriber?.isReady === true);
  }

  public shutdown(): void {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = null;
    if (this.upgradeHandler && this.httpServer) this.httpServer.off("upgrade", this.upgradeHandler);
    this.upgradeHandler = null;
    this.httpServer = null;
    this.wss?.clients.forEach((client) => client.close(1001, "Server shutting down"));
    this.wss?.close(() => console.log("[WebSocket] Server shut down"));
    this.wss = null;
    this.clients.clear();
    this.subscriptionsBySocket.clear();
    const clients = [this.redisSubscriber, this.redisPublisher].filter((client) => client !== null);
    this.redisSubscriber = null;
    this.redisPublisher = null;
    void Promise.allSettled(clients.map((client) => client!.isOpen ? client!.quit() : Promise.resolve()));
  }

  public getConnectedClientsCount(): number {
    return new Set([...this.clients.values()].flatMap((clients) => [...clients])).size;
  }

  public getSubscribedChannelsCount(): number {
    return this.clients.size;
  }
}

export const wsManager = new WebSocketManager();
