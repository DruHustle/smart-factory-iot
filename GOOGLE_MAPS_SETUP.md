# Google Maps Configuration Guide

This guide explains how to configure Google Maps API for the Smart Factory IoT Dashboard.

## Overview

The application uses Google Maps through a proxy service for enhanced security and rate limiting. This architecture provides:

- **Security**: API keys are not exposed to the client
- **Rate Limiting**: Centralized control over API usage
- **Cost Management**: Better tracking and optimization of API calls
- **Flexibility**: Easy to switch providers or implement caching

## Architecture

```
Client (Browser)
    ↓
Frontend Maps Component (VITE_FRONTEND_FORGE_API_KEY)
    ↓
Maps Proxy Service (forge.butterfly-effect.dev)
    ↓
Google Maps API
```

## Configuration Steps

### 1. Obtain API Keys

#### For Maps Proxy Service

The application uses a maps proxy service to securely communicate with Google Maps API.

**Option A: Use Existing Proxy Service**

If you have access to an existing maps proxy service:

```bash
# Set these environment variables
BUILT_IN_FORGE_API_URL="https://your-proxy-service.com"
BUILT_IN_FORGE_API_KEY="your-proxy-api-key"
VITE_FRONTEND_FORGE_API_URL="https://your-proxy-service.com"
VITE_FRONTEND_FORGE_API_KEY="your-frontend-proxy-key"
```

**Option B: Set Up Your Own Proxy**

If you need to set up your own Google Maps proxy:

1. Create a Google Cloud project
2. Enable the Google Maps APIs:
   - Maps JavaScript API
   - Geocoding API
   - Directions API
   - Distance Matrix API
   - Places API
   - Elevation API
   - Time Zone API
   - Roads API

3. Create an API key for the proxy service
4. Deploy a proxy service that:
   - Accepts requests at `/v1/maps/proxy/*`
   - Authenticates with your Google Maps API key
   - Forwards requests to Google Maps API
   - Implements rate limiting and caching

### 2. Update Environment Variables

Edit your `.env` file:

```bash
# Backend Maps Configuration
BUILT_IN_FORGE_API_URL="https://forge.butterfly-effect.dev"
BUILT_IN_FORGE_API_KEY="your-api-key-here"

# Frontend Maps Configuration
VITE_FRONTEND_FORGE_API_URL="https://forge.butterfly-effect.dev"
VITE_FRONTEND_FORGE_API_KEY="your-frontend-api-key-here"
```

### 3. Verify Configuration

#### Check Backend Configuration

```bash
# The server will validate configuration on startup
# Look for this message in server logs:
# [OAuth] Initialized with baseURL: https://forge.butterfly-effect.dev
```

#### Check Frontend Configuration

The frontend will log warnings if configuration is missing:

```javascript
// If VITE_FRONTEND_FORGE_API_KEY is not set, you'll see:
// [Maps] Warning: VITE_FRONTEND_FORGE_API_KEY is not configured
```

## API Endpoints

The application uses the following Google Maps API endpoints through the proxy:

### Geocoding
```
GET /v1/maps/proxy/maps/api/geocode/json
Parameters: address, latlng
```

### Directions
```
GET /v1/maps/proxy/maps/api/directions/json
Parameters: origin, destination, mode, waypoints
```

### Distance Matrix
```
GET /v1/maps/proxy/maps/api/distancematrix/json
Parameters: origins, destinations, mode, units
```

### Places Search
```
GET /v1/maps/proxy/maps/api/place/textsearch/json
Parameters: query, location, radius, type
```

### Nearby Search
```
GET /v1/maps/proxy/maps/api/place/nearbysearch/json
Parameters: location, radius, type, keyword
```

### Place Details
```
GET /v1/maps/proxy/maps/api/place/details/json
Parameters: place_id, fields
```

### Elevation
```
GET /v1/maps/proxy/maps/api/elevation/json
Parameters: locations, path, samples
```

### Time Zone
```
GET /v1/maps/proxy/maps/api/timezone/json
Parameters: location, timestamp
```

## Usage Examples

### Backend Usage

```typescript
import { makeRequest, GeocodingResult } from "@/_core/map";

// Geocode an address
const result = await makeRequest<GeocodingResult>(
  "/maps/api/geocode/json",
  { address: "1600 Amphitheatre Parkway, Mountain View, CA" }
);

const location = result.results[0].geometry.location;
console.log(`Latitude: ${location.lat}, Longitude: ${location.lng}`);
```

### Frontend Usage

```typescript
import { MapView } from "@/components/Map";

export function MyComponent() {
  return (
    <MapView
      initialCenter={{ lat: 37.7749, lng: -122.4194 }}
      initialZoom={12}
      onMapReady={(map) => {
        // Map is ready, add markers, etc.
        new google.maps.marker.AdvancedMarkerElement({
          map,
          position: { lat: 37.7749, lng: -122.4194 },
          title: "San Francisco",
        });
      }}
    />
  );
}
```

## Troubleshooting

### "Invalid URL" Error

**Cause**: Environment variables are not configured

**Solution**:
1. Check that `.env` file exists in the project root
2. Verify `VITE_OAUTH_PORTAL_URL` and `VITE_APP_ID` are set
3. Restart the development server

### Map Not Loading

**Cause**: Google Maps script failed to load

**Solution**:
1. Check browser console for error messages
2. Verify `VITE_FRONTEND_FORGE_API_KEY` is set correctly
3. Ensure the proxy service is accessible
4. Check network tab for failed requests

### API Quota Exceeded

**Cause**: Too many API requests

**Solution**:
1. Implement request caching in the proxy service
2. Add rate limiting
3. Monitor API usage in Google Cloud Console
4. Consider upgrading your API plan

### CORS Errors

**Cause**: Proxy service not configured for CORS

**Solution**:
1. Ensure proxy service includes proper CORS headers
2. Add your domain to the CORS allowlist
3. Use credentials: "include" in fetch requests

## Security Best Practices

1. **Never expose API keys in client code**
   - Always use the proxy service
   - Keep backend API keys in `.env` only

2. **Implement rate limiting**
   - Limit requests per user/IP
   - Cache results when possible

3. **Validate all inputs**
   - Sanitize address and location inputs
   - Validate coordinates are within expected ranges

4. **Monitor API usage**
   - Set up billing alerts
   - Review API usage regularly
   - Implement request logging

5. **Use HTTPS in production**
   - Always use HTTPS for API calls
   - Enable SSL/TLS on proxy service

## Cost Optimization

1. **Implement Caching**
   - Cache geocoding results
   - Cache place details
   - Use Redis or similar for distributed caching

2. **Batch Requests**
   - Use Distance Matrix API for multiple origin-destination pairs
   - Combine multiple queries when possible

3. **Use Appropriate Libraries**
   - Use Geocoding API instead of Places API when possible
   - Use Directions API instead of Distance Matrix when appropriate

4. **Monitor and Optimize**
   - Review API usage in Google Cloud Console
   - Identify high-cost operations
   - Implement alternative solutions for expensive operations

## Additional Resources

- [Google Maps API Documentation](https://developers.google.com/maps/documentation)
- [Google Cloud Console](https://console.cloud.google.com)
- [Maps JavaScript API Reference](https://developers.google.com/maps/documentation/javascript/reference)
- [Places API Documentation](https://developers.google.com/maps/documentation/places/web-service/overview)
