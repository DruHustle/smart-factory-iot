# Smart Factory IoT Dashboard

**Version:** 2.0.0  
**Author:** Andrew Gotora  
**Email:** [andrewgotora@yahoo.com](mailto:andrewgotora@yahoo.com)  
**Live Dashboard:** [https://druhustle.github.io/smart-factory-iot/](https://druhustle.github.io/smart-factory-iot/)

## 🚀 Quick Links

- **[Live Dashboard](https://druhustle.github.io/smart-factory-iot/)** - Access the deployed application
- **[GitHub Repository](https://github.com/DruHustle/smart-factory-iot)** - View source code
- **[Documentation](https://github.com/DruHustle/smart-factory-iot/tree/main)** - Full project documentation
- **[Issues](https://github.com/DruHustle/smart-factory-iot/issues)** - Report bugs or request features

## Project Overview

The Smart Factory IoT Dashboard is a comprehensive solution for monitoring and managing IoT devices in a manufacturing environment. This enhanced version introduces real-time data streaming, automated notifications, and advanced device organization capabilities to provide a more dynamic and responsive system.

The application is built on a modern technology stack, featuring a React-based frontend and a Node.js backend with Express and tRPC. It is designed to be scalable, maintainable, and easily extensible to accommodate future requirements.

## Features

- **Real-time Sensor Data Streaming:** Utilizes WebSockets to provide live updates of sensor readings, enabling immediate visualization of factory floor conditions without the need for manual refreshes.
- **Automated Email/SMS Notifications:** A configurable notification system that automatically sends alerts via email or SMS when predefined sensor thresholds are exceeded, allowing for proactive issue resolution.
- **Device Grouping and Management:** Devices can be organized into logical groups such as zones or production lines, enabling batch operations and aggregated analytics for more efficient management.
- **SOLID Design Principles:** The codebase has been refactored to adhere to SOLID principles, promoting a more modular, understandable, and maintainable architecture.
- **Comprehensive Device Management:** A full suite of features for managing the entire lifecycle of IoT devices, including creation, configuration, and monitoring.
- **Extensible and Scalable:** The modular architecture allows for easy integration of new features and scales to support a growing number of devices.

## Tech Stack

- **Frontend:** React, TypeScript, TailwindCSS, Vite
- **Backend:** Node.js, Express, tRPC, TypeScript
- **Database:** MySQL (or compatible)
- **Real-time Communication:** WebSockets (ws)
- **ORM:** Drizzle ORM

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- pnpm (recommended) or npm
- A running MySQL database instance

### Installation

1.  **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd smart-factory-iot
    ```

2.  **Install dependencies:**

    ```bash
    pnpm install
    ```

3.  **Configure environment variables:**

    Create a `.env` file in the root of the project and add the following:

    ```
    DATABASE_URL="mysql://user:password@host:port/database"
    PORT=3000
    # Optional: For notification services
    EMAIL_API_KEY="your-email-api-key"
    SMS_API_KEY="your-sms-api-key"
    ```

### Running the Application

-   **Development Mode:**

    ```bash
    pnpm dev
    ```

    This will start the application in development mode with hot-reloading.

-   **Production Mode:**

    ```bash
    pnpm build
    pnpm start
    ```

## Project Structure

```
/
├── client/         # Frontend React application
├── server/         # Backend Node.js application
│   ├── _core/      # Core server functionalities
│   ├── drizzle/    # Database schema and migrations
│   ├── websocket.ts# WebSocket service
│   ├── notifications.ts# Notification service
│   └── deviceGrouping.ts# Device grouping service
├── shared/         # Shared code between client and server
└── README.md       # This file
```
