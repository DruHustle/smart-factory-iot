# Smart Factory IoT Dashboard

**Version:** 2.2.0  
**Author:** DruHustle  
**Repository:** [GitHub](https://github.com/DruHustle/smart-factory-iot)

## 🚀 Quick Links

- **[Live Dashboard](https://druhustle.github.io/smart-factory-iot/)** - View the live production dashboard
- **[GitHub Repository](https://github.com/DruHustle/smart-factory-iot)** - View source code
- **[Issues](https://github.com/DruHustle/smart-factory-iot/issues)** - Report bugs or request features

## Project Overview

The Smart Factory IoT Dashboard is a comprehensive solution for monitoring and managing IoT devices in a manufacturing environment. This version features a modern React frontend, a Node.js backend with tRPC and REST API support, and a cloud-hosted MySQL database.

The application is designed for high availability and scalability, utilizing a distributed architecture across multiple cloud providers.

## 🏗️ Architecture

The application follows a modern distributed architecture:

- **Frontend:** Hosted on **GitHub Pages** as a Single Page Application (SPA).
- **Backend:** Hosted on **Render** as a Node.js/Express service.
- **Database:** Hosted on **Aiven** as a managed MySQL instance.
- **Authentication:** JWT-based authentication with session persistence in localStorage.

## Features

- **Hybrid Authentication:** Real backend authentication with fallback to mock auth for demo environments.
- **Real-time Monitoring:** Live updates of sensor readings and factory floor conditions.
- **Device Management:** Comprehensive device lifecycle management including creation, configuration, and monitoring.
- **Alert System:** Configurable thresholds with automated notifications.
- **SPA Routing:** Custom 404 handling for seamless client-side routing on GitHub Pages.
- **Responsive Design:** Mobile-friendly interface matching IMSOP design patterns.

## Tech Stack

- **Frontend:** React 19, TypeScript, TailwindCSS 4, Vite, Wouter
- **Backend:** Node.js, Express, tRPC, TypeScript
- **Database:** MySQL with **Aiven** (https://aiven.io)
- **Backend Hosting:** **Render** (https://render.com)
- **Frontend Hosting:** **GitHub Pages**
- **ORM:** Drizzle ORM
- **Authentication:** REST API with JWT tokens

## Getting Started

### Prerequisites

- Node.js (v20 or later)
- pnpm (v10 or later)
- MySQL database (Aiven MySQL recommended for production)

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/DruHustle/smart-factory-iot.git
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

   For production, create a `.env.production` file:

   ```bash
   VITE_API_URL=https://smart-factory-iot.onrender.com/api
   ```

### Running the Application

#### Development Mode

```bash
pnpm dev
```

The application will be available at `http://localhost:3000`.

#### Production Build

```bash
pnpm build
```

This generates the built assets in `dist/public`, ready for deployment to GitHub Pages.

## Deployment

### GitHub Pages (Frontend)

The frontend is automatically deployed to GitHub Pages via GitHub Actions on every push to `main`.

**Key Configuration:**
- `base: '/smart-factory-iot/'` in `vite.config.ts`
- `404.html` in `client/public` for SPA routing support
- Automatic redirect handling in `main.tsx`

### Render (Backend)

The backend is hosted on Render. Ensure the following environment variables are set in the Render dashboard:
- `DATABASE_URL` (Aiven MySQL connection string)
- `JWT_SECRET`
- `NODE_ENV=production`

## Authentication

### Demo Accounts

The following demo accounts are available for testing:

| Account | Email | Password | Role |
|---------|-------|----------|------|
| Admin | admin@dev.local | password123 | admin |
| Operator | operator@dev.local | password123 | user |
| Technician | tech@dev.local | password123 | user |
| Demo | demo@dev.local | password123 | user |

## Project Structure

```
smart-factory-iot/
├── client/                 # React frontend
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable UI components
│   │   ├── contexts/      # React contexts (Auth, Theme)
│   │   ├── lib/           # Utility functions (tRPC, Auth)
│   │   └── main.tsx       # App entry point with SPA routing
│   └── public/            # Static assets & 404.html
├── server/                 # Express backend
│   ├── routers.ts         # tRPC/API routes
│   ├── db.ts              # Database connection
│   └── _core/             # Core server setup
├── drizzle/               # Database schema and migrations
├── shared/                # Shared types and demo accounts
└── package.json
```

## License

This project is licensed under the MIT License.

## Support

For issues, questions, or suggestions, please open an issue on [GitHub Issues](https://github.com/DruHustle/smart-factory-iot/issues).

## Changelog

### Version 2.2.0
- Configured distributed architecture (GitHub Pages + Render + Aiven)
- Added SPA routing support for GitHub Pages (404.html redirect)
- Fixed authentication persistence and dashboard rendering issues
- Updated environment configuration for production deployment
- Fixed "Buffer" variable errors in browser environment

### Version 2.1.0
- Replaced tRPC with REST API authentication
- Updated login page to match IMSOP design
- Added mock authentication for GitHub Pages

---

**Last Updated:** January 2026  
**Maintained by:** DruHustle
