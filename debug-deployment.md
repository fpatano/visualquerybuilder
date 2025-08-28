# Debugging Deployment Issues

## Current Problems Identified:
1. **Server 500 errors** for Unity Catalog API calls
2. **Client can't get warehouse ID** from `/api/config` endpoint
3. **Authentication failures** in proxy

## Debugging Steps:

### 1. Check Environment Variables in Deployed App
The deployed app should have these environment variables:
- `DATABRICKS_SERVER_HOSTNAME=dbc-fe7b006c-c783.cloud.databricks.com`
- `DATABRICKS_WAREHOUSE_ID=a274378bae39d2e1`
- `DATABRICKS_APP_PORT=8000`

### 2. Test Server Endpoints
Once the app is launched, test these endpoints:
- `GET /api/test` - Should return server info including environment variables
- `GET /api/config` - Should return warehouse ID and host info
- `GET /api/debug/env` - Should show all environment variables

### 3. Check Proxy Configuration
The proxy should:
- Target: `https://dbc-fe7b006c-c783.cloud.databricks.com`
- Inject Bearer token from `x-forwarded-access-token`
- Forward requests to Unity Catalog APIs

### 4. Common Issues:
- **Missing environment variables** in deployed app
- **Proxy target URL construction** failing
- **Authentication header injection** not working
- **Client-side still using old context checks**

## Expected Behavior:
1. App launches without context validation errors
2. `/api/config` returns warehouse ID
3. Unity Catalog API calls succeed (no 500 errors)
4. SQL queries execute using user authentication

## Next Steps:
1. Launch the redeployed app
2. Check browser console for new error messages
3. Test the debug endpoints
4. Verify proxy is working with proper target URL
