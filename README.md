# Smart Factory IoT Dashboard

**Version:** 2.0.0  
**Author:** Andrew Gotora  
**Email:** [andrewgotora@yahoo.com](mailto:andrewgotora@yahoo.com)  

## 🚀 Quick Links

- **[Live Demo](https://druhustle.github.io/smart-factory-iot/)** - View the live demo 
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

## Development Environment Setup

### Quick Start with Development Database

The fastest way to get started with development is to use the automated setup script:

```bash
# 1. Set up development database with sample data
./setup-dev-db.sh

# 2. Copy environment file
cp .env.dev .env

# 3. Install dependencies
pnpm install

# 4. Start development server
pnpm dev
```

The development server will be available at `http://localhost:3000`.

### Development Database Setup Script

The `setup-dev-db.sh` script automates the entire development environment setup:

```bash
# Make script executable
chmod +x setup-dev-db.sh

# Run setup
./setup-dev-db.sh
```

#### What the Script Does

1. **Checks Prerequisites**
   - Verifies MySQL installation
   - Checks MySQL service status
   - Starts MySQL if not running

2. **Creates Database**
   - Drops existing development database
   - Creates fresh `smart_factory_dev` database
   - Sets proper character set and collation

3. **Creates Schema**
   - Creates 7 tables with proper relationships
   - Sets up indexes for performance
   - Configures foreign keys

4. **Inserts Sample Data**
   - 3 development users (admin, operator, technician)
   - 12 devices across multiple zones and production lines
   - 8 sensor readings with time-series data
   - 4 alert thresholds
   - 3 alerts (open and resolved)
   - 5 firmware versions
   - 4 OTA deployments

5. **Creates Configuration**
   - Generates `.env.dev` file
   - Sets up database connection string
   - Configures development settings

6. **Verifies Setup**
   - Tests database connection
   - Displays statistics
   - Shows next steps

#### Using Custom Database Credentials

```bash
# Set custom credentials before running setup
export DB_HOST=localhost
export DB_USER=devuser
export DB_PASSWORD=devpass
export DB_NAME=smart_factory_dev

./setup-dev-db.sh
```

#### Development Sample Data

The setup script includes comprehensive sample data:

**Users:**
- Admin: admin@dev.local
- Operator: operator@dev.local
- Technician: tech@dev.local

**Devices:**
- Production Line A: 5 devices (sensors, actuators, controllers)
- Production Line B: 4 devices
- Infrastructure: 2 gateways
- Additional: 12 more devices for testing

**Sensor Data:**
- Time-series readings over the last hour
- Temperature, humidity, pressure, vibration, power, RPM
- Realistic values for manufacturing environment

**Alerts:**
- Temperature warnings
- Vibration alerts
- Device offline notifications
- Various severity levels (info, warning, critical)

### Adding More Development Data

Use the seed script to add additional random data without resetting:

```bash
# Add random data to existing database
node seed-dev-data.mjs

# Reset database and reseed with fresh data
node seed-dev-data.mjs --reset

# Show help
node seed-dev-data.mjs --help
```

#### What the Seed Script Does

- Generates 20 additional devices
- Creates 200+ sensor readings
- Generates 50+ alerts
- Adds firmware versions
- Creates OTA deployment records
- Displays final statistics

### Development Environment File

The `.env.dev` file contains development-specific configuration:

```bash
# Copy to .env for development
cp .env.dev .env
```

**Key Settings:**
- `NODE_ENV=development` - Development mode
- `DATABASE_URL=mysql://root@localhost:3306/smart_factory_dev` - Dev database
- `JWT_SECRET=dev-secret-key-change-in-production` - Development secret
- `PORT=3000` - Development server port
- `DEBUG=true` - Enable verbose logging
- `CORS_ORIGINS=*` - Allow all origins for testing

### Development Workflow

```bash
# 1. Initial setup (one time)
./setup-dev-db.sh
cp .env.dev .env
pnpm install

# 2. Start development server
pnpm dev

# 3. Open in browser
# http://localhost:3000

# 4. Make changes and see hot-reload
# Edit files in client/src/ and server/

# 5. Run tests during development
pnpm test

# 6. Type checking
pnpm check

# 7. Add more sample data
node seed-dev-data.mjs

# 8. Reset database if needed
./setup-dev-db.sh
```

### Development Database Reset

To reset the development database to initial state:

```bash
# Reset and reseed with initial data
./setup-dev-db.sh

# Or reset and add more data
node seed-dev-data.mjs --reset
```

### Troubleshooting Development Setup

**Issue: MySQL not running**
```bash
# Start MySQL service
sudo service mysql start

# Or with systemctl
sudo systemctl start mysql
```

**Issue: Permission denied**
```bash
# Make scripts executable
chmod +x setup-dev-db.sh
chmod +x seed-dev-data.mjs
```

**Issue: Database connection refused**
```bash
# Check database URL in .env
cat .env | grep DATABASE_URL

# Verify MySQL is running
mysql -u root -e "SELECT 1"
```

**Issue: Port already in use**
```bash
# Change port in .env
echo "PORT=3001" >> .env

# Or kill process using port 3000
lsof -i :3000
kill -9 <PID>
```

## Development Environment Setup

### Quick Start with Development Database

The fastest way to get started with development is to use the automated setup script:

```bash
# 1. Set up development database with sample data
./setup-dev-db.sh

# 2. Copy environment file
cp .env.dev .env

# 3. Install dependencies
pnpm install

# 4. Start development server
pnpm dev
```

The development server will be available at `http://localhost:3000`.

### Development Database Setup Script

The `setup-dev-db.sh` script automates the entire development environment setup:

```bash
# Make script executable
chmod +x setup-dev-db.sh

# Run setup
./setup-dev-db.sh
```

#### What the Script Does

1. **Checks Prerequisites**
   - Verifies MySQL installation
   - Checks MySQL service status
   - Starts MySQL if not running

2. **Creates Database**
   - Drops existing development database
   - Creates fresh `smart_factory_dev` database
   - Sets proper character set and collation

3. **Creates Schema**
   - Creates 7 tables with proper relationships
   - Sets up indexes for performance
   - Configures foreign keys

4. **Inserts Sample Data**
   - 3 development users (admin, operator, technician)
   - 12 devices across multiple zones and production lines
   - 8 sensor readings with time-series data
   - 4 alert thresholds
   - 3 alerts (open and resolved)
   - 5 firmware versions
   - 4 OTA deployments

5. **Creates Configuration**
   - Generates `.env.dev` file
   - Sets up database connection string
   - Configures development settings

6. **Verifies Setup**
   - Tests database connection
   - Displays statistics
   - Shows next steps

#### Using Custom Database Credentials

```bash
# Set custom credentials before running setup
export DB_HOST=localhost
export DB_USER=devuser
export DB_PASSWORD=devpass
export DB_NAME=smart_factory_dev

./setup-dev-db.sh
```

#### Development Sample Data

The setup script includes comprehensive sample data:

**Users:**
- Admin: admin@dev.local
- Operator: operator@dev.local
- Technician: tech@dev.local

**Devices:**
- Production Line A: 5 devices (sensors, actuators, controllers)
- Production Line B: 4 devices
- Infrastructure: 2 gateways
- Additional: 12 more devices for testing

**Sensor Data:**
- Time-series readings over the last hour
- Temperature, humidity, pressure, vibration, power, RPM
- Realistic values for manufacturing environment

**Alerts:**
- Temperature warnings
- Vibration alerts
- Device offline notifications
- Various severity levels (info, warning, critical)

### Adding More Development Data

Use the seed script to add additional random data without resetting:

```bash
# Add random data to existing database
node seed-dev-data.mjs

# Reset database and reseed with fresh data
node seed-dev-data.mjs --reset

# Show help
node seed-dev-data.mjs --help
```

#### What the Seed Script Does

- Generates 20 additional devices
- Creates 200+ sensor readings
- Generates 50+ alerts
- Adds firmware versions
- Creates OTA deployment records
- Displays final statistics

### Development Environment File

The `.env.dev` file contains development-specific configuration:

```bash
# Copy to .env for development
cp .env.dev .env
```

**Key Settings:**
- `NODE_ENV=development` - Development mode
- `DATABASE_URL=mysql://root@localhost:3306/smart_factory_dev` - Dev database
- `JWT_SECRET=dev-secret-key-change-in-production` - Development secret
- `PORT=3000` - Development server port
- `DEBUG=true` - Enable verbose logging
- `CORS_ORIGINS=*` - Allow all origins for testing

### Development Workflow

```bash
# 1. Initial setup (one time)
./setup-dev-db.sh
cp .env.dev .env
pnpm install

# 2. Start development server
pnpm dev

# 3. Open in browser
# http://localhost:3000

# 4. Make changes and see hot-reload
# Edit files in client/src/ and server/

# 5. Run tests during development
pnpm test

# 6. Type checking
pnpm check

# 7. Add more sample data
node seed-dev-data.mjs

# 8. Reset database if needed
./setup-dev-db.sh
```

### Development Database Reset

To reset the development database to initial state:

```bash
# Reset and reseed with initial data
./setup-dev-db.sh

# Or reset and add more data
node seed-dev-data.mjs --reset
```

### Troubleshooting Development Setup

**Issue: MySQL not running**
```bash
# Start MySQL service
sudo service mysql start

# Or with systemctl
sudo systemctl start mysql
```

**Issue: Permission denied**
```bash
# Make scripts executable
chmod +x setup-dev-db.sh
chmod +x seed-dev-data.mjs
```

**Issue: Database connection refused**
```bash
# Check database URL in .env
cat .env | grep DATABASE_URL

# Verify MySQL is running
mysql -u root -e "SELECT 1"
```

**Issue: Port already in use**
```bash
# Change port in .env
echo "PORT=3001" >> .env

# Or kill process using port 3000
lsof -i :3000
kill -9 <PID>
```

## Testing

### Setting Up Test Database

The application includes a test database setup script that creates a mock MySQL database with sample data.

#### Prerequisites for Testing

- MySQL server installed and running
- User with database creation privileges

#### Automatic Setup

Run the provided setup script:

```bash
# Make the script executable
chmod +x setup-test-db.sh

# Run the setup script
./setup-test-db.sh
```

The script will:
1. Check MySQL installation and service
2. Create a test database (`smart_factory_test`)
3. Create all required tables
4. Insert sample data
5. Create `.env.test` file with database connection

#### Manual Setup

If you prefer manual setup:

```bash
# Create database
mysql -u root -p << EOF
CREATE DATABASE smart_factory_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smart_factory_test;

-- Create tables (see setup-test-db.sh for full schema)
CREATE TABLE users (...);
CREATE TABLE devices (...);
-- ... other tables
EOF

# Create .env.test file
cp .env.example .env.test
# Update DATABASE_URL in .env.test
```

#### Running Tests

```bash
# Run tests with default database
pnpm test

# Run tests with test environment
cp .env.test .env
pnpm test

# Run specific test file
pnpm test server/devices.test.ts

# Run tests with coverage
pnpm test -- --coverage
```

#### Test Database Configuration

The test database uses the following default configuration:

| Setting | Value |
|---------|-------|
| Host | localhost |
| User | root |
| Database | smart_factory_test |
| Port | 3306 |

To use different credentials, set environment variables before running the setup script:

```bash
export DB_HOST=localhost
export DB_USER=testuser
export DB_PASSWORD=testpass
export DB_NAME=smart_factory_test

./setup-test-db.sh
```

#### Resetting Test Database

To reset the test database to initial state:

```bash
./setup-test-db.sh
```

This will drop and recreate the database with fresh sample data.

## Deployment

### Quick Deployment with Script

The repository includes an automated deployment script that handles all necessary steps:

```bash
# Make the script executable
chmod +x deploy.sh

# Run the deployment script
./deploy.sh
```

#### Deployment Script Options

```bash
# Full deployment with all checks
./deploy.sh

# Skip tests (not recommended)
./deploy.sh --skip-tests

# Skip build (for CI/CD pipelines)
./deploy.sh --skip-build

# Show help
./deploy.sh --help
```

#### What the Deployment Script Does

1. **Checks Prerequisites**
   - Verifies Node.js installation
   - Verifies pnpm installation
   - Verifies git installation

2. **Validates Environment**
   - Checks required environment variables
   - Validates NODE_ENV setting
   - Confirms database configuration

3. **Installs Dependencies**
   - Runs `pnpm install`
   - Updates packages if needed

4. **Type Checking**
   - Runs TypeScript type checking
   - Ensures no type errors

5. **Runs Tests**
   - Executes full test suite
   - Allows continuation on test failures

6. **Builds Application**
   - Runs production build
   - Verifies build artifacts

7. **Verifies Build**
   - Checks backend bundle
   - Checks frontend bundle
   - Reports bundle sizes

8. **Creates Configuration**
   - Generates `.env.production` file
   - Sets production environment variables

9. **Runs Migrations**
   - Executes database migrations
   - Applies schema changes

10. **Health Check**
    - Verifies all required files
    - Confirms deployment readiness

### Manual Deployment

If you prefer manual deployment:

```bash
# 1. Install dependencies
pnpm install

# 2. Run type checking
pnpm check

# 3. Run tests
pnpm test

# 4. Build for production
pnpm build

# 5. Verify build artifacts
ls -la dist/

# 6. Set environment variables
export NODE_ENV=production
export DATABASE_URL="mysql://user:password@host:port/database"
export JWT_SECRET="your-secret-key-here"
export PORT=3000

# 7. Run database migrations (if needed)
pnpm exec drizzle-kit migrate

# 8. Start the application
pnpm start
```

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

#### Environment Variables for Production

```bash
# Required
DATABASE_URL=mysql://user:password@host:port/database
JWT_SECRET=your-strong-secret-key-minimum-32-characters

# Optional
NODE_ENV=production
PORT=3000
VITE_APP_ID=smart-factory-iot
VITE_APP_TITLE=Smart Factory IoT
CORS_ORIGINS=https://yourdomain.com
DEBUG=false
```

#### Production Checklist

- [ ] Database credentials configured
- [ ] JWT_SECRET set to strong value (32+ characters)
- [ ] HTTPS enabled
- [ ] CORS_ORIGINS configured appropriately
- [ ] Monitoring and logging set up
- [ ] Database backups configured
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] Environment variables secured
- [ ] Build artifacts verified

#### Deployment Platforms

The application can be deployed to various platforms:

**Node.js Hosting:**
- Heroku
- Railway
- Render
- DigitalOcean
- AWS EC2
- Google Cloud Run
- Azure App Service

**Database Hosting:**
- AWS RDS
- Google Cloud SQL
- Azure Database for MySQL
- DigitalOcean Managed Databases
- Heroku Postgres

**CDN for Frontend:**
- Cloudflare
- AWS CloudFront
- Google Cloud CDN
- Azure CDN

### Docker Deployment

To deploy using Docker:

```dockerfile
# Dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

COPY . .

RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start"]
```

Build and run:

```bash
docker build -t smart-factory-iot .
docker run -p 3000:3000 \
  -e DATABASE_URL="mysql://..." \
  -e JWT_SECRET="..." \
  smart-factory-iot
```

## SOLID Principles

This project has been refactored to adhere to SOLID principles:

- **Single Responsibility Principle:** Each module and component has a single, well-defined responsibility.
- **Open/Closed Principle:** The application is designed to be extensible without modifying existing code.
- **Liskov Substitution Principle:** All components are designed to be interchangeable with their base types.
- **Interface Segregation Principle:** Interfaces are designed to be specific and focused on client needs.
- **Dependency Inversion Principle:** The application depends on abstractions, not concrete implementations.

For more details, see [SOLID_PRINCIPLES.md](./SOLID_PRINCIPLES.md).

## Architecture

The application follows a layered architecture:

```
┌─────────────────────────────────────┐
│      Frontend (React)               │
│  - Pages, Components, Contexts      │
└────────────────┬────────────────────┘
                 │
┌────────────────▼────────────────────┐
│      API Layer (tRPC)               │
│  - Routers, Procedures              │
└────────────────┬────────────────────┘
                 │
┌────────────────▼────────────────────┐
│   Business Logic Layer              │
│  - Database Functions, SDK          │
└────────────────┬────────────────────┘
                 │
┌────────────────▼────────────────────┐
│    Data Access Layer (Drizzle)      │
│  - Database Queries, Schema         │
└────────────────┬────────────────────┘
                 │
┌────────────────▼────────────────────┐
│      MySQL Database                 │
└─────────────────────────────────────┘
```

## Project Structure

```
smart-factory-iot/
├── client/                    # Frontend React application
│   ├── src/
│   │   ├── pages/            # Page components
│   │   ├── components/       # Reusable UI components
│   │   ├── contexts/         # React contexts
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # Utility functions
│   │   ├── App.tsx           # Main app component
│   │   └── index.css         # Global styles
│   └── public/               # Static assets
├── server/                    # Backend Express server
│   ├── routers.ts            # API route definitions
│   ├── db.ts                 # Database functions
│   ├── _core/                # Core utilities
│   │   ├── env.ts            # Environment config
│   │   ├── sdk.ts            # Security functions
│   │   └── context.ts        # tRPC context
│   └── *.test.ts             # Test files
├── drizzle/                   # Database schema
│   ├── schema.ts             # Table definitions
│   └── migrations/           # Migration files
├── shared/                    # Shared types
├── deploy.sh                  # Deployment script
├── setup-test-db.sh          # Test database setup
├── package.json              # Dependencies
└── README.md                  # This file
```

## Troubleshooting

### Common Issues

**Issue: Database connection refused**

```bash
# Check MySQL service
sudo service mysql status

# Start MySQL if not running
sudo service mysql start

# Verify DATABASE_URL in .env
cat .env | grep DATABASE_URL
```

**Issue: Port already in use**

```bash
# Change port in .env
PORT=3001

# Or kill process using port 3000
lsof -i :3000
kill -9 <PID>
```

**Issue: Tests failing**

```bash
# Ensure test database is set up
./setup-test-db.sh

# Run tests with verbose output
pnpm test -- --reporter=verbose

# Check .env.test exists
cat .env.test | grep DATABASE_URL
```

**Issue: Build errors**

```bash
# Clear build cache
rm -rf dist node_modules

# Reinstall dependencies
pnpm install

# Run type check
pnpm check

# Rebuild
pnpm build
```

## Quick Development Setup

For the fastest way to get the application running with database and demo accounts:

```bash
# Make the dev script executable and run it
chmod +x dev.sh
./dev.sh
```

This script will:
1. Check prerequisites (Node.js, pnpm, MySQL)
2. Set up the development database
3. Seed demo accounts
4. Install dependencies
5. Configure environment variables
6. Start the development server

The application will be available at `http://localhost:3000` with demo accounts ready to use.

## Deployment

### Using the Deploy Script

For production deployment with automatic database setup:

```bash
# Full deployment with database setup
chmod +x deploy.sh
./deploy.sh

# Skip database setup (use existing database)
./deploy.sh --skip-db-setup

# Skip tests
./deploy.sh --skip-tests

# Skip build
./deploy.sh --skip-build

# Show help
./deploy.sh --help
```

### Deployment Features

The `deploy.sh` script provides:
- ✅ Automatic prerequisite validation
- ✅ Environment variable validation
- ✅ Automatic database setup and seeding
- ✅ Dependency installation
- ✅ TypeScript type checking
- ✅ Comprehensive test suite execution
- ✅ Production build creation
- ✅ Build artifact verification
- ✅ Database migrations
- ✅ Health checks
- ✅ Deployment summary with demo account credentials

### Manual Deployment

If you prefer manual setup:

```bash
# 1. Set up database
./setup-dev-db.sh

# 2. Configure environment
cp .env.dev .env

# 3. Install dependencies
pnpm install

# 4. Run tests
pnpm test

# 5. Build application
pnpm build

# 6. Start application
pnpm start
```

### Production Environment Variables

For production deployment, set these environment variables:

```bash
NODE_ENV=production
DATABASE_URL=mysql://user:password@host:port/database
JWT_SECRET=your-strong-secret-key-min-32-chars
PORT=3000
CORS_ORIGINS=https://yourdomain.com
```

### Demo Accounts

After deployment, these demo accounts are available:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@demo.local | demo-admin-password |
| Operator | operator@demo.local | demo-operator-password |
| Technician | technician@demo.local | demo-technician-password |
| Demo | demo@demo.local | demo-password |

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

For support, please:

1. Check the [Issues](https://github.com/DruHustle/smart-factory-iot/issues) page
2. Review the [Documentation](./docs)
3. Contact the author at [andrewgotora@yahoo.com](mailto:andrewgotora@yahoo.com)

## Changelog
### Version 2.0.0

- Added comprehensive deployment guide
- Added automated deployment script (`deploy.sh`)
- Added development setup script (`dev.sh`)
- Added test database setup script (`setup-test-db.sh`)
- Added automatic database setup and seeding
- Improved documentation
- Enhanced error handling
- Added production deployment checklist
- Added demo account quick-fill buttons on login page
- Added blurred industrial background to login page

### Version 1.0.0
- Initial release
- Core IoT monitoring features
- Real-time data streaming
- Device management
- Alert system

## Acknowledgments

- Built with React, Node.js, and MySQL
- Uses Drizzle ORM for database management
- Implements tRPC for type-safe APIs
- Styled with TailwindCSS
