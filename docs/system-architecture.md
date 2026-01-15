# Smart Factory IoT - System Architecture

This document describes the multi-layered architecture of the Smart Factory IoT platform, designed for scalability, real-time performance, and robust data handling. The system follows a microservices-inspired approach, with clear separation of concerns between the presentation, application, and data layers.

## 1. Architectural Overview

The architecture is divided into four main layers: **Device Layer**, **Ingestion Layer**, **Application Layer**, and **Presentation Layer**.

```mermaid
graph TD
    subgraph Presentation Layer
        A[React Dashboard] --> B(tRPC API Gateway)
    end
    
    subgraph Application Layer
        B --> C{tRPC Routers & Services}
        C --> D[Notification Service]
        C --> E[Device Grouping Service]
        C --> F[OTA Service]
        C --> G[Analytics Engine]
    end
    
    subgraph Data Layer
        C --> H[MySQL Database (Drizzle ORM)]
        D --> I[External Notification Providers]
        C --> J[Redis Cache]
    end
    
    subgraph Ingestion Layer
        K[IoT Device] --> L(Data Ingestion Endpoint)
        L --> C
    end
    
    style A fill:#bbf,stroke:#333,stroke-width:2px
    style K fill:#f99,stroke:#333,stroke-width:2px
    style H fill:#9f9,stroke:#333,stroke-width:2px
    style J fill:#99f,stroke:#333,stroke-width:2px
    style L fill:#fcc,stroke:#333,stroke-width:2px
```

## 2. Layer Details

### 2.1. Presentation Layer (Frontend)

- **Technology**: **React** with **Vite** and **Tailwind CSS**.
- **Purpose**: Provides the user interface for monitoring, management, and analytics.
- **Communication**: Interacts with the Application Layer exclusively through the **tRPC API Gateway**.
- **Real-time**: Uses **WebSockets** (managed by the Application Layer) for immediate updates on sensor readings and alerts.

### 2.2. Application Layer (Backend)

- **Technology**: **Node.js** with **Express** and **tRPC**.
- **Core Components**:
    - **tRPC API Gateway**: The single entry point for all client-side requests, providing end-to-end type safety.
    - **Services**: Modular, domain-specific services implementing business logic (e.g., `NotificationService`, `DeviceGroupingService`). This adheres to the **Single Responsibility Principle (SRP)**.
    - **SDK/Auth**: Handles user authentication, session management (JWT), and authorization checks.

### 2.3. Data Layer

- **Primary Database**: **MySQL** (simulated with Drizzle ORM in the current setup).
    - **Purpose**: Persistent storage for device metadata, user accounts, alert configurations, and historical data.
    - **ORM**: **Drizzle ORM** is used for type-safe database interactions.
- **Caching**: **Redis Cache** (simulated) is used for:
    - Caching frequently accessed, static data (e.g., device metadata, alert thresholds).
    - Session storage and rate limiting.

### 2.4. Ingestion Layer

- **Data Source**: IoT Devices (sensors, actuators, controllers, gateways).
- **Protocol**: Devices communicate via a custom **HTTP/MQTT** endpoint (simulated by the `readings.create` tRPC procedure).
- **Flow**: Device telemetry is sent to the ingestion endpoint, which then passes the data to the Application Layer for processing, storage, and real-time alerting.

## 3. Key Architectural Decisions

| Decision | Rationale | SOLID Principle |
| :--- | :--- | :--- |
| **tRPC over REST** | Provides end-to-end type safety, eliminating a class of runtime errors and improving developer experience. | **ISP** (Interface Segregation) |
| **Service-Oriented Design** | Decouples business logic into small, testable units (`notifications.ts`, `deviceGrouping.ts`). | **SRP** (Single Responsibility) |
| **Drizzle ORM Abstraction** | The application depends on the ORM abstraction, not the specific database driver. | **DIP** (Dependency Inversion) |
| **Notification Provider Pattern** | Allows easy addition of new notification channels (e.g., Slack, PagerDuty) without modifying core logic. | **OCP** (Open/Closed) |
| **Centralized Authentication** | All protected routes use a single authentication middleware, ensuring consistent security policy enforcement. | **SRP** (Single Responsibility) |

## 4. Deployment and Infrastructure

The system is designed for containerized deployment, typically using **Docker** and **Kubernetes (AKS)** for orchestration.

| Component | Technology | Deployment Strategy |
| :--- | :--- | :--- |
| **Backend API** | Node.js/Express/tRPC | Multiple Docker containers behind a load balancer. |
| **Frontend Dashboard** | React/Vite | Static file serving via a CDN or dedicated web server. |
| **Database** | MySQL (Aiven) | Managed cloud service for high availability and scalability. |
| **Cache** | Redis | Managed cloud service for low-latency caching. |
| **Monitoring** | Prometheus/Grafana | Used for collecting metrics and visualizing system health. |
