# Smart Factory IoT Dashboard - Implementation Guide

**Version:** 2.0.0
**Author:** Andrew Gotora
**Email:** [andrewgotora@yahoo.com](mailto:andrewgotora@yahoo.com)
**Last Updated**: January 9, 2026

## 1. Overview

This guide provides step-by-step instructions for implementing and deploying the Smart Factory IoT Dashboard version 2.0.0. It covers the new features introduced in this version and best practices for integration.

## 2. New Features Implementation

### 2.1. Real-time WebSocket Updates

The WebSocket service has been implemented in `server/websocket.ts`. To use it:

1. **Initialize the WebSocket Server**: The server is automatically initialized in `server/_core/index.ts` when the application starts.

2. **Subscribe to Channels**: On the frontend, establish a WebSocket connection and subscribe to relevant channels:

```javascript
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'subscribe',
    channels: ['device:1:sensor', 'alerts:all']
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};
```

3. **Broadcast Events**: On the backend, use the WebSocket manager to broadcast events:

```typescript
import { wsManager } from '../websocket';

wsManager.broadcastSensorData(deviceId, {
  temperature: 25.5,
  humidity: 60,
  timestamp: Date.now()
});
```

### 2.2. Email/SMS Notifications

The notification service is implemented in `server/notifications.ts`. To configure notifications:

1. **Register a Notification Configuration**: Use the API endpoint `notifications.registerConfig`:

```typescript
await trpc.notifications.registerConfig.mutate({
  configId: 'alert-email-1',
  enabled: true,
  type: 'email',
  recipient: 'admin@example.com',
  severityFilter: ['critical', 'warning'],
  deviceFilter: [1, 2, 3]
});
```

2. **Send Notifications**: When a threshold is exceeded, the notification service automatically sends alerts:

```typescript
import { notificationService, NotificationSeverity } from '../notifications';

await notificationService.sendAlertNotification(
  deviceId,
  alertId,
  NotificationSeverity.CRITICAL,
  'Temperature exceeded maximum threshold',
  'Critical Alert'
);
```

3. **Configure Email/SMS Providers**: Set environment variables for your email and SMS providers:

```
EMAIL_API_KEY=your-sendgrid-api-key
SMS_API_KEY=your-twilio-api-key
```

### 2.3. Device Grouping

The device grouping service is implemented in `server/deviceGrouping.ts`. To use it:

1. **Create a Device Group**: Use the API endpoint `groups.create`:

```typescript
const group = await trpc.groups.create.mutate({
  name: 'Production Line A',
  type: 'production_line',
  deviceIds: [1, 2, 3, 4, 5],
  description: 'Devices on production line A',
  metadata: { location: 'Building 1' }
});
```

2. **Perform Batch Operations**: Create a batch operation for all devices in a group:

```typescript
const operation = await trpc.groups.createBatchOperation.mutate({
  groupId: group.id,
  operation: 'update_status',
  parameters: { status: 'maintenance' }
});
```

3. **Get Group Analytics**: Calculate aggregated analytics for a group:

```typescript
const analytics = deviceGroupingService.calculateGroupAnalytics(groupId, deviceStats);
console.log(`Average temperature: ${analytics.averageTemperature}`);
```

## 3. Database Configuration

1. **Set the DATABASE_URL environment variable**:

```
DATABASE_URL="mysql://user:password@localhost:3306/smart_factory_iot"
```

2. **Run database migrations**:

```bash
pnpm db:push
```

## 4. Running the Application

### 4.1. Development Mode

```bash
pnpm install
pnpm dev
```

The application will start on `http://localhost:3000`.

### 4.2. Production Mode

```bash
pnpm install
pnpm build
pnpm start
```

## 5. API Integration Examples

### 5.1. Getting Real-time Sensor Data

```typescript
import { trpc } from '@/utils/trpc';

const readings = await trpc.readings.getForDevice.query({
  deviceId: 1,
  startTime: Date.now() - 24 * 60 * 60 * 1000,
  endTime: Date.now()
});
```

### 5.2. Creating an Alert Threshold

```typescript
await trpc.thresholds.create.mutate({
  deviceId: 1,
  metric: 'temperature',
  minValue: 0,
  maxValue: 50,
  warningMin: 5,
  warningMax: 45,
  enabled: true
});
```

### 5.3. Listing Device Groups

```typescript
const groups = await trpc.groups.list.query();
groups.forEach(group => {
  console.log(`${group.name}: ${group.deviceIds.length} devices`);
});
```

## 6. Monitoring and Maintenance

### 6.1. WebSocket Connection Health

Monitor the WebSocket server status:

```typescript
const connectedClients = wsManager.getConnectedClientsCount();
const subscribedChannels = wsManager.getSubscribedChannelsCount();
console.log(`Connected clients: ${connectedClients}`);
console.log(`Subscribed channels: ${subscribedChannels}`);
```

### 6.2. Notification Queue

Check the notification queue size:

```typescript
const queueSize = await trpc.notifications.getQueueSize.query();
console.log(`Pending notifications: ${queueSize.queueSize}`);
```

### 6.3. Batch Operation Status

Monitor batch operations:

```typescript
const operation = await trpc.groups.getBatchOperation.query({
  operationId: 'batch_123'
});
console.log(`Operation status: ${operation.status}`);
console.log(`Progress: ${operation.progress}%`);
```

## 7. Troubleshooting

### 7.1. WebSocket Connection Issues

- Ensure the WebSocket server is running on the correct port.
- Check firewall rules to allow WebSocket connections.
- Verify that the client is using the correct WebSocket URL.

### 7.2. Notification Delivery Failures

- Check that the API keys for email and SMS providers are correctly configured.
- Review the notification queue size to identify bottlenecks.
- Check the application logs for error messages.

### 7.3. Database Connection Issues

- Verify the DATABASE_URL is correct.
- Ensure the MySQL server is running and accessible.
- Check that the database user has the necessary permissions.

## 8. Performance Optimization

1. **WebSocket Optimization**: Limit the number of concurrent WebSocket connections by implementing a connection pool.
2. **Database Optimization**: Add indexes to frequently queried columns.
3. **Notification Batching**: Group notifications to reduce the number of API calls to external services.
4. **Device Group Caching**: Cache group analytics to reduce database queries.
