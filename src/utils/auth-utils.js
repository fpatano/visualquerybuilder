/**
 * Authentication utilities for Visual SQL Query Builder
 * Handles both local development and Databricks Apps environments
 */

/**
 * Extract user token from request headers
 * In Databricks Apps: token comes from forwarded header
 * In local development: use personal access token from env
 */
export function getUserToken(req) {
  // In Databricks Apps - token comes from forwarded header
  if (process.env.DATABRICKS_SERVER_HOSTNAME) {
    const token = req.header('x-forwarded-access-token');
    if (!token) {
      throw new Error('No access token found in Databricks Apps environment');
    }
    return token;
  }
  
  // Local development - use personal access token from env
  if (!process.env.DATABRICKS_TOKEN) {
    throw new Error('DATABRICKS_TOKEN environment variable is required for local development');
  }
  
  return process.env.DATABRICKS_TOKEN;
}

/**
 * Check if running in Databricks Apps environment
 */
export function isDatabricksApps() {
  return !!process.env.DATABRICKS_SERVER_HOSTNAME;
}

/**
 * Get appropriate Databricks host for the environment
 */
export function getDatabricksHost() {
  // In Databricks Apps, use the server hostname
  if (process.env.DATABRICKS_SERVER_HOSTNAME) {
    return process.env.DATABRICKS_SERVER_HOSTNAME;
  }
  
  // Local development, use the configured host
  return process.env.DATABRICKS_HOST;
}

/**
 * Get appropriate HTTP path for the environment
 */
export function getDatabricksHttpPath() {
  // In Databricks Apps, construct from workspace and warehouse
  if (process.env.DATABRICKS_SERVER_HOSTNAME && process.env.DATABRICKS_WAREHOUSE_ID) {
    return `/sql/1.0/warehouses/${process.env.DATABRICKS_WAREHOUSE_ID}`;
  }
  
  // Local development, use the configured path
  return process.env.DATABRICKS_HTTP_PATH || `/sql/1.0/warehouses/${process.env.DATABRICKS_WAREHOUSE_ID}`;
}

/**
 * Validate that required environment variables are set for the current environment
 */
export function validateAuthEnvironment() {
  if (isDatabricksApps()) {
    // In Databricks Apps, we need warehouse ID and server hostname
    if (!process.env.DATABRICKS_WAREHOUSE_ID) {
      throw new Error('DATABRICKS_WAREHOUSE_ID is required in Databricks Apps environment');
    }
    if (!process.env.DATABRICKS_SERVER_HOSTNAME) {
      throw new Error('DATABRICKS_SERVER_HOSTNAME is required in Databricks Apps environment');
    }
  } else {
    // Local development needs host, token, and warehouse ID
    if (!process.env.DATABRICKS_HOST) {
      throw new Error('DATABRICKS_HOST is required for local development');
    }
    if (!process.env.DATABRICKS_TOKEN) {
      throw new Error('DATABRICKS_TOKEN is required for local development');
    }
    if (!process.env.DATABRICKS_WAREHOUSE_ID) {
      throw new Error('DATABRICKS_WAREHOUSE_ID is required for local development');
    }
  }
  
  return true;
}

/**
 * Log authentication environment info (without sensitive data)
 */
export function logAuthEnvironment() {
  console.log('🔐 Authentication Environment:');
  console.log(`  - Environment: ${isDatabricksApps() ? 'Databricks Apps' : 'Local Development'}`);
  console.log(`  - Host: ${getDatabricksHost()}`);
  console.log(`  - HTTP Path: ${getDatabricksHttpPath()}`);
  console.log(`  - Warehouse ID: ${process.env.DATABRICKS_WAREHOUSE_ID}`);
  
  if (isDatabricksApps()) {
    console.log('  - Token Source: x-forwarded-access-token header');
  } else {
    console.log('  - Token Source: DATABRICKS_TOKEN environment variable');
  }
}
