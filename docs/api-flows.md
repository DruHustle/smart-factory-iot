# Smart Factory IoT - API Flows & Sequences

## Authentication Flow

```mermaid
sequenceDiagram
    participant Client as Client App
    participant API as Backend API
    participant DB as Database
    participant Auth as Auth Service
    
    Client->>API: POST /api/trpc/auth.login<br/>{email, password}
    API->>Auth: Validate credentials
    Auth->>DB: Query user by email
    DB-->>Auth: User record
    Auth->>Auth: Verify password hash
    Auth-->>API: Validation result
    
    alt Authentication Success
        API->>API: Generate JWT token
        API-->>Client: {token, user}
        Client->>Client: Store token in localStorage
    else Authentication Failed
        API-->>Client: 401 Unauthorized
        Client->>Client: Show error message
    end
```

## Real-time Device Monitoring Flow

```mermaid
sequenceDiagram
    participant Device as IoT Device
    participant WS as WebSocket Server
    participant Backend as Backend Service
    participant DB as Database
    participant Dashboard as Dashboard UI
    
    Device->>WS: Connect WebSocket
    WS-->>Device: Connection established
    
    loop Every 5 seconds
        Device->>WS: Send sensor data
        WS->>Backend: Process reading
        Backend->>DB: Store sensor_reading
        Backend->>Backend: Check thresholds
        
        alt Threshold Exceeded
            Backend->>DB: Create alert
            Backend->>WS: Broadcast alert
            WS->>Dashboard: Real-time update
            Dashboard->>Dashboard: Update UI
        else Within Range
            Backend->>WS: Broadcast reading
            WS->>Dashboard: Real-time update
        end
    end
    
    Device->>WS: Disconnect
    WS-->>Device: Connection closed
```

## Alert Management Flow

```mermaid
sequenceDiagram
    participant Sensor as Sensor Reading
    participant Threshold as Threshold Check
    participant Alert as Alert Service
    participant Notification as Notification Service
    participant User as User
    
    Sensor->>Threshold: New reading value
    Threshold->>Threshold: Compare with limits
    
    alt Value out of range
        Threshold->>Alert: Create alert
        Alert->>Alert: Determine severity
        Alert->>Notification: Send notification
        Notification->>User: Email/SMS alert
        User->>User: Receive notification
        
        User->>Alert: Acknowledge alert
        Alert->>Alert: Mark as acknowledged
        
        User->>Alert: Resolve alert
        Alert->>Alert: Mark as resolved
    else Value in range
        Threshold-->>Sensor: No action
    end
```

## Device Management Flow

```mermaid
sequenceDiagram
    participant UI as Dashboard UI
    participant API as REST API
    participant Service as Device Service
    participant DB as Database
    participant Cache as Cache Layer
    
    UI->>API: GET /api/trpc/devices.list
    API->>Cache: Check cache
    
    alt Cache hit
        Cache-->>API: Cached devices
    else Cache miss
        API->>Service: Fetch devices
        Service->>DB: Query devices
        DB-->>Service: Device records
        Service->>Cache: Update cache
        Service-->>API: Device list
    end
    
    API-->>UI: {devices: [...]}
    UI->>UI: Render device list
    
    UI->>API: POST /api/trpc/devices.update<br/>{id, data}
    API->>Service: Update device
    Service->>DB: Update record
    DB-->>Service: Updated device
    Service->>Cache: Invalidate cache
    Service-->>API: Updated device
    API-->>UI: {success: true}
    UI->>UI: Update UI
```

## OTA Update Flow

```mermaid
sequenceDiagram
    participant Admin as Administrator
    participant API as Backend API
    participant Device as IoT Device
    participant DB as Database
    participant Storage as File Storage
    
    Admin->>API: POST /api/trpc/ota.deploy<br/>{version, devices}
    API->>DB: Create deployments
    API->>Device: Notify device
    Device->>Device: Check update available
    
    Device->>Storage: Download firmware
    Storage-->>Device: Firmware file
    Device->>Device: Verify checksum
    Device->>Device: Install firmware
    Device->>Device: Reboot
    
    Device->>API: POST /api/trpc/ota.reportStatus<br/>{status: completed}
    API->>DB: Update deployment status
    DB-->>API: Updated
    API-->>Admin: Update complete
    Admin->>Admin: Receive notification
```

## Analytics & Reporting Flow

```mermaid
sequenceDiagram
    participant Dashboard as Dashboard
    participant API as Analytics API
    participant Cache as Analytics Cache
    participant DB as Database
    
    Dashboard->>API: GET /api/trpc/analytics.getOEEMetrics<br/>{timeRange}
    API->>Cache: Check cache
    
    alt Cache valid
        Cache-->>API: Cached metrics
    else Cache expired
        API->>DB: Query sensor readings
        DB-->>API: Raw data
        API->>API: Calculate OEE
        API->>API: Calculate availability
        API->>API: Calculate performance
        API->>API: Calculate quality
        API->>Cache: Store metrics
    end
    
    API-->>Dashboard: {oee, availability, performance, quality}
    Dashboard->>Dashboard: Render charts
```

## Error Handling Flow

```mermaid
sequenceDiagram
    participant Client as Client
    participant API as API Server
    participant Handler as Error Handler
    participant Logger as Logger
    participant User as User
    
    Client->>API: Request
    API->>API: Process request
    
    alt Error occurs
        API->>Handler: Handle error
        Handler->>Logger: Log error details
        Logger->>Logger: Store in logs
        
        alt Client error (4xx)
            Handler-->>Client: Error response
            Client->>User: Show error message
        else Server error (5xx)
            Handler->>Logger: Alert administrators
            Handler-->>Client: Generic error
            User->>User: See generic message
        end
    else Success
        API-->>Client: Success response
    end
```

## WebSocket Connection Management

```mermaid
sequenceDiagram
    participant Client as Client App
    participant WS as WebSocket Server
    participant Heartbeat as Heartbeat Service
    
    Client->>WS: Connect
    WS-->>Client: Connection established
    WS->>WS: Add to connection pool
    
    loop Every 30 seconds
        WS->>Heartbeat: Check connections
        Heartbeat->>Client: Ping
        Client-->>Heartbeat: Pong
    end
    
    alt Connection inactive
        Heartbeat->>WS: Connection timeout
        WS->>Client: Close connection
        Client->>Client: Attempt reconnect
    else Connection active
        Heartbeat->>WS: Connection healthy
    end
    
    Client->>WS: Disconnect
    WS->>WS: Remove from pool
    WS-->>Client: Disconnected
```

## Data Aggregation Flow

```mermaid
sequenceDiagram
    participant Sensors as Multiple Sensors
    participant Aggregator as Data Aggregator
    participant Processor as Data Processor
    participant DB as Database
    participant Analytics as Analytics Engine
    
    loop Every minute
        Sensors->>Aggregator: Send readings
        Aggregator->>Aggregator: Collect all readings
        Aggregator->>Processor: Batch process
        Processor->>Processor: Calculate averages
        Processor->>Processor: Detect anomalies
        Processor->>DB: Store aggregated data
        Processor->>Analytics: Update metrics
        Analytics->>Analytics: Recalculate KPIs
    end
```

## Multi-Device Grouping Flow

```mermaid
sequenceDiagram
    participant UI as Dashboard
    participant API as API
    participant Service as Grouping Service
    participant DB as Database
    
    UI->>API: POST /api/trpc/devices.createGroup<br/>{name, deviceIds}
    API->>Service: Create group
    Service->>DB: Insert group record
    Service->>DB: Insert group_members
    DB-->>Service: Success
    Service-->>API: Group created
    API-->>UI: {groupId, devices}
    
    UI->>API: POST /api/trpc/devices.groupBatchOperation<br/>{groupId, operation}
    API->>Service: Execute batch operation
    Service->>DB: Get group devices
    DB-->>Service: Device list
    
    loop For each device
        Service->>Service: Execute operation
        Service->>DB: Update device
    end
    
    Service-->>API: Operation complete
    API-->>UI: {success: true, updated: N}
```

## API Response Format

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
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid credentials",
    "data": {
      "code": "UNAUTHORIZED"
    }
  }
}
```

## Rate Limiting

- **API Endpoints**: 100 requests per minute per user
- **WebSocket**: 1000 messages per minute per connection
- **File Upload**: 10 MB per file, 100 MB per day

## Timeout Configuration

| Operation | Timeout |
|-----------|---------|
| REST API Call | 30 seconds |
| WebSocket Connection | 60 seconds |
| Database Query | 10 seconds |
| File Upload | 5 minutes |
| Device Firmware Download | 30 minutes |

## API Versioning

- Current Version: v1
- Endpoint Pattern: `/api/trpc/[router].[procedure]`
- Backward Compatibility: Maintained for 2 major versions
- Deprecation Notice: 6 months before removal
