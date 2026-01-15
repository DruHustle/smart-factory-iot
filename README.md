# Smart Factory IoT Dashboard

**Version:** 2.3.0 (Optimized)  
**Author:** DruHustle  
**Repository:** [GitHub](https://github.com/DruHustle/smart-factory-iot)

## 🚀 Quick Links

- **[GitHub Repository](https://github.com/DruHustle/smart-factory-iot)** - View source code
- **[Issues](https://github.com/DruHustle/smart-factory-iot/issues)** - Report bugs or request features
- **[System Architecture](docs/system-architecture.md)** - Detailed architectural design
- **[API Flows & Sequences](docs/api-flows.md)** - API communication and data flow diagrams
- **[Database Schema](docs/database-schema.md)** - Entity Relationship Diagram and table specifications
- **[SOLID Principles Implementation](SOLID_PRINCIPLES.md)** - Documentation on code quality and design principles

## Project Overview

The Smart Factory IoT Dashboard is a comprehensive solution for monitoring and managing IoT devices in a manufacturing environment. This version has undergone a significant **code review and optimization** to enhance performance, robustness, and security while strictly adhering to **SOLID principles**.

The application features a modern React frontend, a Node.js backend with tRPC, and a cloud-hosted MySQL database.

## ✨ Key Optimizations in v2.3.0

This release focuses on code quality and system reliability:

- **Code Reduction & Simplification**: Refactored core server files (`db.ts`, `routers.ts`) to be more concise and maintainable, reducing overall lines of code by approximately 40% in key areas.
- **SOLID Compliance**: Enhanced adherence to SOLID principles, particularly SRP (Single Responsibility) and DIP (Dependency Inversion), by modularizing the database layer and API routes.
- **Robustness & Security**:
    - Implemented **Zod validation** on all tRPC procedures for strict input type checking.
    - Centralized database connection and error handling logic for consistency.
    - Improved authentication flow with secure password hashing and JWT session management.
- **Documentation**: Updated all technical documentation (`system-architecture.md`, `api-flows.md`, `database-schema.md`) to reflect the current implementation and architectural decisions.

## 🏗️ Architecture

The application follows a modern distributed architecture:

- **Frontend:** React, Vite, TailwindCSS (Hosted on GitHub Pages)
- **Backend:** Node.js, Express, tRPC (Hosted on Render)
- **Database:** MySQL with **Drizzle ORM** (Hosted on Aiven)
- **Real-time:** WebSocket for live data and alerts.

## Features

- **Hybrid Authentication:** Secure authentication with JWT tokens.
- **Real-time Monitoring:** Live updates of sensor readings and factory floor conditions.
- **Device Management:** Comprehensive device lifecycle management.
- **Alert System:** Configurable thresholds with automated notifications.
- **Device Grouping**: Logical grouping of devices for batch operations and aggregated analytics.
- **OTA Updates**: Over-The-Air firmware deployment tracking.

## Tech Stack

- **Frontend:** React 19, TypeScript, TailwindCSS 4, Vite
- **Backend:** Node.js, Express, tRPC, TypeScript
- **Database:** MySQL with **Aiven**
- **ORM:** Drizzle ORM
- **Authentication:** JWT tokens via secure cookies

## Getting Started

### Prerequisites

- Node.js (v20 or later)
- pnpm (v10 or later)
- MySQL database

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/DruHustle/smart-factory-iot
   cd smart-factory-iot
   ```

2. **Install dependencies:**

   ```bash
   pnpm install
   ```

3. **Configure environment variables:**

   Create a `.env` file for local development:

   ```bash
   # Database (Aiven MySQL)
   DATABASE_URL=mysql://user:password@host:port/dbname?ssl={"rejectUnauthorized":true}

   # Server
   PORT=3000
   NODE_ENV=development

   # JWT
   JWT_SECRET=your-secret-key-here

   # API (Points to local server in dev)
   VITE_API_URL=http://localhost:3000/api
   ```

### Running the Application

#### Development Mode

```bash
pnpm dev
```

The application will be available at `http://localhost:3000`.

## Project Structure

```
smart-factory-iot/
├── client/                 # React frontend
├── server/                 # Express backend
│   ├── routers.ts         # tRPC/API routes
│   ├── db.ts              # Database connection and operations
│   └── _core/             # Core server setup (Auth, Context, SDK)
├── drizzle/               # Database schema and migrations
├── shared/                # Shared types and constants
└── docs/                  # Technical documentation
```

## License

This project is licensed under the MIT License.

---

**Last Updated:** January 2026  
**Maintained by:** DruHustle
