# Smart Factory IoT Architecture Documentation

**Version:** 2.1.0  
**Last Updated:** January 10, 2026  
**Status:** Production Ready

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Component Design](#component-design)
3. [Database Schema](#database-schema)
4. [API Flows & Sequences](#api-flows--sequences)
5. [Technology Stack](#technology-stack)
6. [Deployment Architecture](#deployment-architecture)
7. [Security Architecture](#security-architecture)
8. [Performance Metrics](#performance-metrics)
9. [Best Practices](#best-practices)

---

## System Architecture

### Overview

Smart Factory IoT is an enterprise-grade industrial monitoring platform built with modern web technologies. It provides comprehensive visibility and control over IoT devices in manufacturing environments with real-time data streaming, automated alerts, and device management capabilities.

### Key Components

**Client Layer**
- React 19 frontend with TypeScript
- Real-time dashboard with live sensor data
- REST API authentication with JWT tokens
- Responsive design matching IMSOP patterns
- Support for offline authentication (GitHub Pages)

**API Layer**
- Express.js REST API server
- JWT-based authentication
- Comprehensive error handling
- Rate limiting and pagination
- CORS support for cross-origin requests

**Backend Services**
- Device Management Service (CRUD operations)
- Sensor Data Service (readings and analytics)
- Alert Service (thresholds and notifications)
- Authentication Service (login, register, logout)
- Export Service (reports and data export)

**Data Layer**
- MySQL database with Drizzle ORM
- Optimized schema for IoT data
- Indexed queries for performance
- Support for time-series data

**Deployment Layer**
- GitHub Pages for frontend (static deployment)
- GitHub Actions for CI/CD
- Automatic deployment on successful builds
- Support for both mock and real authentication

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer (React)                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Login Page  │  Dashboard  │  Device Management  │   │   │
│  │  (REST Auth) │ (Real-time) │  (CRUD Operations)  │   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    (REST API Calls)
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway (Express)                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Auth Routes  │  Device Routes  │  Sensor Routes  │   │   │
│  │  Alert Routes │  Export Routes  │  Health Check   │   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    (Database Queries)
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Data Layer (MySQL)                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Users  │  Devices  │  Sensors  │  Alerts  │  Logs  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Design

### Frontend Components

**Authentication Context**
- Manages user authentication state
- Handles login, logout, and registration
- Stores JWT tokens securely
- Provides fallback to mock auth for GitHub Pages

**API Authentication Service**
- REST API client for authentication
- Token management and refresh
- Error handling and logging
- Support for localStorage and sessionStorage

**Login Page**
- Professional UI matching IMSOP design
- Email and password input fields
- Demo account buttons (Admin, Operator, Technician, Demo)
- Password visibility toggle
- Form validation and error messages

**Dashboard**
- Real-time device monitoring
- Sensor data visualization
- Alert management interface
- Device grouping and filtering
- Export functionality

### Backend Components

**Authentication Controller**
- User login and registration
- JWT token generation
- Password hashing with bcrypt
- Session management

**Device Controller**
- CRUD operations for devices
- Device grouping and filtering
- Status tracking
- Device configuration

**Sensor Controller**
- Sensor reading collection
- Time-series data storage
- Data aggregation and analytics
- Historical data retrieval

**Alert Controller**
- Alert threshold management
- Alert generation and notification
- Alert status tracking
- Alert history and reporting

---

## Database Schema

### Core Tables

**Users Table**
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Devices Table**
```sql
CREATE TABLE devices (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  zone VARCHAR(255),
  status VARCHAR(50) DEFAULT 'offline',
  lastSeen TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

**Sensor Readings Table**
```sql
CREATE TABLE sensor_readings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  deviceId INT NOT NULL,
  temperature DECIMAL(10, 2),
  humidity DECIMAL(10, 2),
  pressure DECIMAL(10, 2),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (deviceId) REFERENCES devices(id),
  INDEX (deviceId, timestamp)
);
```

**Alerts Table**
```sql
CREATE TABLE alerts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  deviceId INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  severity VARCHAR(50),
  status VARCHAR(50) DEFAULT 'open',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolvedAt TIMESTAMP NULL,
  FOREIGN KEY (deviceId) REFERENCES devices(id)
);
```

---

## API Flows & Sequences

### Authentication Flow

```
User Input (Email, Password)
    ↓
POST /api/auth/login
    ↓
Backend validates credentials
    ↓
Generate JWT token
    ↓
Return token + user data
    ↓
Frontend stores token
    ↓
Subsequent requests include token in Authorization header
    ↓
Backend validates token
    ↓
Request processed
```

### Device Data Flow

```
Device sends sensor data
    ↓
POST /api/sensors/:deviceId/readings
    ↓
Backend stores reading in database
    ↓
Alert thresholds checked
    ↓
If threshold exceeded → Generate alert
    ↓
Frontend polls for updates
    ↓
Dashboard displays real-time data
```

---

## Technology Stack

### Frontend
- **React:** 19.2.1 - UI framework
- **TypeScript:** 5.6.3 - Type safety
- **Vite:** 7.1.7 - Build tool
- **Tailwind CSS:** 4.1.14 - Styling
- **Radix UI:** Component primitives
- **shadcn/ui:** Component library
- **Wouter:** 3.3.5 - Routing
- **React Hook Form:** Form management
- **Zod:** Schema validation
- **Recharts:** Data visualization
- **Framer Motion:** Animations
- **Sonner:** Toast notifications

### Backend
- **Node.js:** v22+ - Runtime
- **Express:** 4.21.2 - Web framework
- **TypeScript:** 5.6.3 - Type safety
- **Drizzle ORM:** 0.45.1 - Database ORM
- **MySQL:** Database
- **jsonwebtoken:** JWT authentication
- **bcryptjs:** Password hashing
- **CORS:** Cross-origin support
- **Zod:** Input validation

### Infrastructure
- **GitHub Actions:** CI/CD
- **GitHub Pages:** Frontend hosting
- **MySQL:** Database hosting
- **Node.js:** Backend runtime

---

## Deployment Architecture

### Development Environment
- Local MySQL database
- Local Node.js server (port 3000)
- Vite dev server with hot reload
- Mock authentication for testing

### Production Environment
- GitHub Pages for frontend
- Express server for backend API
- MySQL database (remote or local)
- GitHub Actions for automated deployment
- Automatic build and deploy on push to main

### Deployment Process

```
Developer pushes to main branch
    ↓
GitHub Actions workflow triggered
    ↓
Dependencies installed
    ↓
Frontend built (Vite)
    ↓
Backend bundled (esbuild)
    ↓
Tests executed
    ↓
Build artifacts generated
    ↓
Frontend deployed to GitHub Pages
    ↓
Backend deployed to hosting
    ↓
Database migrations applied
    ↓
Health checks performed
    ↓
Deployment complete
```

---

## Security Architecture

### Authentication
- JWT tokens with 24-hour expiration
- Password hashing with bcrypt
- Secure token storage (localStorage/sessionStorage)
- Token validation on every request

### Authorization
- Role-based access control (RBAC)
- User isolation (can only access own data)
- Permission checks on sensitive operations
- Audit logging for security events

### Data Protection
- HTTPS for all communications
- SQL injection prevention (parameterized queries)
- XSS protection (React auto-escaping)
- CSRF protection (SameSite cookies)
- Input validation and sanitization

### API Security
- CORS configuration
- Rate limiting on auth endpoints
- Request validation with Zod
- Error message sanitization
- Security headers (HSTS, X-Frame-Options, etc.)

---

## Performance Metrics

### Response Times
- Login: < 500ms
- Device list: < 1000ms
- Sensor readings: < 500ms
- Alert creation: < 200ms

### Scalability
- Support for 10,000+ devices
- Support for 1,000,000+ sensor readings
- Support for 100+ concurrent users
- Database query optimization with indexes

### Optimization Strategies
- Database query optimization
- Pagination for large datasets
- Caching for frequently accessed data
- Frontend code splitting
- Lazy loading of components
- Image optimization
- CSS minification

---

## Best Practices

### Code Organization
- Separation of concerns (controllers, services, models)
- Modular component structure
- Clear naming conventions
- Comprehensive documentation
- Type safety with TypeScript

### Error Handling
- Graceful error messages
- Proper HTTP status codes
- Error logging and monitoring
- User-friendly error displays
- Detailed error information for debugging

### Testing
- Unit tests for business logic
- Integration tests for APIs
- Component tests for UI
- End-to-end tests for workflows
- Test coverage > 80%

### Performance
- Lazy loading of routes
- Code splitting for large bundles
- Database query optimization
- Caching strategies
- CDN for static assets

### Security
- Regular security audits
- Dependency vulnerability scanning
- Secure coding practices
- Input validation and sanitization
- Regular security updates

---

**Last Updated:** January 10, 2026  
**Status:** Active and maintained
