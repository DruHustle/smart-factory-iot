# Smart Factory IoT Dashboard

**Version:** 2.0.0  
**Author:** Andrew Gotora  
**Email:** [andrewgotora@yahoo.com](mailto:andrewgotora@yahoo.com)  

## 🚀 Quick Links

- **[Live Demo](https://druhustle.github.io/smart-factory-iot/coming-soon.html)** - View the live demo (coming soon)
- **[GitHub Repository](https://github.com/DruHustle/smart-factory-iot)** - View source code
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
- A local OAuth server (see instructions below)

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/DruHustle/smart-factory-iot.git
    cd smart-factory-iot
    ```

2.  **Install dependencies:**

    ```bash
    pnpm install
    ```

3.  **Configure environment variables:**

    Copy the example environment file and update it with your configuration:

    ```bash
    cp .env.example .env
    ```

    See the `.env.example` file for a complete list of variables and their descriptions.

### OAuth Server Setup

This application requires an OAuth 2.0 server for user authentication. For local development, you can use a mock OAuth server.

1.  **Start the OAuth Server:**

    A mock OAuth server is included in the repository. To start it, run:

    ```bash
    # In a separate terminal
    pnpm run oauth:server
    ```

    This will start a mock server on `http://localhost:8080`.

2.  **Configure OAuth in `.env`:**

    Ensure your `.env` file has the correct OAuth server URL:

    ```
    OAUTH_SERVER_URL="http://localhost:8080"
    VITE_OAUTH_PORTAL_URL="http://localhost:8080"
    ```

### Google Maps Configuration

For detailed instructions on configuring Google Maps, please see the [Google Maps Setup Guide](./GOOGLE_MAPS_SETUP.md).

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

## Deployment

### GitHub Pages

For a simple static deployment, you can use the included `coming-soon.html` page.

1.  **Push to `gh-pages` branch:**

    ```bash
    git checkout -b gh-pages
    git add client/public/coming-soon.html
    git commit -m "Add coming soon page"
    git push origin gh-pages
    ```

2.  **Configure GitHub Pages:**

    In your repository settings, configure GitHub Pages to deploy from the `gh-pages` branch.

### Production Deployment

For a full production deployment, you will need:

- A production-ready MySQL database
- A production OAuth server
- A server to host the Node.js backend
- A CDN to serve the frontend assets

## SOLID Principles

This project has been refactored to adhere to SOLID principles:

- **Single Responsibility Principle:** Each module and component has a single, well-defined responsibility.
- **Open/Closed Principle:** The application is designed to be extensible without modifying existing code.
- **Liskov Substitution Principle:** All components are designed to be interchangeable with their base types.
- **Interface Segregation Principle:** Interfaces are small and focused, providing only the necessary functionality.
- **Dependency Inversion Principle:** High-level modules do not depend on low-level modules; both depend on abstractions.

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
