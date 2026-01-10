# API Documentation

## Base URL

```
http://localhost:3000/api
```

For production, replace with your deployment URL.

## Authentication

All endpoints (except login/register) require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Error Responses

All error responses follow this format:

```json
{
  "message": "Error description",
  "code": "ERROR_CODE"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Authentication Endpoints

### Login

**POST** `/auth/login`

Login with email and password.

**Request:**
```json
{
  "email": "admin@dev.local",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "admin@dev.local",
    "name": "Admin User",
    "role": "admin"
  }
}
```

### Register

**POST** `/auth/register`

Create a new user account.

**Request:**
```json
{
  "email": "newuser@dev.local",
  "password": "securepassword123",
  "name": "New User"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 2,
    "email": "newuser@dev.local",
    "name": "New User",
    "role": "user"
  }
}
```

### Get Current User

**GET** `/auth/me`

Get the currently authenticated user.

**Response:**
```json
{
  "id": 1,
  "email": "admin@dev.local",
  "name": "Admin User",
  "role": "admin"
}
```

### Logout

**POST** `/auth/logout`

Logout the current user.

**Response:**
```json
{
  "success": true
}
```

## Device Endpoints

### List Devices

**GET** `/devices`

Get all devices for the current user.

**Query Parameters:**
- `limit` (optional) - Number of results (default: 50)
- `offset` (optional) - Pagination offset (default: 0)
- `zone` (optional) - Filter by zone

**Response:**
```json
{
  "devices": [
    {
      "id": 1,
      "name": "Device 1",
      "type": "sensor",
      "zone": "Production Line A",
      "status": "online",
      "lastSeen": "2026-01-10T12:00:00Z"
    }
  ],
  "total": 1
}
```

### Get Device

**GET** `/devices/:id`

Get a specific device by ID.

**Response:**
```json
{
  "id": 1,
  "name": "Device 1",
  "type": "sensor",
  "zone": "Production Line A",
  "status": "online",
  "lastSeen": "2026-01-10T12:00:00Z",
  "readings": [
    {
      "timestamp": "2026-01-10T12:00:00Z",
      "temperature": 25.5,
      "humidity": 60
    }
  ]
}
```

### Create Device

**POST** `/devices`

Create a new device.

**Request:**
```json
{
  "name": "New Device",
  "type": "sensor",
  "zone": "Production Line A"
}
```

**Response:**
```json
{
  "id": 2,
  "name": "New Device",
  "type": "sensor",
  "zone": "Production Line A",
  "status": "offline",
  "createdAt": "2026-01-10T12:00:00Z"
}
```

### Update Device

**PUT** `/devices/:id`

Update a device.

**Request:**
```json
{
  "name": "Updated Device",
  "zone": "Production Line B"
}
```

**Response:**
```json
{
  "id": 1,
  "name": "Updated Device",
  "type": "sensor",
  "zone": "Production Line B",
  "status": "online"
}
```

### Delete Device

**DELETE** `/devices/:id`

Delete a device.

**Response:**
```json
{
  "success": true
}
```

## Sensor Data Endpoints

### Get Sensor Readings

**GET** `/sensors/:deviceId/readings`

Get sensor readings for a device.

**Query Parameters:**
- `limit` (optional) - Number of results (default: 100)
- `startTime` (optional) - ISO 8601 timestamp
- `endTime` (optional) - ISO 8601 timestamp

**Response:**
```json
{
  "readings": [
    {
      "id": 1,
      "deviceId": 1,
      "timestamp": "2026-01-10T12:00:00Z",
      "temperature": 25.5,
      "humidity": 60,
      "pressure": 1013.25
    }
  ]
}
```

### Create Sensor Reading

**POST** `/sensors/:deviceId/readings`

Create a new sensor reading.

**Request:**
```json
{
  "temperature": 25.5,
  "humidity": 60,
  "pressure": 1013.25
}
```

**Response:**
```json
{
  "id": 1,
  "deviceId": 1,
  "timestamp": "2026-01-10T12:00:00Z",
  "temperature": 25.5,
  "humidity": 60,
  "pressure": 1013.25
}
```

## Alert Endpoints

### List Alerts

**GET** `/alerts`

Get all alerts for the current user.

**Query Parameters:**
- `status` (optional) - Filter by status: `open`, `resolved`, `acknowledged`
- `severity` (optional) - Filter by severity: `info`, `warning`, `critical`
- `limit` (optional) - Number of results (default: 50)

**Response:**
```json
{
  "alerts": [
    {
      "id": 1,
      "deviceId": 1,
      "title": "High Temperature",
      "severity": "critical",
      "status": "open",
      "createdAt": "2026-01-10T12:00:00Z"
    }
  ],
  "total": 1
}
```

### Get Alert

**GET** `/alerts/:id`

Get a specific alert.

**Response:**
```json
{
  "id": 1,
  "deviceId": 1,
  "title": "High Temperature",
  "message": "Temperature exceeded threshold",
  "severity": "critical",
  "status": "open",
  "createdAt": "2026-01-10T12:00:00Z",
  "resolvedAt": null
}
```

### Update Alert

**PUT** `/alerts/:id`

Update an alert (e.g., mark as resolved).

**Request:**
```json
{
  "status": "resolved"
}
```

**Response:**
```json
{
  "id": 1,
  "deviceId": 1,
  "title": "High Temperature",
  "severity": "critical",
  "status": "resolved",
  "resolvedAt": "2026-01-10T12:30:00Z"
}
```

## Export Endpoints

### Export Device Report

**GET** `/export/device/:deviceId`

Export device data as HTML or PDF.

**Query Parameters:**
- `format` (optional) - Export format: `html`, `pdf` (default: `html`)
- `startDate` (optional) - ISO 8601 date
- `endDate` (optional) - ISO 8601 date

**Response:**
- HTML report with device data and charts
- PDF report (if format=pdf)

### Export All Devices

**GET** `/export/devices`

Export all devices as CSV.

**Response:**
- CSV file with device list

## Rate Limiting

API endpoints are rate limited:
- 100 requests per minute for authenticated users
- 10 requests per minute for unauthenticated endpoints

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1234567890
```

## Pagination

List endpoints support pagination using `limit` and `offset` parameters:

```
GET /api/devices?limit=10&offset=0
```

Response includes pagination metadata:
```json
{
  "data": [...],
  "pagination": {
    "total": 100,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

## Filtering

List endpoints support filtering:

```
GET /api/devices?zone=Production%20Line%20A&status=online
```

## Sorting

List endpoints support sorting:

```
GET /api/devices?sort=name&order=asc
```

## Examples

### Login and Get Devices

```bash
# 1. Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@dev.local",
    "password": "password123"
  }'

# Response includes token
# Save token: TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 2. Get devices using token
curl -X GET http://localhost:3000/api/devices \
  -H "Authorization: Bearer $TOKEN"
```

### Create Device and Add Reading

```bash
# 1. Create device
curl -X POST http://localhost:3000/api/devices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Temperature Sensor",
    "type": "sensor",
    "zone": "Production Line A"
  }'

# Response: { "id": 123, ... }

# 2. Add sensor reading
curl -X POST http://localhost:3000/api/sensors/123/readings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "temperature": 25.5,
    "humidity": 60
  }'
```

---

**Last Updated:** January 2026
