# Authentication Guide

## Overview

Smart Factory IoT uses REST API authentication with JWT tokens. This guide explains how authentication works and how to integrate it into your application.

## Authentication Flow

```
User Login
    ↓
POST /api/auth/login (email, password)
    ↓
Backend validates credentials
    ↓
Returns JWT token + user data
    ↓
Frontend stores token in localStorage
    ↓
Subsequent requests include token in Authorization header
    ↓
Backend validates token
    ↓
Request processed
```

## API Endpoints

### 1. Login

**Endpoint:** `POST /api/auth/login`

**Request:**
```json
{
  "email": "admin@dev.local",
  "password": "password123"
}
```

**Response (Success - 200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "admin@dev.local",
    "name": "Admin User",
    "role": "admin",
    "createdAt": "2026-01-10T00:00:00Z"
  }
}
```

**Response (Error - 401):**
```json
{
  "message": "Invalid email or password"
}
```

### 2. Register

**Endpoint:** `POST /api/auth/register`

**Request:**
```json
{
  "email": "newuser@dev.local",
  "password": "securepassword123",
  "name": "New User"
}
```

**Response (Success - 201):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 2,
    "email": "newuser@dev.local",
    "name": "New User",
    "role": "user",
    "createdAt": "2026-01-10T12:00:00Z"
  }
}
```

### 3. Get Current User

**Endpoint:** `GET /api/auth/me`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (Success - 200):**
```json
{
  "id": 1,
  "email": "admin@dev.local",
  "name": "Admin User",
  "role": "admin",
  "createdAt": "2026-01-10T00:00:00Z"
}
```

**Response (Error - 401):**
```json
{
  "message": "Unauthorized"
}
```

### 4. Logout

**Endpoint:** `POST /api/auth/logout`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (Success - 200):**
```json
{
  "success": true
}
```

## Token Management

### Storing Tokens

Tokens are automatically stored in the best available storage:

1. **localStorage** - Persists across browser sessions
2. **sessionStorage** - Persists during browser session
3. **In-memory** - Falls back to memory if storage unavailable (Safari private mode)

### Using Tokens

All authenticated requests must include the token in the Authorization header:

```
Authorization: Bearer <token>
```

### Token Expiration

JWT tokens expire after 24 hours. When a token expires:

1. API returns 401 Unauthorized
2. Frontend clears stored token
3. User is redirected to login page

## Demo Accounts

The following demo accounts are available for testing:

| Email | Password | Role | Access |
|-------|----------|------|--------|
| admin@dev.local | password123 | admin | Full system access |
| operator@dev.local | password123 | user | Device monitoring |
| tech@dev.local | password123 | user | Technical support |

## Frontend Integration

### Using the Auth Context

```typescript
import { useAuth } from "@/contexts/AuthContext";

export function MyComponent() {
  const { user, login, logout, isLoading } = useAuth();

  const handleLogin = async () => {
    const result = await login("admin@dev.local", "password123");
    if (result.success) {
      console.log("Login successful!");
    } else {
      console.error("Login failed:", result.error);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {user ? (
        <>
          <p>Welcome, {user.name}!</p>
          <button onClick={handleLogout}>Logout</button>
        </>
      ) : (
        <button onClick={handleLogin}>Login</button>
      )}
    </div>
  );
}
```

### Making Authenticated API Calls

```typescript
import { getAuthToken } from "@/lib/api-auth";

async function fetchDevices() {
  const token = getAuthToken();
  
  const response = await fetch("/api/devices", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.json();
}
```

## Backend Implementation

### Login Endpoint

```typescript
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }

  // Find user
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  // Verify password
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  // Generate token
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "24h" }
  );

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
});
```

### Protected Endpoint

```typescript
// Middleware to verify token
function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
}

// Protected route
app.get("/api/devices", verifyToken, async (req, res) => {
  const devices = await db.query.devices.findMany({
    where: eq(devices.userId, req.userId),
  });

  res.json(devices);
});
```

## Security Best Practices

1. **HTTPS Only** - Always use HTTPS in production
2. **Secure Storage** - Store tokens securely (localStorage, sessionStorage)
3. **Token Expiration** - Implement token refresh mechanism
4. **CORS** - Configure CORS properly for your domain
5. **Password Hashing** - Always hash passwords with bcrypt
6. **Input Validation** - Validate all user input
7. **Rate Limiting** - Implement rate limiting on auth endpoints

## Troubleshooting

### Login fails with "Invalid email or password"

1. Check email is correct
2. Verify password is correct
3. Ensure user exists in database
4. Check database connection

### Token expires immediately

1. Verify JWT_SECRET is set correctly
2. Check token expiration time
3. Ensure system clock is synchronized

### "Unauthorized" on protected endpoints

1. Verify token is included in Authorization header
2. Check token format: `Bearer <token>`
3. Ensure token hasn't expired
4. Verify JWT_SECRET matches on backend

### CORS errors

1. Check CORS configuration in backend
2. Verify frontend URL is whitelisted
3. Ensure credentials are included in requests

## Environment Variables

Required environment variables for authentication:

```bash
# JWT Configuration
JWT_SECRET=your-secret-key-here

# API Configuration
VITE_API_URL=http://localhost:3000/api

# Database
DATABASE_URL=mysql://user:password@localhost:3306/smart_factory_dev
```

## Related Documentation

- [README.md](./README.md) - Project overview
- [API Documentation](./API.md) - Full API reference
- [Deployment Guide](./DEPLOYMENT.md) - Deployment instructions

---

**Last Updated:** January 2026
