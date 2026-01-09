# Smart Factory IoT Dashboard - API Documentation

**Version:** 2.0.0
**Author:** Andrew Gotora
**Email:** [andrewgotora@yahoo.com](mailto:andrewgotora@yahoo.com)

## 1. Introduction

This document provides a comprehensive reference for the API of the Smart Factory IoT Dashboard. The API is built using tRPC, which allows for fully typesafe communication between the client and server.

All API endpoints are accessible under the `/api/trpc` path.

## 2. Authentication

Most endpoints require authentication. The `auth.me` endpoint can be used to check the current user's authentication status. Protected procedures will return a `401 Unauthorized` error if the user is not authenticated.

## 3. API Endpoints

### 3.1. `auth`

-   **`auth.me`**: `query` - Retrieves the current user's information.
-   **`auth.logout`**: `mutation` - Logs out the current user.

### 3.2. `devices`

-   **`devices.list`**: `query` - Lists all devices, with optional filtering by status, type, and zone.
-   **`devices.getById`**: `query` - Retrieves a single device by its numeric ID.
-   **`devices.getByDeviceId`**: `query` - Retrieves a single device by its string device ID.
-   **`devices.create`**: `mutation` - Creates a new device.
-   **`devices.update`**: `mutation` - Updates an existing device.
-   **`devices.delete`**: `mutation` - Deletes a device.
-   **`devices.getStats`**: `query` - Retrieves statistics about the devices (e.g., online/offline counts).

### 3.3. `readings`

-   **`readings.getForDevice`**: `query` - Retrieves sensor readings for a specific device within a time range.
-   **`readings.getLatest`**: `query` - Retrieves the latest sensor reading for a device.
-   **`readings.getAggregated`**: `query` - Retrieves aggregated sensor readings for multiple devices over a time range.
-   **`readings.create`**: `mutation` - Creates a new sensor reading.

### 3.4. `thresholds`

-   **`thresholds.getForDevice`**: `query` - Retrieves the alert thresholds for a specific device.
-   **`thresholds.create`**: `mutation` - Creates a new alert threshold.
-   **`thresholds.update`**: `mutation` - Updates an existing alert threshold.
-   **`thresholds.delete`**: `mutation` - Deletes an alert threshold.
-   **`thresholds.upsertForDevice`**: `mutation` - Creates or updates multiple alert thresholds for a device.

### 3.5. `alerts`

-   **`alerts.list`**: `query` - Lists all alerts, with optional filtering.
-   **`alerts.create`**: `mutation` - Creates a new alert.
-   **`alerts.updateStatus`**: `mutation` - Updates the status of an alert.
-   **`alerts.getStats`**: `query` - Retrieves statistics about alerts.

### 3.6. `firmware`

-   **`firmware.list`**: `query` - Lists all available firmware versions.
-   **`firmware.getById`**: `query` - Retrieves a single firmware version by ID.
-   **`firmware.create`**: `mutation` - Creates a new firmware version.

### 3.7. `ota`

-   **`ota.list`**: `query` - Lists all OTA deployments.
-   **`ota.getById`**: `query` - Retrieves a single OTA deployment by ID.
-   **`ota.create`**: `mutation` - Creates a new OTA deployment.
-   **`ota.getDeploymentStatus`**: `query` - Retrieves the status of an OTA deployment.

### 3.8. `reports`

-   **`reports.generateDeviceReport`**: `query` - Generates a PDF report for a single device.
-   **`reports.generateAnalyticsReport`**: `query` - Generates a PDF report with analytics.
-   **`reports.generateAlertHistoryReport`**: `query` - Generates a PDF report of alert history.

### 3.9. `notifications`

-   **`notifications.registerConfig`**: `mutation` - Registers a new notification configuration.
-   **`notifications.getConfigs`**: `query` - Retrieves all notification configurations.
-   **`notifications.updateConfig`**: `mutation` - Updates a notification configuration.
-   **`notifications.deleteConfig`**: `mutation` - Deletes a notification configuration.
-   **`notifications.getQueueSize`**: `query` - Retrieves the current size of the notification queue.

### 3.10. `groups`

-   **`groups.create`**: `mutation` - Creates a new device group.
-   **`groups.list`**: `query` - Lists all device groups.
-   **`groups.getById`**: `query` - Retrieves a single device group by ID.
-   **`groups.getByType`**: `query` - Retrieves device groups by type.
-   **`groups.getForDevice`**: `query` - Retrieves all groups that a device belongs to.
-   **`groups.update`**: `mutation` - Updates a device group.
-   **`groups.delete`**: `mutation` - Deletes a device group.
-   **`groups.addDevices`**: `mutation` - Adds devices to a group.
-   **`groups.removeDevices`**: `mutation` - Removes devices from a group.
-   **`groups.createBatchOperation`**: `mutation` - Creates a new batch operation for a group.
-   **`groups.getBatchOperation`**: `query` - Retrieves a single batch operation by ID.
-   **`groups.getBatchOperations`**: `query` - Retrieves all batch operations for a group.

## 4. WebSocket API

The WebSocket API provides real-time updates to clients. To connect, establish a WebSocket connection to `/ws`.

### 4.1. Subscribing to Channels

To receive messages, clients must subscribe to channels. This is done by sending a message with the following format:

```json
{
  "type": "subscribe",
  "channels": ["channel1", "channel2"]
}
```

Available channels include:

-   `device:<deviceId>:sensor` - For real-time sensor data.
-   `device:<deviceId>:alert` - For alerts related to a specific device.
-   `alerts:all` - For all alerts.
-   `device:<deviceId>:status` - For device status updates.

### 4.2. Message Format

All messages from the server have the following format:

```json
{
  "type": "<message_type>",
  "data": { ... },
  "timestamp": 1678886400000
}
```
