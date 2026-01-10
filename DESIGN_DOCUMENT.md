# Smart Factory IoT Design Document

**Version:** 2.1.0  
**Last Updated:** January 10, 2026  
**Status:** Production Ready

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [System Design Overview](#system-design-overview)
3. [Component Architecture](#component-architecture)
4. [Database Design](#database-design)
5. [API Design](#api-design)
6. [Frontend Architecture](#frontend-architecture)
7. [Backend Architecture](#backend-architecture)
8. [Security Design](#security-design)
9. [Scalability Design](#scalability-design)
10. [Technology Choices](#technology-choices)

---

## Design Philosophy

### Core Principles

1. **Simplicity First**
   - Keep interfaces intuitive and easy to use
   - Minimize complexity in code and architecture
   - Make common tasks straightforward

2. **Reliability**
   - Comprehensive error handling
   - Data consistency and integrity
   - Graceful degradation

3. **Scalability**
   - Design for growth
   - Optimize for performance
   - Support horizontal scaling

4. **Security**
   - Protect user data
   - Secure all communications
   - Regular security audits

5. **Maintainability**
   - Clear code organization
   - Comprehensive documentation
   - Easy to understand and modify

### Design Patterns

- **MVC Pattern:** Separation of concerns
- **Repository Pattern:** Data access abstraction
- **Service Pattern:** Business logic encapsulation
- **Middleware Pattern:** Request processing pipeline
- **Context Pattern:** State management

---

## System Design Overview

### High-Level Architecture

The Smart Factory IoT system follows a three-tier architecture:

1. **Presentation Tier (Frontend)**
   - React-based user interface
   - Real-time data visualization
   - User authentication and authorization

2. **Application Tier (Backend)**
   - Express.js REST API
   - Business logic implementation
   - Data validation and processing

3. **Data Tier (Database)**
   - MySQL relational database
   - Optimized schema for IoT data
   - Efficient query execution

### Key Design Decisions

**REST API over tRPC**
- Simpler integration with external systems
- Better browser compatibility
- Easier debugging and testing
- Standard HTTP semantics

**JWT Authentication**
- Stateless authentication
- Scalable across multiple servers
- No session storage required
- Support for mobile clients

**React for Frontend**
- Component-based architecture
- Large ecosystem and community
- Excellent developer experience
- Performance optimization tools

**MySQL Database**
- Proven reliability
- Good performance for structured data
- ACID compliance
- Wide hosting support

---

## Component Architecture

### Frontend Components

**Authentication Layer**
- Login page with email/password input
- Demo account quick access
- JWT token management
- Session persistence

**Dashboard Layer**
- Device list and filtering
- Real-time sensor data display
- Alert management interface
- Device grouping and organization

**Device Management Layer**
- Device CRUD operations
- Device configuration
- Status monitoring
- Historical data viewing

**Data Visualization Layer**
- Sensor data charts
- Alert timeline
- Device status indicators
- Performance metrics

### Backend Components

**Authentication Service**
- User registration and login
- Password hashing and validation
- JWT token generation
- Session management

**Device Service**
- Device CRUD operations
- Device status tracking
- Device grouping logic
- Device configuration

**Sensor Service**
- Sensor reading collection
- Data aggregation
- Historical data retrieval
- Data validation

**Alert Service**
- Alert threshold management
- Alert generation
- Alert notification
- Alert history tracking

---

## Database Design

### Schema Design Principles

1. **Normalization**
   - Eliminate data redundancy
   - Ensure data consistency
   - Optimize storage

2. **Indexing**
   - Index frequently queried columns
   - Composite indexes for common queries
   - Balance between read and write performance

3. **Relationships**
   - Clear foreign key relationships
   - Referential integrity
   - Cascading operations where appropriate

### Core Tables

**Users**
- User authentication and profile
- Role-based access control
- Account management

**Devices**
- Device inventory
- Device metadata
- Device status tracking

**Sensor Readings**
- Time-series sensor data
- Device-specific readings
- Timestamp indexing for range queries

**Alerts**
- Alert definitions and thresholds
- Alert instances
- Alert status and history

**Logs**
- Audit trail
- System events
- Error tracking

---

## API Design

### Design Principles

1. **RESTful**
   - Standard HTTP methods (GET, POST, PUT, DELETE)
   - Resource-based URLs
   - Proper HTTP status codes

2. **Consistent**
   - Consistent naming conventions
   - Consistent error responses
   - Consistent pagination

3. **Secure**
   - JWT authentication required
   - Input validation
   - Rate limiting

4. **Documented**
   - Clear endpoint descriptions
   - Request/response examples
   - Error documentation

### Endpoint Categories

**Authentication Endpoints**
- POST /api/auth/login
- POST /api/auth/register
- POST /api/auth/logout
- GET /api/auth/me

**Device Endpoints**
- GET /api/devices
- POST /api/devices
- GET /api/devices/:id
- PUT /api/devices/:id
- DELETE /api/devices/:id

**Sensor Endpoints**
- GET /api/sensors/:deviceId/readings
- POST /api/sensors/:deviceId/readings

**Alert Endpoints**
- GET /api/alerts
- GET /api/alerts/:id
- PUT /api/alerts/:id

**Export Endpoints**
- GET /api/export/device/:deviceId
- GET /api/export/devices

---

## Frontend Architecture

### Component Hierarchy

```
App
├── AuthContext (Global auth state)
├── ThemeProvider (Global theme state)
├── Router
│   ├── Login Page
│   │   ├── LoginForm
│   │   ├── DemoAccounts
│   │   └── PasswordToggle
│   ├── Dashboard
│   │   ├── Header
│   │   ├── Sidebar
│   │   ├── DeviceList
│   │   ├── SensorChart
│   │   └── AlertPanel
│   └── NotFound
```

### State Management

**Global State (Context)**
- User authentication
- Theme (light/dark)
- User preferences

**Local State (useState)**
- Form inputs
- UI interactions
- Component-specific data

**Derived State (useMemo)**
- Filtered device lists
- Calculated metrics
- Formatted data

---

## Backend Architecture

### Request Processing Pipeline

```
Request
  ↓
CORS Middleware
  ↓
Request Logging
  ↓
Body Parsing
  ↓
Authentication Middleware
  ↓
Route Handler
  ↓
Business Logic
  ↓
Database Query
  ↓
Response Formatting
  ↓
Response Sent
```

### Error Handling

**Error Categories**
- Validation Errors (400)
- Authentication Errors (401)
- Authorization Errors (403)
- Not Found Errors (404)
- Server Errors (500)

**Error Response Format**
```json
{
  "message": "Error description",
  "code": "ERROR_CODE",
  "details": {}
}
```

---

## Security Design

### Authentication Flow

1. User submits credentials
2. Backend validates credentials
3. Password verified with bcrypt
4. JWT token generated
5. Token returned to client
6. Client stores token securely
7. Subsequent requests include token
8. Backend validates token
9. Request processed

### Authorization Model

**Role-Based Access Control**
- Admin: Full system access
- User: Limited access to own data
- Operator: Device monitoring access
- Technician: Maintenance access

**Resource-Level Authorization**
- Users can only access their own devices
- Devices can only be modified by owner
- Alerts can only be viewed by device owner

### Data Protection

**In Transit**
- HTTPS/TLS encryption
- Secure cookie flags
- CORS restrictions

**At Rest**
- Password hashing (bcrypt)
- Sensitive data encryption
- Secure database connections

---

## Scalability Design

### Horizontal Scaling

**Stateless Design**
- No server-side session storage
- JWT tokens for authentication
- Database as single source of truth

**Load Balancing**
- Multiple backend instances
- Database connection pooling
- Caching layer (Redis)

### Vertical Scaling

**Database Optimization**
- Query optimization
- Index optimization
- Connection pooling

**Application Optimization**
- Code splitting
- Lazy loading
- Caching strategies

### Performance Optimization

**Frontend**
- Bundle size optimization
- Code splitting by route
- Image optimization
- CSS minification

**Backend**
- Query optimization
- Database indexing
- Response caching
- Compression (gzip)

---

## Technology Choices

### Frontend Technologies

**React 19**
- Modern component model
- Excellent performance
- Large ecosystem
- Strong community support

**TypeScript**
- Type safety
- Better IDE support
- Fewer runtime errors
- Improved maintainability

**Tailwind CSS**
- Utility-first approach
- Rapid development
- Consistent design
- Small bundle size

**Vite**
- Fast build times
- Instant HMR
- Optimized production builds
- Modern tooling

### Backend Technologies

**Express.js**
- Lightweight and flexible
- Large middleware ecosystem
- Easy to learn and use
- Good performance

**Drizzle ORM**
- Type-safe queries
- Minimal overhead
- Excellent TypeScript support
- Easy migrations

**MySQL**
- Reliable and stable
- Good performance
- Wide hosting support
- ACID compliance

**JWT**
- Stateless authentication
- Scalable across servers
- Industry standard
- Good security

---

## Design Trade-offs

### Simplicity vs Features
- Chose simplicity for initial release
- Can add features incrementally
- Keeps codebase maintainable

### Performance vs Maintainability
- Chose maintainability
- Performance optimized where needed
- Can optimize later if required

### Security vs Usability
- Chose security first
- Made authentication simple
- Demo accounts for testing

---

**Last Updated:** January 10, 2026  
**Status:** Active and maintained
