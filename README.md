# Smart Factory IoT Dashboard

**Version:** 2.1.0  
**Author:** DruHustle  
**Repository:** [GitHub](https://github.com/DruHustle/smart-factory-iot)

## 🚀 Quick Links

- **[Live Demo](https://druhustle.github.io/smart-factory-iot/)** - View the live demo
- **[GitHub Repository](https://github.com/DruHustle/smart-factory-iot)** - View source code
- **[Issues](https://github.com/DruHustle/smart-factory-iot/issues)** - Report bugs or request features

## Project Overview

The Smart Factory IoT Dashboard is a comprehensive solution for monitoring and managing IoT devices in a manufacturing environment. This version features a modern React frontend with REST API authentication, real-time sensor data visualization, and device management capabilities.

The application is built on a modern technology stack with a React-based frontend and a Node.js backend using Express. It is designed to be scalable, maintainable, and easily extensible.

## Features

- **REST API Authentication:** Standard REST API endpoints for user authentication with JWT tokens
- **Real-time Sensor Data Visualization:** Live updates of sensor readings and factory floor conditions
- **Device Management:** Comprehensive device lifecycle management including creation, configuration, and monitoring
- **Alert System:** Configurable thresholds with automated notifications
- **Device Grouping:** Organize devices into logical groups (zones, production lines)
- **Responsive Design:** Mobile-friendly interface matching IMSOP design patterns
- **GitHub Pages Deployment:** Automatic deployment of built frontend to GitHub Pages
- **Mock Authentication:** Offline authentication support for GitHub Pages deployment

## Tech Stack

- **Frontend:** React 19, TypeScript, TailwindCSS 4, Vite
- **Backend:** Node.js, Express, TypeScript
- **Database:** MySQL with Aiven (https://aiven.io)
- **Backend Hosting:** Render (https://render.com)
- **Frontend Hosting:** GitHub Pages
- **ORM:** Drizzle ORM
- **Authentication:** REST API with JWT tokens
- **UI Components:** shadcn/ui, Radix UI

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- pnpm (recommended) or npm
- MySQL database (local development) or Aiven MySQL (production)
- Render account for backend deployment (optional)

### Deployment Options

**Development:**
- Local Node.js server with local MySQL database
- See `dev.sh` for setup instructions

**Production:**
- Backend: Render (https://render.com)
- Database: Aiven MySQL (https://aiven.io)
- Frontend: GitHub Pages (automatic)
- See `RENDER_DEPLOYMENT.md` for detailed deployment instructions

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

   ```bash
   cp .env.example .env
   ```

   Update the `.env` file with your configuration:

   ```bash
   # Database
   DATABASE_URL=mysql://root:password@localhost:3306/smart_factory_dev

   # Server
   PORT=3000
   NODE_ENV=development

   # JWT
   JWT_SECRET=your-secret-key-here

   # API
   VITE_API_URL=http://localhost:3000/api
   ```

### Running the Application

#### Development Mode

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The application will be available at `http://localhost:3000`.

#### Production Mode

```bash
# Build the application
pnpm build

# Start production server
pnpm start
```

## Authentication

### REST API Endpoints

The application uses standard REST API endpoints for authentication:

- **POST /api/auth/login** - User login
- **POST /api/auth/register** - User registration
- **POST /api/auth/logout** - User logout
- **GET /api/auth/me** - Get current user

### Demo Accounts

The following demo accounts are available for testing:

| Account | Email | Password | Role |
|---------|-------|----------|------|
| Admin | admin@dev.local | password123 | admin |
| Operator | operator@dev.local | password123 | user |
| Technician | tech@dev.local | password123 | user |

### Authentication Flow

1. User enters credentials on the login page
2. Frontend sends credentials to `/api/auth/login`
3. Backend validates credentials and returns JWT token
4. Frontend stores token in localStorage/sessionStorage
5. Subsequent API requests include token in Authorization header
6. Backend validates token and processes request

## Database Setup

### Development Database

For development, use the provided setup script:

```bash
# Make script executable
chmod +x setup-dev-db.sh

# Run setup
./setup-dev-db.sh
```

This will:
- Create the development database
- Set up tables with proper relationships
- Insert sample data (users, devices, sensors, alerts)
- Configure environment variables

### Manual Database Setup

If you prefer manual setup:

```bash
# Create database
mysql -u root -e "CREATE DATABASE smart_factory_dev;"

# Run migrations
pnpm db:push

# Seed sample data
node seed-demo-accounts.mjs
```

## Deployment

### GitHub Pages Deployment

The application automatically deploys to GitHub Pages on every push to main:

1. GitHub Actions builds the frontend
2. Built assets are deployed to `gh-pages` branch
3. Live at `https://druhustle.github.io/smart-factory-iot/`

For offline testing on GitHub Pages, the app uses mock authentication with demo accounts.

### Manual Deployment

To manually deploy to GitHub Pages:

```bash
# Build the application
pnpm build

# Deploy to gh-pages
bash deploy-pages.sh
```

## Project Structure

```
smart-factory-iot/
├── client/                 # React frontend
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable UI components
│   │   ├── contexts/      # React contexts (Auth, Theme)
│   │   ├── lib/           # Utility functions
│   │   └── index.css      # Global styles
│   └── public/            # Static assets
├── server/                 # Express backend
│   ├── routers.ts         # API routes
│   ├── db.ts              # Database functions
│   └── _core/             # Core server setup
├── drizzle/               # Database schema and migrations
├── shared/                # Shared types and constants
└── package.json
```

## API Documentation

### Authentication Endpoints

#### Login

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@dev.local",
  "password": "password123"
}

Response:
{
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "email": "admin@dev.local",
    "name": "Admin User",
    "role": "admin"
  }
}
```

#### Get Current User

```bash
GET /api/auth/me
Authorization: Bearer <token>

Response:
{
  "id": 1,
  "email": "admin@dev.local",
  "name": "Admin User",
  "role": "admin"
}
```

#### Logout

```bash
POST /api/auth/logout
Authorization: Bearer <token>

Response:
{
  "success": true
}
```

## Development Workflow

```bash
# 1. Install dependencies
pnpm install

# 2. Set up development database
./setup-dev-db.sh

# 3. Start development server
pnpm dev

# 4. Open browser
# http://localhost:3000

# 5. Make changes (hot-reload enabled)

# 6. Build for production
pnpm build

# 7. Deploy
bash deploy-pages.sh
```

## Troubleshooting

### Login not working

1. Check that the backend server is running: `pnpm dev`
2. Verify database connection in `.env`
3. Check browser console for error messages
4. Ensure demo accounts exist in database

### Database connection errors

```bash
# Check MySQL is running
sudo service mysql status

# Start MySQL if needed
sudo service mysql start

# Verify connection string
cat .env | grep DATABASE_URL
```

### Port already in use

```bash
# Change port in .env
echo "PORT=3001" >> .env

# Or kill process using port 3000
lsof -i :3000
kill -9 <PID>
```

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues, questions, or suggestions, please open an issue on [GitHub Issues](https://github.com/DruHustle/smart-factory-iot/issues).

## Changelog

### Version 2.1.0
- Replaced tRPC with REST API authentication
- Updated login page to match IMSOP design
- Added mock authentication for GitHub Pages
- Improved error handling and logging
- Updated documentation

### Version 2.0.0
- Initial release with tRPC authentication
- Real-time sensor data streaming
- Device management system
- Alert notifications

---

**Last Updated:** January 2026  
**Maintained by:** DruHustle
