# Smart Factory IoT - Database Schema

This document details the relational database schema for the Smart Factory IoT platform, which uses MySQL (Aiven MySQL) as its primary data store. The schema is designed for high-volume time-series data ingestion, efficient querying, and robust alert management.

## 1. Entity Relationship Diagram (ERD)

The following Mermaid diagram illustrates the relationships between the core entities in the database:

```mermaid
erDiagram
    USERS ||--o{ DEVICES : manages
    USERS ||--o{ ALERTS : creates
    USERS ||--o{ ALERT_THRESHOLDS : sets
    DEVICES ||--o{ SENSOR_READINGS : generates
    DEVICES ||--o{ ALERTS : triggers
    DEVICES ||--o{ OTA_DEPLOYMENTS : receives
    ALERT_THRESHOLDS ||--o{ ALERTS : triggers
    OTA_VERSIONS ||--o{ OTA_DEPLOYMENTS : uses
    
    USERS {
        int id PK
        string openId UK "Microsoft Entra ID"
        string email UK
        string password_hash
        string name
        string role ENUM("user", "admin")
        timestamp created_at
        timestamp updated_at
        timestamp lastSignedIn
    }
    
    DEVICES {
        int id PK
        string deviceId UK
        string name
        string type ENUM("sensor", "actuator", "controller", "gateway")
        string status ENUM("online", "offline", "maintenance", "error")
        string location
        string zone
        string firmwareVersion
        timestamp lastSeen
        json metadata
        timestamp created_at
        timestamp updated_at
    }
    
    SENSOR_READINGS {
        int id PK
        int deviceId FK
        float temperature
        float humidity
        float pressure
        float vibration
        float power
        float rpm
        bigint timestamp "Recorded time in milliseconds"
        timestamp createdAt
    }
    
    ALERTS {
        int id PK
        int deviceId FK
        string type ENUM("threshold_exceeded", "device_offline", "firmware_update", "maintenance_required", "system_error")
        string severity ENUM("info", "warning", "critical")
        string metric
        float value
        float threshold
        text message
        string status ENUM("active", "acknowledged", "resolved")
        int acknowledgedBy FK "User ID"
        timestamp acknowledgedAt
        timestamp resolvedAt
        timestamp createdAt
        timestamp updatedAt
    }
    
    ALERT_THRESHOLDS {
        int id PK
        int deviceId FK
        string metric ENUM("temperature", "humidity", "vibration", "power", "pressure", "rpm")
        float minValue
        float maxValue
        float warningMin
        float warningMax
        boolean enabled
        timestamp createdAt
        timestamp updatedAt
    }
    
    OTA_VERSIONS {
        int id PK
        string version UK
        string deviceType ENUM("sensor", "actuator", "controller", "gateway")
        text releaseNotes
        string fileUrl
        int fileSize
        string checksum
        boolean isStable
        timestamp createdAt
    }
    
    OTA_DEPLOYMENTS {
        int id PK
        int deviceId FK
        int firmwareVersionId FK
        string previousVersion
        string status ENUM("pending", "downloading", "installing", "completed", "failed", "rolled_back")
        int progress
        text errorMessage
        timestamp startedAt
        timestamp completedAt
        timestamp createdAt
        timestamp updatedAt
    }
```

## 2. Core Table Specifications

The following tables are central to the application's operation.

| Table | Description | Key Columns |
| :--- | :--- | :--- |
| **USERS** | Stores user accounts, integrated with Microsoft Entra ID for authentication. | `id`, `openId`, `email`, `password_hash`, `role` |
| **DEVICES** | Represents registered IoT devices, including type, status, and location metadata. | `id`, `deviceId`, `name`, `type`, `status`, `zone` |
| **SENSOR_READINGS** | High-volume time-series data for various sensor metrics. Optimized for fast writes and range queries. | `id`, `deviceId`, `timestamp`, `temperature`, `power` |
| **ALERTS** | Records system alerts triggered by threshold violations or device status changes. | `id`, `deviceId`, `type`, `severity`, `status` |
| **ALERT_THRESHOLDS** | Configuration for custom alert rules per device and metric. | `id`, `deviceId`, `metric`, `minValue`, `maxValue` |
| **OTA_VERSIONS** | Manages available firmware versions for Over-The-Air (OTA) updates. | `id`, `version`, `deviceType`, `isStable` |
| **OTA_DEPLOYMENTS** | Tracks the status and history of firmware deployments to devices. | `id`, `deviceId`, `firmwareVersionId`, `status` |

## 3. Indexing and Performance Strategy

The database is optimized for time-series and real-time monitoring workloads.

### Indexing Strategy

- **Primary Indexes**: Primary keys (`id`) on all tables for fast lookups.
- **Foreign Key Indexes**: Indexes on all foreign key columns to optimize join operations.
- **Time-Series Indexing**: A composite index on `(deviceId, timestamp)` in `SENSOR_READINGS` is crucial for efficient time-range queries for a specific device.
- **Filtering Indexes**: Indexes on `(status, severity)` in `ALERTS` and `(deviceId, status)` in `OTA_DEPLOYMENTS` to support dashboard filtering.

### Query Patterns

| Query Type | Purpose | Example Query |
| :--- | :--- | :--- |
| **Real-time Data** | Retrieve the latest sensor data for a device. | `SELECT * FROM SENSOR_READINGS WHERE deviceId = ? ORDER BY timestamp DESC LIMIT 1;` |
| **Historical Data** | Retrieve a time-series window of data. | `SELECT * FROM SENSOR_READINGS WHERE deviceId = ? AND timestamp BETWEEN ? AND ? ORDER BY timestamp ASC;` |
| **Active Alerts** | Get all currently active critical alerts. | `SELECT * FROM ALERTS WHERE status = 'active' AND severity = 'critical';` |
| **Device Status** | Get a count of devices by their current status. | `SELECT status, COUNT(*) FROM DEVICES GROUP BY status;` |

### Caching Strategy

The system utilizes Azure Redis Cache to improve read performance and reduce database load:
- **Alert Thresholds**: Frequently accessed thresholds are cached.
- **Device Metadata**: Static device information is cached.
- **User Permissions**: User roles and access rights are cached upon login.
- **Cache Invalidation**: The cache is programmatically invalidated upon any update to the underlying data.

## 4. Data Retention Policy

To manage the high volume of time-series data, a clear retention policy is enforced:

| Table | Retention Period | Action |
| :--- | :--- | :--- |
| **SENSOR_READINGS** | 90 days | Archive to Azure Blob Storage for cold storage. |
| **ALERTS** | 1 year | Archive to Azure Blob Storage. |
| **OTA_DEPLOYMENTS** | 1 year | Archive to Azure Blob Storage. |
| **USERS, DEVICES, THRESHOLDS, VERSIONS** | Indefinite | Retained for system integrity. |
