# Service Principal Setup Guide

This guide will help you set up service principal authentication for your Visual SQL Query Builder app in Databricks Apps.

## Prerequisites

1. **Admin access** to your Databricks workspace
2. **Personal access token** with admin privileges
3. **Your Databricks workspace URL**

## Method 1: Automated Setup (Recommended)

Run the automated setup script:

```bash
node get-service-principal.js
```

The script will:
1. Ask for your workspace URL and personal access token
2. Create a service principal automatically
3. Generate a token for the service principal
4. Display the configuration values for your `.env` file

## Method 2: Manual Setup

### Step 1: Create Service Principal

1. Go to your Databricks workspace
2. Navigate to **Settings** → **Service Principals**
3. Click **Add Service Principal**
4. Fill in the details:
   - **Name**: `visual-query-builder-sp`
   - **Description**: `Service principal for Visual SQL Query Builder app`
5. Click **Add**

### Step 2: Create Token for Service Principal

1. In the Service Principals list, find your newly created service principal
2. Click on it to view details
3. Go to the **Tokens** tab
4. Click **Generate New Token**
5. Set:
   - **Comment**: `Token for Visual Query Builder app`
   - **Lifetime**: `365 days` (or as needed)
6. Click **Generate**
7. **Copy the token value** (you won't see it again!)

### Step 3: Get Service Principal Details

1. In the Service Principal details, note the **Application ID** (this is your `DATABRICKS_CLIENT_ID`)
2. The token you generated is your `DATABRICKS_CLIENT_SECRET`

### Step 4: Get Workspace ID

Your workspace ID is the part of your workspace URL after `dbc-` and before `.cloud.databricks.com`.

For example:
- URL: `https://dbc-fe7b006c-c783.cloud.databricks.com/`
- Workspace ID: `fe7b006c-c783`

## Update Your .env File

Replace the placeholder values in your `.env` file with the actual credentials:

```bash
# Replace these values with your actual service principal credentials
DATABRICKS_CLIENT_ID=your-actual-client-id
DATABRICKS_CLIENT_SECRET=your-actual-client-secret
DATABRICKS_WORKSPACE_ID=fe7b006c-c783
```

## Test the Configuration

1. Start your server:
   ```bash
   node server.js
   ```

2. Test the bootstrap endpoint:
   ```bash
   curl http://localhost:3000/api/catalog/bootstrap
   ```

3. You should see a successful response with catalog data.

## Troubleshooting

### Error: "Service principal token request failed: 403 - should_change_password"

This means the service principal's password needs to be changed. You can:

1. **Reset the service principal password** in the Databricks UI
2. **Create a new token** for the service principal
3. **Update your .env file** with the new token

### Error: "Authentication failed"

1. Verify your `DATABRICKS_CLIENT_ID` and `DATABRICKS_CLIENT_SECRET` are correct
2. Ensure the service principal has the necessary permissions
3. Check that `USE_SERVICE_PRINCIPAL=1` is set in your `.env` file

### Error: "Warehouse not found"

1. Verify your `DATABRICKS_WAREHOUSE_ID` is correct
2. Ensure the service principal has access to the warehouse
3. Check that the warehouse is running

## Permissions Required

Your service principal needs these permissions:

- **Workspace access**
- **SQL warehouse access** (for the specific warehouse you're using)
- **Unity Catalog access** (for catalog browsing)
- **Cluster creation** (if you plan to use clusters)

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit your `.env` file** to version control
2. **Store credentials securely** (use environment variables in production)
3. **Rotate tokens regularly** (recommended: every 90 days)
4. **Use least privilege** (only grant necessary permissions)
5. **Monitor service principal usage** in Databricks audit logs

## Deployment to Databricks Apps

When deploying to Databricks Apps:

1. Set the environment variables in your Databricks Apps configuration
2. Ensure `USE_SERVICE_PRINCIPAL=1` is set
3. Remove the `DATABRICKS_TOKEN` variable (not needed in Databricks Apps)
4. The app will automatically use service principal authentication

## Next Steps

Once service principal authentication is working:

1. Test the full application functionality
2. Deploy to Databricks Apps
3. Monitor logs for any authentication issues
4. Set up proper monitoring and alerting
