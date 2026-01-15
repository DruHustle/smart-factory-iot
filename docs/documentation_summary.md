# Smart Factory IoT Documentation Summary

## System Architecture
- **Frontend**: React (Vite) dashboard, real-time updates via SignalR/WebSockets.
- **Backend**: .NET Core Web API, DDD (Domain-Driven Design) architecture.
- **IoT Layer**: Azure IoT Hub for device connectivity (MQTT/AMQP).
- **Data Layer**: Aiven MySQL for persistent storage, Azure Redis Cache for performance.
- **Service Layer**: Azure Logic Apps for notifications, Azure Functions for async tasks.
- **Infrastructure**: Docker, Kubernetes (AKS), Portainer.

## Database Schema
- **Users**: Authentication via Microsoft Entra ID.
- **Devices**: IoT device registration and metadata.
- **Sensor Readings**: Time-series data (temp, humidity, pressure, vibration, power, rpm).
- **Alerts**: Triggered by threshold violations.
- **Alert Thresholds**: Configuration for alert triggers.
- **OTA Versions & Deployments**: Firmware update management.

## API Flows
- **Authentication**: OAuth 2.0 with Microsoft Entra ID.
- **Real-time Monitoring**: Telemetry -> IoT Hub -> .NET Backend -> SignalR -> Dashboard.
- **Alert Management**: Threshold check -> Alert creation -> Logic Apps -> User notification.
- **Device Management**: CRUD operations with Redis caching.
- **OTA Updates**: Firmware deployment via IoT Hub direct methods.
- **Analytics**: OEE calculations and reporting.
