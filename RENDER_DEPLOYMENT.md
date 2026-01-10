# Smart Factory IoT - Render Deployment Guide

This guide explains how to deploy the Smart Factory IoT backend service on Render and connect it to an Aiven MySQL database.

## Prerequisites

- Render account (https://render.com)
- Aiven account (https://aiven.io)
- GitHub repository with the Smart Factory IoT code
- Git installed locally

## Step 1: Set Up Aiven MySQL Database

### 1.1 Create an Aiven Account
1. Go to https://aiven.io and sign up
2. Create a new project

### 1.2 Create MySQL Service
1. In your Aiven project, click "Create Service"
2. Select "MySQL" as the service type
3. Choose your preferred cloud provider and region
4. Select a plan (free tier available for testing)
5. Name your service (e.g., `smart-factory-iot-db`)
6. Click "Create Service"

### 1.3 Get Connection Details
1. Once the service is running, click on it
2. Go to the "Overview" tab
3. Copy the connection string (looks like: `mysql://user:password@host:port/defaultdb`)
4. Note the username, password, host, and port

### 1.4 Create Database
1. Go to "Databases" tab
2. Click "Create Database"
3. Name it `smart_factory_iot`
4. Click "Create"

### 1.5 Get SSL Certificate (Optional but Recommended)
1. Go to "Connection info" tab
2. Download the CA certificate if needed for SSL connections

## Step 2: Deploy on Render

### 2.1 Connect GitHub Repository
1. Go to https://render.com and sign in
2. Click "New +" and select "Web Service"
3. Click "Connect a repository"
4. Select your GitHub account and the `smart-factory-iot` repository
5. Click "Connect"

### 2.2 Configure Web Service
1. **Name**: `smart-factory-iot-api` (or your preferred name)
2. **Environment**: `Node`
3. **Build Command**: `pnpm install && pnpm build`
4. **Start Command**: `pnpm start`
5. **Instance Type**: Select appropriate tier (Free tier available)

### 2.3 Set Environment Variables
1. Click "Advanced" section
2. Add the following environment variables:

```
NODE_ENV=production
PORT=3000
DATABASE_URL=mysql://user:password@your-aiven-host.aivencloud.com:3306/smart_factory_iot
JWT_SECRET=your-strong-random-secret-key
VITE_APP_ID=smart-factory-iot
VITE_APP_TITLE=Smart Factory IoT Dashboard
CORS_ORIGINS=https://your-frontend-url.com,https://druhustle.github.io
DEBUG=false
```

Replace the values with your actual Aiven credentials and desired settings.

### 2.4 Deploy
1. Click "Create Web Service"
2. Render will automatically deploy your service
3. Once deployment is complete, you'll get a URL like: `https://smart-factory-iot-api.onrender.com`

### 2.5 Verify Deployment
1. Check the deployment logs in Render dashboard
2. Test the API endpoint: `https://your-service-name.onrender.com/api/auth/login`

## Step 3: Update Frontend Configuration

### 3.1 Update Environment Variables
Update your frontend `.env` or `.env.production` file:

```
VITE_API_URL=https://your-render-service.onrender.com/api
BACKEND_URL=https://your-render-service.onrender.com
```

### 3.2 Rebuild and Deploy Frontend
1. Update your GitHub repository with the new environment variables
2. If using GitHub Pages, the deployment will automatically trigger
3. If using another hosting service, follow their deployment process

## Step 4: Database Migrations

### 4.1 Run Migrations on Aiven Database
1. Connect to your Aiven database using a MySQL client:
   ```bash
   mysql -h your-aiven-host -u user -p -D smart_factory_iot
   ```

2. Run the migration scripts from `drizzle/` directory:
   ```bash
   # Or use the migration tool
   pnpm db:push
   ```

### 4.2 Seed Demo Data
1. Update the seed script with Aiven database credentials
2. Run: `node seed-demo-accounts.mjs`

## Troubleshooting

### Connection Issues
- **Error**: `ECONNREFUSED` or `ETIMEDOUT`
  - Check if Aiven service is running
  - Verify DATABASE_URL is correct
  - Check firewall/security group settings in Aiven

### Build Failures
- **Error**: `pnpm: command not found`
  - Add `pnpm` to the build environment or use `npm` instead
  - Update build command to: `npm install && npm run build`

### Performance Issues
- Monitor Render dashboard for CPU/memory usage
- Check Aiven database performance metrics
- Consider upgrading to a higher tier if needed

## Monitoring and Maintenance

### Render Dashboard
- Monitor deployment logs
- Check service health
- View resource usage
- Set up alerts for failures

### Aiven Dashboard
- Monitor database performance
- Check connection metrics
- View backup status
- Manage user access

## Security Best Practices

1. **Never commit `.env` files** - Use environment variables in Render
2. **Use strong JWT secrets** - Generate with: `openssl rand -base64 32`
3. **Enable SSL/TLS** - Use HTTPS connections
4. **Rotate credentials regularly** - Update JWT secrets periodically
5. **Monitor access logs** - Check for suspicious activity
6. **Use VPC** - Consider Render's private networking for additional security

## Cost Considerations

- **Render**: Free tier available, paid plans start at $7/month
- **Aiven**: Free tier available, production plans start at $19/month
- Monitor usage to avoid unexpected charges

## Additional Resources

- Render Documentation: https://render.com/docs
- Aiven Documentation: https://docs.aiven.io
- Smart Factory IoT API Documentation: See `API.md`
- Authentication Guide: See `AUTHENTICATION.md`
