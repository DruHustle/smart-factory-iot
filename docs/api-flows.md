# Smart Factory IoT - API Flows & Sequences

This document outlines the primary API flows and sequence diagrams for the Smart Factory IoT platform. The backend is built using **Node.js with Express and tRPC**, ensuring type-safe API contracts between the server and the React frontend.

## 1. Authentication and Authorization Flow

The system uses a combination of password-based login and a session-based JWT token stored in a secure cookie.

```mermaid
sequenceDiagram
    participant Client as Client App (React)
    participant API as Backend API (tRPC)
    participant SDK as SDK/Auth Service
    participant DB as Database (MySQL)
    
    Client->>API: POST /auth.login<br/>{email, password}
    API->>SDK: Get user by email
    SDK->>DB: SELECT user WHERE email=?
    DB-->>SDK: User Record
    
    SDK->>SDK: Compare password hash
    alt Authentication Success
        SDK->>SDK: Generate JWT Session Token
        SDK-->>API: Token & User
        API->>Client: Set-Cookie: ${COOKIE_NAME}=Token
        API-->>Client: {token, user}
    else Authentication Failed
        SDK-->>API: Error (Invalid credentials)
        API-->>Client: 401 Unauthorized
    end
    
    Client->>API: Subsequent Protected Request<br/>(with Cookie)
    API->>SDK: Authenticate Request
    SDK->>SDK: Verify JWT Token
    SDK->>DB: Get user by openId (for context)
    DB-->>SDK: User Record
    SDK-->>API: User Context
    API->>API: Execute Procedure
    API-->>Client: Response
```

## 2. Real-time Sensor Data Ingestion and Alerting Flow

IoT devices send sensor readings to the server, which processes them in real-time to check for threshold violations and broadcast updates via WebSocket.

```mermaid
sequenceDiagram
    participant Device as IoT Device
    participant API as Backend API (tRPC)
    participant DB as Database
    participant Notif as Notification Service
    participant WS as WebSocket Manager
    participant Dashboard as Dashboard UI
    
    Device->>API: POST /readings.create<br/>{deviceId, data, timestamp}
    API->>DB: Store sensor_reading
    
    API->>Notif: Check thresholds for device
    Notif->>DB: Get ALERT_THRESHOLDS
    DB-->>Notif: Thresholds
    
    alt Threshold Exceeded
        Notif->>DB: Create ALERTS record
        DB-->>Notif: Alert ID
        Notif->>Notif: Queue external notifications (Email/SMS)
        WS->>WS: Broadcast to 'alerts' channel
        WS->>Dashboard: Real-time Alert Update
    else Within Range
        WS->>WS: Broadcast to 'readings' channel
        WS->>Dashboard: Real-time Data Update
    end
    
    API-->>Device: 200 OK
```

## 3. Over-The-Air (OTA) Firmware Deployment Flow

The administrator initiates a firmware update, which is tracked through a deployment record and reported by the device.

```mermaid
sequenceDiagram
    participant Admin as Administrator
    participant API as Backend API (tRPC)
    participant DB as Database
    participant Device as IoT Device
    participant Storage as Firmware Storage (S3)
    
    Admin->>API: POST /ota.deploy<br/>{deviceId, firmwareVersionId}
    API->>DB: Create OTA_DEPLOYMENTS<br/>(status: 'pending')
    DB-->>API: Deployment Record
    
    API->>Device: Notify device (via MQTT/WS)
    
    Device->>Device: Check for pending deployment
    Device->>API: POST /ota.updateStatus<br/>{id, status: 'downloading'}
    
    Device->>Storage: GET Firmware File
    Storage-->>Device: Firmware Binary
    
    Device->>Device: Verify Checksum & Install
    
    Device->>API: POST /ota.updateStatus<br/>{id, status: 'completed'}
    API->>DB: Update OTA_DEPLOYMENTS<br/>(status: 'completed')
    API->>DB: Update DEVICES.firmwareVersion
    DB-->>API: Success
    
    API-->>Admin: Deployment complete
```

## 4. Device Grouping and Batch Operation Flow

The `DeviceGroupingService` manages logical groups (zones, production lines) and enables batch operations across all devices in a group.

```mermaid
sequenceDiagram
    participant UI as Dashboard UI
    participant API as Backend API (tRPC)
    participant Grouping as Device Grouping Service
    participant DB as Database
    
    UI->>API: POST /groups.createBatchOperation<br/>{groupId, operation, parameters}
    API->>Grouping: createBatchOperation
    Grouping->>Grouping: Generate batch ID
    Grouping->>Grouping: Store BatchOperation (status: 'pending')
    Grouping-->>API: BatchOperation Record
    
    API->>Grouping: Get devices in group
    Grouping->>Grouping: Look up deviceIds
    
    loop For each deviceId in group
        Grouping->>Grouping: Execute operation (e.g., send restart command)
        Grouping->>Grouping: Update BatchOperation progress
    end
    
    Grouping->>Grouping: Update BatchOperation (status: 'completed')
    Grouping-->>API: Final BatchOperation Record
    API-->>UI: Operation Status
```

## 5. Analytics and Reporting Flow

The analytics API aggregates historical sensor data to calculate KPIs like energy consumption and OEE (Overall Equipment Effectiveness).

```mermaid
sequenceDiagram
    participant Dashboard as Dashboard UI
    participant API as Backend API (tRPC)
    participant DB as Database
    
    Dashboard->>API: GET /analytics.getEnergy<br/>{startTime, endTime, intervalMs}
    
    API->>DB: Get all device IDs
    DB-->>API: Device IDs
    
    API->>DB: GetAggregatedReadings<br/>(deviceIds, time range, interval)
    DB-->>API: Aggregated Data (Avg Temp, Avg Power per interval)
    
    API->>API: Format data for chart
    
    API-->>Dashboard: Time-series Data
    
    Dashboard->>API: POST /export.analyticsReport<br/>{startTime, endTime}
    API->>API: Generate report data (Overview, OEE, Energy)
    API->>API: Generate HTML for PDF conversion
    API-->>Dashboard: {html, filename}
    
    Dashboard->>Dashboard: Download PDF Report
```

## 6. API Response Structure (tRPC)

The tRPC framework provides a standardized, type-safe response structure.

### Success Response

```json
{
  "result": {
    "data": {
      "id": 1,
      "name": "Device 1",
      "status": "online"
    }
  }
}
```

### Error Response

All errors are standardized using `TRPCError` with a clear code and message.

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or missing authentication",
    "data": {
      "code": "FORBIDDEN",
      "httpStatus": 403
    }
  }
}
```

## 7. Security and Performance Considerations

| Feature | Description | Configuration |
| :--- | :--- | :--- |
| **Rate Limiting** | Protects against brute-force and denial-of-service attacks. | 100 requests/minute per IP for REST endpoints. |
| **Input Validation** | Ensures all incoming data conforms to expected schemas. | Implemented via **Zod** for all tRPC procedures. |
| **Authentication** | Uses secure, signed JWTs stored in HTTP-only cookies. | JWT expiration set to 1 year. |
| **Data Encryption** | Sensitive data (passwords) are hashed with **bcrypt**. | HTTPS/TLS enforced for all traffic. |
| **Timeouts** | Prevents long-running requests from consuming resources. | API Gateway timeout: 30 seconds. |
| **Caching** | Reduces database load for static or frequently accessed data. | Redis cache for thresholds and device metadata. |
