# Authentication System for Visual SQL Query Builder

This document explains how the Visual SQL Query Builder handles user authentication for both local development and Databricks Apps deployment.

## 🔐 Overview

The authentication system automatically adapts to your environment:
- **Local Development**: Uses personal access tokens from environment variables
- **Databricks Apps**: Automatically uses forwarded user tokens from the runtime

## 🏗️ Architecture

### Authentication Flow

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client App    │───▶│   Express Server │───▶│  Databricks API │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │  Auth Utils     │
                       │  - Token Extract│
                       │  - Env Detection│
                       └──────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │ Database Utils   │
                       │ - Connection     │
                       │ - Query Exec     │
                       └──────────────────┘
```

### Key Components

1. **`src/utils/auth-utils.js`** - Token extraction and environment detection
2. **`src/utils/db-connection.js`** - Database connections using user tokens
3. **Updated `server.js`** - All endpoints now use user authentication
4. **Test scripts** - Verification of authentication functionality

## 🚀 Local Development Setup

### 1. Environment Variables

Create a `.env` file with your local Databricks credentials:

```bash
# Required for local development
DATABRICKS_HOST=https://your-workspace.cloud.databricks.com
DATABRICKS_TOKEN=your-personal-access-token
DATABRICKS_WAREHOUSE_ID=your-warehouse-id

# Optional
NODE_ENV=development
LOG_LEVEL=debug
```

### 2. Get Your Credentials

1. **Workspace URL**: Copy from your browser when in Databricks
   - Example: `https://dbc-12345678-1234.cloud.databricks.com`

2. **Personal Access Token**: 
   - Databricks workspace → User Settings → Access Tokens → Generate New Token
   - **Important**: Never commit this token to version control

3. **Warehouse ID**: 
   - Databricks workspace → SQL → Warehouses → Copy ID from your warehouse

### 3. Test Authentication

```bash
# Test the authentication system
npm run test:auth

# Start the development server
npm run dev
```

## ☁️ Databricks Apps Deployment

### 1. App Configuration

When deploying to Databricks Apps, the runtime automatically provides:

- `DATABRICKS_SERVER_HOSTNAME` - Your workspace hostname
- `x-forwarded-access-token` header - User's access token for each request

### 2. Required Permissions

Ensure your app has these Unity Catalog permissions:

```yaml
permissions:
  - permission: CAN_MANAGE_CATALOG
  - permission: CAN_USE_CATALOG
  - permission: CAN_USE_SCHEMA
  - permission: CAN_SELECT
  - permission: CAN_USE_WAREHOUSE
```

### 3. User Authorization

Enable user authorization in your Databricks App settings:
- Users will be automatically authenticated
- Each request gets the user's personal access token
- No additional configuration needed

## 🔧 API Endpoints

### Authentication Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/whoami` | GET | Check user authentication status |
| `/api/config` | GET | Get environment configuration |
| `/api/warehouse/status` | GET | Check warehouse status (user-authenticated) |
| `/api/warehouse/test` | POST | Test database connectivity (user-authenticated) |

### Query Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/query` | POST | Execute SQL queries (user-authenticated) |
| `/api/databricks/2.0/sql/statements` | POST | Direct SQL execution (user-authenticated) |

### Example Usage

```bash
# Test user authentication
curl -X GET http://localhost:3000/api/whoami

# Execute a query
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT 1 as test"}'

# Check warehouse status
curl -X GET http://localhost:3000/api/warehouse/status
```

## 🧪 Testing

### Run Authentication Tests

```bash
# Test the complete authentication system
npm run test:auth

# Test with different token scenarios
TEST_FORWARDED_TOKEN=test-token npm run test:auth
```

### Test Scenarios

1. **Local Development Mode**
   - Uses `DATABRICKS_TOKEN` environment variable
   - Simulates personal access token authentication

2. **Databricks Apps Mode**
   - Uses `x-forwarded-access-token` header
   - Simulates runtime-provided user tokens

3. **Error Handling**
   - Missing tokens
   - Invalid tokens
   - Network failures

## 🔒 Security Features

### Token Security

- **Never logged**: Access tokens are never written to logs
- **Header redaction**: Authorization headers are automatically redacted
- **Secure extraction**: Tokens extracted securely from appropriate sources

### Environment Isolation

- **Local dev**: Uses environment variables
- **Production**: Uses runtime headers
- **No cross-contamination**: Clear separation between environments

### Error Handling

- **Graceful degradation**: Clear error messages for authentication failures
- **No token exposure**: Error messages never contain sensitive information
- **Proper HTTP status codes**: 401 for authentication failures, 500 for server errors

## 🚨 Troubleshooting

### Common Issues

#### 1. "No access token found in Databricks Apps environment"

**Cause**: App is running in Databricks Apps but no token header is present

**Solution**: 
- Ensure user authorization is enabled in your app settings
- Check that users have proper permissions
- Verify the app is deployed with correct scopes

#### 2. "DATABRICKS_TOKEN environment variable is required for local development"

**Cause**: Missing personal access token for local development

**Solution**:
```bash
# Add to your .env file
DATABRICKS_TOKEN=your-actual-token-here
```

#### 3. "Database connection failed"

**Cause**: Authentication or network issues

**Solution**:
- Verify token validity
- Check warehouse is running
- Ensure network connectivity to Databricks

### Debug Mode

Enable debug logging to troubleshoot authentication issues:

```bash
LOG_LEVEL=debug npm start
```

### Health Checks

Use the built-in health endpoints to diagnose issues:

```bash
# Check if app is ready
curl http://localhost:3000/ready

# Check authentication status
curl http://localhost:3000/api/whoami

# Test database connectivity
curl -X POST http://localhost:3000/api/warehouse/test
```

## 📚 API Reference

### Auth Utils

```javascript
import { 
  getUserToken, 
  isDatabricksApps, 
  getDatabricksHost,
  validateAuthEnvironment,
  logAuthEnvironment 
} from './src/utils/auth-utils.js';

// Extract user token from request
const token = getUserToken(req);

// Check environment
const isApps = isDatabricksApps();

// Get appropriate host
const host = getDatabricksHost();
```

### Database Utils

```javascript
import { 
  createConnection, 
  executeQuery, 
  testConnection,
  getConnectionInfo 
} from './src/utils/db-connection.js';

// Create authenticated connection
const connection = await createConnection(req);

// Execute query with user auth
const result = await executeQuery(req, sql);

// Test connectivity
const test = await testConnection(req);
```

## 🔄 Migration Guide

### From Static Token Authentication

If you were previously using hardcoded tokens:

1. **Remove hardcoded tokens** from your code
2. **Add environment variables** for local development
3. **Update API calls** to use the new authentication system
4. **Test thoroughly** in both environments

### Example Migration

**Before (Static Token)**:
```javascript
const client = axios.create({
  baseURL: process.env.DATABRICKS_HOST,
  headers: { Authorization: `Bearer ${process.env.DATABRICKS_TOKEN}` }
});
```

**After (User Authentication)**:
```javascript
import { getUserToken, getDatabricksHost } from './src/utils/auth-utils.js';

const client = axios.create({
  baseURL: getDatabricksHost(),
  headers: { Authorization: `Bearer ${getUserToken(req)}` }
});
```

## 🎯 Best Practices

### 1. Never Hardcode Tokens

```javascript
// ❌ Bad
const token = 'dapi1234567890abcdef';

// ✅ Good
const token = getUserToken(req);
```

### 2. Use Environment-Specific Configuration

```javascript
// ❌ Bad
const host = 'https://my-workspace.cloud.databricks.com';

// ✅ Good
const host = getDatabricksHost();
```

### 3. Handle Authentication Errors Gracefully

```javascript
try {
  const token = getUserToken(req);
  // ... use token
} catch (error) {
  res.status(401).json({ 
    error: 'Authentication failed', 
    message: error.message 
  });
}
```

### 4. Log Authentication Events (Safely)

```javascript
// ❌ Bad - never log tokens
console.log('User token:', token);

// ✅ Good - log authentication events
console.log('User authenticated successfully');
console.log('Authentication source:', isDatabricksApps() ? 'Apps' : 'Local');
```

## 🚀 Deployment Checklist

### Local Development
- [ ] `.env` file created with valid credentials
- [ ] `DATABRICKS_TOKEN` set to personal access token
- [ ] `DATABRICKS_HOST` set to workspace URL
- [ ] `DATABRICKS_WAREHOUSE_ID` set to warehouse ID
- [ ] Authentication tests pass (`npm run test:auth`)

### Databricks Apps
- [ ] App deployed with user authorization enabled
- [ ] Required permissions configured in `app.yaml`
- [ ] App accessible to target users
- [ ] Health endpoints responding correctly
- [ ] Authentication working in production

## 📞 Support

For authentication issues:

1. **Check logs** for detailed error messages
2. **Run tests** with `npm run test:auth`
3. **Verify environment** variables and configuration
4. **Test connectivity** with health endpoints
5. **Review permissions** for your Databricks workspace

---

**🎉 Your Visual SQL Query Builder now has enterprise-grade user authentication that works seamlessly in both local development and Databricks Apps environments!**
