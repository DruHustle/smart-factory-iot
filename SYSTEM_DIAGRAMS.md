# Smart Factory IoT Dashboard - System Diagrams

**Version:** 2.0.0
**Author:** Andrew Gotora
**Email:** [andrewgotora@yahoo.com](mailto:andrewgotora@yahoo.com)

## 1. System Architecture Diagram

The system architecture follows a client-server model with the following key components:

```
Users
  ↓
Frontend (React)
  ↕
Backend (Node.js/Express)
  ├→ Database (MySQL)
  ├→ WebSocket Server
  │   ↕
  │   Frontend (Real-time updates)
  └→ Notification Service
      ↓
      Email/SMS Gateway
```

This architecture ensures that the frontend can receive real-time updates from the backend through WebSocket connections, while the notification service handles asynchronous alert delivery.

## 2. Data Flow Diagram

### 2.1. Sensor Data Flow

1. **IoT Device** sends sensor readings to the backend API.
2. **Backend** receives the reading and stores it in the database.
3. **Backend** broadcasts the reading to all subscribed WebSocket clients.
4. **Frontend** receives the update and refreshes the dashboard display.

### 2.2. Alert Flow

1. **Backend** receives a sensor reading.
2. **Backend** checks the reading against configured thresholds.
3. If a threshold is exceeded, the backend creates an alert.
4. **Backend** broadcasts the alert to WebSocket clients.
5. **Notification Service** sends email/SMS notifications based on configured rules.
6. **Frontend** displays the alert in the dashboard.

### 2.3. Device Grouping Flow

1. **User** creates a device group through the frontend.
2. **Frontend** sends a request to the backend API.
3. **Backend** stores the group configuration in the database.
4. **User** can then perform batch operations on all devices in the group.
5. **Backend** applies the operation to all devices in the group.

## 3. WebSocket Communication Flow

The WebSocket server manages real-time communication between the backend and frontend clients.

### 3.1. Connection Establishment

1. Client connects to the WebSocket server at `/ws`.
2. Server assigns a unique client ID.
3. Client sends subscription messages to specify which channels it wants to receive.
4. Server maintains a mapping of channels to connected clients.

### 3.2. Message Broadcasting

1. An event occurs on the backend (e.g., sensor reading received).
2. Backend publishes the event to the appropriate channel.
3. Server broadcasts the message to all clients subscribed to that channel.
4. Clients receive the message and update their local state.

### 3.3. Channel Types

- `device:<deviceId>:sensor` - Real-time sensor data for a specific device.
- `device:<deviceId>:alert` - Alerts for a specific device.
- `alerts:all` - All alerts in the system.
- `device:<deviceId>:status` - Status changes for a specific device.

## 4. Notification Service Architecture

The notification service uses a provider-based architecture to support multiple notification channels.

```
Notification Service
  ├→ Email Provider (SendGrid, AWS SES)
  ├→ SMS Provider (Twilio, AWS SNS)
  └→ Push Provider (Firebase Cloud Messaging)
```

When a threshold is exceeded, the notification service:

1. Checks the configured notification rules.
2. Determines which providers should send notifications.
3. Queues the notification messages.
4. Sends the messages through the appropriate providers.
5. Retries failed messages up to a maximum number of times.

## 5. Device Grouping Architecture

Device groups enable efficient management of large numbers of devices.

```
Device Group
  ├→ Devices (1..N)
  ├→ Batch Operations
  │   ├→ Update Status
  │   ├→ Update Configuration
  │   ├→ Firmware Update
  │   └→ Restart
  └→ Group Analytics
      ├→ Average Temperature
      ├→ Average Humidity
      ├→ Total Alerts
      └→ Device Status Summary
```

## 6. Database Schema Diagram

The database schema is organized around the following main entities:

```
Users
  ├→ Devices
  │   ├→ Sensor Readings
  │   ├→ Alerts
  │   ├→ Alert Thresholds
  │   └→ OTA Deployments
  └→ Firmware Versions
```

Each device can have multiple sensor readings, alerts, and thresholds. The OTA deployments track firmware updates for each device.

## 7. API Endpoint Hierarchy

The API is organized into logical groups:

```
/api/trpc
  ├→ /auth
  │   ├→ me
  │   └→ logout
  ├→ /devices
  │   ├→ list
  │   ├→ getById
  │   ├→ create
  │   ├→ update
  │   └→ delete
  ├→ /readings
  │   ├→ getForDevice
  │   ├→ getLatest
  │   ├→ getAggregated
  │   └→ create
  ├→ /thresholds
  │   ├→ getForDevice
  │   ├→ create
  │   ├→ update
  │   └→ delete
  ├→ /alerts
  │   ├→ list
  │   ├→ create
  │   ├→ updateStatus
  │   └→ getStats
  ├→ /notifications
  │   ├→ registerConfig
  │   ├→ getConfigs
  │   ├→ updateConfig
  │   ├→ deleteConfig
  │   └→ getQueueSize
  └→ /groups
      ├→ create
      ├→ list
      ├→ getById
      ├→ update
      ├→ delete
      ├→ addDevices
      ├→ removeDevices
      ├→ createBatchOperation
      └→ getBatchOperation
```

## 8. SOLID Principles Implementation

### 8.1. Single Responsibility Principle

Each service has a single, well-defined responsibility:

- `websocket.ts`: Manages WebSocket connections and message broadcasting.
- `notifications.ts`: Handles notification delivery through multiple channels.
- `deviceGrouping.ts`: Manages device groups and batch operations.

### 8.2. Open/Closed Principle

The notification service is open for extension through new providers without modifying existing code.

### 8.3. Liskov Substitution Principle

All notification providers implement the same interface, allowing them to be substituted without affecting the system.

### 8.4. Interface Segregation Principle

API endpoints are segregated by functionality, so clients only interact with relevant endpoints.

### 8.5. Dependency Inversion Principle

The system uses dependency injection and interfaces to decouple high-level modules from low-level implementations.
