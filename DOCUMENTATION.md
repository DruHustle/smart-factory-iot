# Smart Factory IoT - Complete Documentation

Welcome to the Smart Factory IoT platform documentation. This comprehensive guide covers all aspects of the system architecture, development, and deployment.

## 📚 Documentation Index

### Architecture & Design
- **[System Architecture](./docs/architecture.md)** - High-level system design and component overview
  - 📥 [Download PDF](./docs/architecture.pdf) | 🌐 [View Online](https://druhustle.github.io/portfolio/#/projects/smart-factory-iot/documentation)
- **[Database Schema](./docs/database-schema.md)** - Complete database design and relationships
  - 📥 [Download PDF](./docs/database-schema.pdf) | 🌐 [View Online](https://druhustle.github.io/portfolio/#/projects/smart-factory-iot/documentation)
- **[API Flows & Sequences](./docs/api-flows.md)** - Detailed API interaction flows and diagrams
  - 📥 [Download PDF](./docs/api-flows.pdf) | 🌐 [View Online](https://druhustle.github.io/portfolio/#/projects/smart-factory-iot/documentation)

### Development
- **[Setup & Installation](./README.md#-development-setup)** - Local development environment setup
- **[API Documentation](./docs/api-flows.md)** - REST API and WebSocket endpoints
- **[Database Setup](./setup-dev-db.sh)** - Development database initialization

### Deployment
- **[Deployment Guide](./deploy.sh)** - Production deployment automation
- **[Environment Configuration](./README.md#-environment-variables)** - Configuration reference
- **[Docker Setup](./Dockerfile)** - Container deployment (if available)

### Testing
- **[Test Database Setup](./setup-test-db.sh)** - Test environment configuration
- **[Running Tests](./README.md#-testing)** - Unit and integration tests

## 🏗️ Architecture Overview

The Smart Factory IoT platform is built with a modern, scalable architecture:

```
┌─────────────────────────────────────────────────────┐
│                  Frontend Layer                     │
│            React Dashboard + WebSocket              │
└────────────────────┬────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
    ┌────▼────┐            ┌────▼────┐
    │REST API │            │WebSocket│
    │         │            │ Streams │
    └────┬────┘            └────┬────┘
         │                      │
         └──────────┬───────────┘
                    │
          ┌─────────▼──────────┐
          │  Backend Layer     │
          │  (Node.js/Express) │
          └─────────┬──────────┘
                    │
    ┌───────────────┼───────────────┐
    │               │               │
┌───▼────┐   ┌─────▼────┐   ┌─────▼────┐
│Database │   │Notifications   │Services│
│(MySQL)  │   │(Email/SMS)     │(OTA)   │
└─────────┘   └────────────────┘────────┘
```

## 🚀 Quick Start

### Development
```bash
# 1. Set up development database
./setup-dev-db.sh

# 2. Copy environment file
cp .env.dev .env

# 3. Install dependencies
pnpm install

# 4. Start development server
pnpm dev
```

### Production
```bash
# 1. Configure environment variables
export DATABASE_URL="mysql://user:password@host:port/db"
export JWT_SECRET="your-secret-key"

# 2. Run deployment script
./deploy.sh
```

## 📊 Key Features

### Real-time Monitoring
- Live device status updates via WebSocket
- Sensor data streaming with minimal latency
- Automatic reconnection handling

### Alert Management
- Threshold-based alerts with multiple severity levels
- Alert acknowledgment and resolution tracking
- Email/SMS notifications

### Device Management
- CRUD operations for IoT devices
- Device grouping and batch operations
- Device health monitoring

### Analytics
- OEE (Overall Equipment Effectiveness) calculation
- Historical data analysis
- Trend reporting and visualization

### Firmware Management
- OTA (Over-The-Air) update distribution
- Update status tracking
- Rollback capability

## 🔐 Security Features

### Authentication & Authorization
- JWT-based token authentication
- Secure password hashing with bcryptjs
- Role-based access control (RBAC)

### Data Protection
- HTTPS/TLS encryption in transit
- Database encryption at rest
- Input validation and sanitization

### Compliance
- GDPR compliance for user data
- Audit logging for all modifications
- Data anonymization for deleted users

## 📈 Performance Metrics

| Metric | Target |
|--------|--------|
| API Response Time | < 200ms (p95) |
| WebSocket Latency | < 100ms |
| Dashboard Load Time | < 2s |
| Database Query Time | < 50ms (p95) |
| Memory Usage | < 512MB |
| CPU Usage | < 50% under load |

## 🛠️ Technology Stack

| Component | Technology |
|-----------|-----------|
| Frontend | React 19 + TypeScript |
| Styling | Tailwind CSS 4 |
| Backend | Node.js + Express |
| API | TRPC (Type-safe RPC) |
| Database | MySQL 8.0+ |
| Real-time | WebSocket |
| Authentication | JWT |
| ORM | Drizzle ORM |

## 📝 SOLID Principles

The codebase implements SOLID design principles:

- **S**ingle Responsibility - Each component has one clear purpose
- **O**pen/Closed - Components are extensible through props
- **L**iskov Substitution - Consistent interfaces across services
- **I**nterface Segregation - Minimal required props per component
- **D**ependency Inversion - Services depend on abstractions

## 🔄 Development Workflow

### 1. Local Development
```bash
pnpm dev
```
- Hot module reloading enabled
- Mock data seeding available
- TypeScript checking on save

### 2. Testing
```bash
pnpm test      # Run unit tests
pnpm check     # TypeScript checking
pnpm build     # Production build
```

### 3. Deployment
```bash
./deploy.sh    # Automated deployment
```

## 📦 Project Structure

```
smart-factory-iot/
├── client/                 # React frontend
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable components
│   │   ├── contexts/      # React contexts
│   │   ├── lib/           # Utilities
│   │   └── index.css      # Global styles
│   └── public/            # Static assets
├── server/                # Node.js backend
│   ├── _core/            # Core server logic
│   ├── routers/          # TRPC routers
│   └── db.ts             # Database connection
├── shared/               # Shared types
├── drizzle/              # Database schema
├── docs/                 # Documentation
├── deploy.sh             # Deployment script
├── setup-dev-db.sh       # Dev database setup
└── README.md             # Project README
```

## 🐛 Troubleshooting

### Login Error: "Unexpected token '<'"
- Ensure backend server is running: `pnpm dev`
- Check DATABASE_URL is configured
- Verify JWT_SECRET is set

### Database Connection Failed
- Ensure MySQL service is running
- Check DATABASE_URL format
- Verify database credentials

### WebSocket Connection Timeout
- Check network connectivity
- Verify WebSocket server is running
- Check firewall settings

## 📞 Support & Contribution

### Reporting Issues
- Use the [GitHub Issue Tracker](https://github.com/DruHustle/smart-factory-iot/issues)
- Provide detailed error messages
- Include steps to reproduce

### Contributing
- Fork the repository
- Create a feature branch
- Submit a pull request
- Follow SOLID principles

## 📄 License

This project is licensed under the MIT License. See LICENSE file for details.

## 👤 Author

**Andrew Gotora**
- Portfolio: https://druhustle.github.io/portfolio
- GitHub: https://github.com/DruHustle
- Email: contact@example.com

## 🔗 Resources

### External Documentation
- [React Documentation](https://react.dev)
- [Node.js Documentation](https://nodejs.org/docs)
- [MySQL Documentation](https://dev.mysql.com/doc)
- [TRPC Documentation](https://trpc.io)

### Related Projects
- [IMSOP - Supply Chain Platform](https://github.com/DruHustle/imsop)
- [Portfolio Website](https://github.com/DruHustle/portfolio)

## 📅 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Jan 2026 | Initial release |
| 0.9.0 | Dec 2025 | Beta release |
| 0.1.0 | Nov 2025 | Alpha release |

---

**Last Updated:** January 10, 2026  
**Status:** Production Ready ✅
