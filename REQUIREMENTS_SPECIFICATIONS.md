# Smart Factory IoT Dashboard - Requirements Specifications

**Version:** 2.0.0
**Author:** Andrew Gotora
**Email:** [andrewgotora@yahoo.com](mailto:andrewgotora@yahoo.com)

## 1. Introduction

### 1.1. Purpose

This document specifies the functional and non-functional requirements for the Smart Factory IoT Dashboard, version 2.0.0. It serves as a foundational agreement between stakeholders on what the system will do and how it will perform.

### 1.2. Scope

These requirements apply to the entire Smart Factory IoT Dashboard application, including the frontend, backend, and all associated services. The focus is on the new features introduced in version 2.0.0, as well as the core functionalities of the system.

## 2. Functional Requirements

### 2.1. Real-time Data Streaming

-   **REQ-FUNC-001:** The system **shall** provide real-time updates of sensor data to the frontend dashboard using WebSockets.
-   **REQ-FUNC-002:** The frontend **shall** automatically update charts and data displays with new sensor readings without requiring a manual page refresh.
-   **REQ-FUNC-003:** The system **shall** broadcast real-time alerts to connected clients when critical events occur.

### 2.2. Automated Notifications

-   **REQ-FUNC-004:** The system **shall** allow administrators to configure notification rules based on sensor value thresholds.
-   **REQ-FUNC-005:** The system **shall** automatically send notifications via email when a configured threshold is exceeded.
-   **REQ-FUNC-006:** The system **shall** automatically send notifications via SMS when a configured threshold is exceeded.
-   **REQ-FUNC-007:** The notification system **shall** be extensible to support other notification channels (e.g., push notifications).

### 2.3. Device Grouping

-   **REQ-FUNC-008:** Users **shall** be able to create, view, update, and delete device groups.
-   **REQ-FUNC-009:** Device groups **can** be defined by zone, production line, or other custom criteria.
-   **REQ-FUNC-010:** The system **shall** support batch operations on all devices within a group (e.g., restarting, updating firmware).
-   **REQ-FUNC-011:** The system **shall** provide aggregated analytics for device groups, such as average sensor readings and total alerts.

### 2.4. User Management

-   **REQ-FUNC-012:** The system **shall** provide a secure user authentication mechanism.
-   **REQ-FUNC-013:** The system **shall** support at least two user roles: `admin` and `user`.
-   **REQ-FUNC-014:** `Admin` users **shall** have full access to all system functionalities, including user and device management.
-   **REQ-FUNC-015:** `User` roles **shall** have restricted access, primarily for viewing data and acknowledging alerts.

### 2.5. Device Management

-   **REQ-FUNC-016:** The system **shall** allow `admin` users to add, remove, and configure IoT devices.
-   **REQ-FUNC-017:** The system **shall** display the status (e.g., online, offline, error) of each device.

## 3. Non-Functional Requirements

### 3.1. Performance

-   **REQ-NON-001:** The system **shall** display real-time sensor data with a latency of less than 2 seconds under normal network conditions.
-   **REQ-NON-002:** API response times for typical queries **shall** be under 500 milliseconds.
-   **REQ-NON-003:** The dashboard **shall** load in under 3 seconds on a standard broadband connection.

### 3.2. Scalability

-   **REQ-NON-004:** The system **shall** be able to support up to 1,000 concurrent WebSocket connections.
-   **REQ-NON-005:** The architecture **shall** allow for horizontal scaling of the backend services to handle increased load.

### 3.3. Reliability

-   **REQ-NON-006:** The system **shall** have an uptime of at least 99.9%.
-   **REQ-NON-007:** The system **shall** include mechanisms for graceful degradation in case of partial service failure.

### 3.4. Security

-   **REQ-NON-008:** All communication between the client and server **shall** be encrypted using TLS.
-   **REQ-NON-009:** The system **shall** be protected against common web vulnerabilities, such as Cross-Site Scripting (XSS) and SQL Injection.
-   **REQ-NON-010:** Access to all API endpoints **shall** be properly authenticated and authorized.

### 3.5. Maintainability

-   **REQ-NON-011:** The codebase **shall** adhere to SOLID principles to ensure it is modular, understandable, and easy to maintain.
-   **REQ-NON-012:** All third-party branding, logos, and proprietary components **shall** be removed from the codebase.
-   **REQ-NON-013:** The application **shall** be free of compilation errors and critical runtime bugs upon delivery.

### 3.6. Documentation

-   **REQ-NON-014:** The project **shall** include comprehensive documentation, including a README, a Design Document, and this Requirements Specification.
-   **REQ-NON-015:** The project **shall** include API documentation detailing all available endpoints, request/response formats, and authentication requirements.
