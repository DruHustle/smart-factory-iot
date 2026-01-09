import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { EventEmitter } from 'events';

/**
 * WebSocket message types for real-time sensor data streaming
 */
export enum WebSocketMessageType {
  SENSOR_DATA = 'sensor_data',
  ALERT = 'alert',
  DEVICE_STATUS = 'device_status',
  SUBSCRIPTION_CONFIRM = 'subscription_confirm',
  ERROR = 'error',
  HEARTBEAT = 'heartbeat',
}

/**
 * WebSocket message structure
 */
export interface WebSocketMessage {
  type: WebSocketMessageType;
  data: unknown;
  timestamp: number;
}

/**
 * Sensor data update message
 */
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

/**
 * Alert message
 */
export interface AlertMessage extends WebSocketMessage {
  type: WebSocketMessageType.ALERT;
  data: {
    alertId: number;
    deviceId: number;
    type: string;
    severity: 'info' | 'warning' | 'critical';
    message: string;
    timestamp: number;
  };
}

/**
 * Device status message
 */
export interface DeviceStatusMessage extends WebSocketMessage {
  type: WebSocketMessageType.DEVICE_STATUS;
  data: {
    deviceId: number;
    status: 'online' | 'offline' | 'maintenance' | 'error';
    timestamp: number;
  };
}

/**
 * WebSocket connection manager
 * Handles real-time communication with clients
 */
export class WebSocketManager extends EventEmitter {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Set<WebSocket>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize WebSocket server
   */
  public initialize(server: Server, path: string = '/ws'): void {
    this.wss = new WebSocketServer({ server, path });

    this.wss.on('connection', (ws: WebSocket) => {
      this.handleConnection(ws);
    });

    // Send heartbeat to all clients every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      this.broadcastHeartbeat();
    }, 30000);

    console.log('[WebSocket] Server initialized');
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket): void {
    const clientId = this.generateClientId();
    console.log(`[WebSocket] Client connected: ${clientId}`);

    ws.on('message', (data: string) => {
      try {
        const message = JSON.parse(data);
        this.handleMessage(clientId, ws, message);
      } catch (error) {
        console.error(`[WebSocket] Failed to parse message:`, error);
        this.sendError(ws, 'Invalid message format');
      }
    });

    ws.on('close', () => {
      this.handleDisconnection(clientId);
    });

    ws.on('error', (error: Error) => {
      console.error(`[WebSocket] Client error (${clientId}):`, error);
    });
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(clientId: string, ws: WebSocket, message: any): void {
    if (message.type === 'subscribe') {
      const { channels } = message;
      if (Array.isArray(channels)) {
        this.subscribe(clientId, ws, channels);
      }
    } else if (message.type === 'unsubscribe') {
      const { channels } = message;
      if (Array.isArray(channels)) {
        this.unsubscribe(clientId, channels);
      }
    }
  }

  /**
   * Subscribe client to channels
   */
  private subscribe(clientId: string, ws: WebSocket, channels: string[]): void {
    for (const channel of channels) {
      if (!this.clients.has(channel)) {
        this.clients.set(channel, new Set());
      }
      this.clients.get(channel)!.add(ws);
    }

    this.send(ws, {
      type: WebSocketMessageType.SUBSCRIPTION_CONFIRM,
      data: { channels },
      timestamp: Date.now(),
    });

    console.log(`[WebSocket] Client ${clientId} subscribed to: ${channels.join(', ')}`);
  }

  /**
   * Unsubscribe client from channels
   */
  private unsubscribe(clientId: string, channels: string[]): void {
    for (const channel of channels) {
      const clients = this.clients.get(channel);
      if (clients) {
        // Find and remove the client's WebSocket
        for (const ws of clients) {
          if (ws.readyState === WebSocket.OPEN) {
            clients.delete(ws);
          }
        }
      }
    }
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(clientId: string): void {
    // Remove client from all channels
    for (const [, clients] of this.clients) {
      for (const ws of clients) {
        if (ws.readyState === WebSocket.CLOSED) {
          clients.delete(ws);
        }
      }
    }
    console.log(`[WebSocket] Client disconnected: ${clientId}`);
  }

  /**
   * Broadcast sensor data to subscribed clients
   */
  public broadcastSensorData(deviceId: number, data: any): void {
    const channel = `device:${deviceId}:sensor`;
    const message: SensorDataMessage = {
      type: WebSocketMessageType.SENSOR_DATA,
      data: {
        deviceId,
        ...data,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    };

    this.broadcast(channel, message);
  }

  /**
   * Broadcast alert to subscribed clients
   */
  public broadcastAlert(deviceId: number, alert: any): void {
    const channel = `device:${deviceId}:alert`;
    const alertChannel = 'alerts:all';

    const message: AlertMessage = {
      type: WebSocketMessageType.ALERT,
      data: {
        alertId: alert.id,
        deviceId,
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    };

    this.broadcast(channel, message);
    this.broadcast(alertChannel, message);
  }

  /**
   * Broadcast device status change
   */
  public broadcastDeviceStatus(deviceId: number, status: string): void {
    const channel = `device:${deviceId}:status`;
    const message: DeviceStatusMessage = {
      type: WebSocketMessageType.DEVICE_STATUS,
      data: {
        deviceId,
        status: status as 'online' | 'offline' | 'maintenance' | 'error',
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    };

    this.broadcast(channel, message);
  }

  /**
   * Broadcast message to all clients in a channel
   */
  private broadcast(channel: string, message: WebSocketMessage): void {
    const clients = this.clients.get(channel);
    if (clients) {
      const clientArray = Array.from(clients);
      for (const ws of clientArray) {
        this.send(ws, message);
      }
    }
  }

  /**
   * Send message to specific client
   */
  private send(ws: WebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Send error message to client
   */
  private sendError(ws: WebSocket, error: string): void {
    this.send(ws, {
      type: WebSocketMessageType.ERROR,
      data: { error },
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast heartbeat to all connected clients
   */
  private broadcastHeartbeat(): void {
    const channelsArray = Array.from(this.clients.entries());
    for (const [, clients] of channelsArray) {
      const clientArray = Array.from(clients);
      for (const ws of clientArray) {
        this.send(ws, {
          type: WebSocketMessageType.HEARTBEAT,
          data: {},
          timestamp: Date.now(),
        });
      }
    }
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Shutdown WebSocket server
   */
  public shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.wss) {
      this.wss.close(() => {
        console.log('[WebSocket] Server shut down');
      });
    }

    this.clients.clear();
  }

  /**
   * Get number of connected clients
   */
  public getConnectedClientsCount(): number {
    let count = 0;
    const clientsArray = Array.from(this.clients.values());
    for (const clients of clientsArray) {
      count += clients.size;
    }
    return count;
  }

  /**
   * Get number of subscribed channels
   */
  public getSubscribedChannelsCount(): number {
    return this.clients.size;
  }
}

export const wsManager = new WebSocketManager();
