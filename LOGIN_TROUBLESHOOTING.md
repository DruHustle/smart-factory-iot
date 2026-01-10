# Smart Factory IoT - Login Troubleshooting Guide

## Common Login Issues & Solutions

### Issue: "Unexpected token '<', '<html> <he'... is not valid JSON"

**Root Cause:** The backend API server is not running. The frontend is trying to call `/api/trpc` but receiving an HTML error page instead of JSON.

**Solution:**

1. **Ensure MySQL is running:**
   ```bash
   sudo service mysql start
   ```

2. **Set up development database:**
   ```bash
   ./setup-dev-db.sh
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.dev .env
   ```

4. **Install dependencies:**
   ```bash
   pnpm install
   ```

5. **Start the development server:**
   ```bash
   pnpm dev
   ```

The server should start on `http://localhost:3000`

---

## Complete Setup Instructions

### Prerequisites
- Node.js 18+ and pnpm
- MySQL 8.0+
- Git

### Step-by-Step Setup

#### 1. Clone Repository
```bash
git clone https://github.com/DruHustle/smart-factory-iot.git
cd smart-factory-iot
```

#### 2. Set Up Database
```bash
# Create development database with sample data
./setup-dev-db.sh

# Or for test database
./setup-test-db.sh
```

#### 3. Configure Environment
```bash
# Copy environment template
cp .env.dev .env

# Edit .env if needed (optional)
# nano .env
```

#### 4. Install Dependencies
```bash
pnpm install
```

#### 5. Start Development Server
```bash
pnpm dev
```

#### 6. Access Application
- Open browser to `http://localhost:3000`
- Login page will display with blurred industrial background
- Click any demo account button to auto-fill credentials
- Click "Sign In"

---

## Demo Accounts

| Account | Email | Password | Role |
|---------|-------|----------|------|
| Admin | admin@demo.local | demo-admin-password | admin |
| Operator | operator@demo.local | demo-operator-password | user |
| Technician | technician@demo.local | demo-technician-password | user |
| Demo | demo@demo.local | demo-password | user |

---

## Troubleshooting Checklist

- [ ] MySQL service is running: `sudo service mysql status`
- [ ] Database created: `mysql -u root -e "SHOW DATABASES;" | grep smart_factory`
- [ ] Environment file exists: `ls -la .env`
- [ ] Dependencies installed: `pnpm list | head -20`
- [ ] Dev server running: `curl http://localhost:3000`
- [ ] API endpoint accessible: `curl http://localhost:3000/api/trpc`
- [ ] Browser console shows no errors (F12)
- [ ] Network tab shows successful API calls (F12 → Network)

---

## Advanced Troubleshooting

### Check Server Logs
```bash
# View server output
pnpm dev 2>&1 | tee server.log

# Check for errors
grep -i error server.log
```

### Verify Database Connection
```bash
# Test MySQL connection
mysql -u root -p -e "USE smart_factory_dev; SELECT * FROM users LIMIT 1;"
```

### Clear Cache & Rebuild
```bash
# Clear node modules and rebuild
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm build
```

### Check TypeScript Errors
```bash
pnpm check
```

### Run Tests
```bash
pnpm test
```

---

## Production Deployment

### Environment Variables Required
```
NODE_ENV=production
DATABASE_URL=mysql://user:password@host:port/smart_factory
JWT_SECRET=your-secret-key-min-32-chars
PORT=3000
```

### Build for Production
```bash
pnpm build
pnpm start
```

---

## Support

For additional issues:
1. Check browser console (F12)
2. Check server logs
3. Verify database connection
4. Review error messages carefully
5. Check GitHub issues: https://github.com/DruHustle/smart-factory-iot/issues

---

## Architecture

The application uses:
- **Frontend:** React 19 + TypeScript + Tailwind CSS
- **Backend:** Node.js + Express + tRPC
- **Database:** MySQL with Drizzle ORM
- **Authentication:** JWT tokens with bcryptjs password hashing

The login flow:
1. User enters credentials on login page
2. Frontend sends POST request to `/api/trpc/auth.login`
3. Backend validates credentials against database
4. Backend returns JWT token on success
5. Frontend stores token in localStorage
6. Frontend redirects to dashboard
7. All subsequent requests include token in Authorization header

