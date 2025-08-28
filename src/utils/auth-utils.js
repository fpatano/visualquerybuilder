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
  // Check if this request has Databricks Apps headers
  const isRequestFromDatabricksApps = req.isDatabricksApps;
  
  console.log('🔍 Token Detection:');
  console.log(`  - Request has Databricks Apps headers: ${isRequestFromDatabricksApps}`);
  console.log(`  - Environment detection: ${isDatabricksApps()}`);
  
  // In Databricks Apps - token comes from forwarded header
  if (isRequestFromDatabricksApps) {
    const token = req.header('x-forwarded-access-token');
    if (!token) {
      console.error('❌ No x-forwarded-access-token header found in Databricks Apps environment');
      console.error('📋 Available headers:', Object.keys(req.headers));
      throw new Error('No access token found in Databricks Apps environment');
    }
    console.log('✅ Using x-forwarded-access-token from Databricks Apps');
    return token;
  }
  
  // Local development - use personal access token from env
  if (!process.env.DATABRICKS_TOKEN) {
    throw new Error('DATABRICKS_TOKEN environment variable is required for local development');
  }
  
  console.log('🌐 Using DATABRICKS_TOKEN from environment for local development');
  return process.env.DATABRICKS_TOKEN;
}

/**
 * Check if running in Databricks Apps environment
 */
export function isDatabricksApps() {
  // Check for Databricks Apps runtime variables
  const hasServerHostname = !!process.env.DATABRICKS_SERVER_HOSTNAME;
  const hasAppPort = !!process.env.DATABRICKS_APP_PORT;
  const hasBasePath = !!process.env.APP_BASE_PATH;
  
  // Alternative detection methods using variables that are actually available
  const hasWarehouseId = !!process.env.DATABRICKS_WAREHOUSE_ID;
  const hasWorkspaceId = !!process.env.DATABRICKS_WORKSPACE_ID;
  const hasDatabricksHost = !!process.env.DATABRICKS_HOST;
  const isProduction = process.env.NODE_ENV === 'production';
  const hasPort = !!process.env.PORT;
  
  // Log detection details for debugging
  console.log('🔍 Databricks Apps Detection:');
  console.log(`  - DATABRICKS_SERVER_HOSTNAME: ${process.env.DATABRICKS_SERVER_HOSTNAME || 'not set'}`);
  console.log(`  - DATABRICKS_APP_PORT: ${process.env.DATABRICKS_APP_PORT || 'not set'}`);
  console.log(`  - APP_BASE_PATH: ${process.env.APP_BASE_PATH || 'not set'}`);
  console.log(`  - DATABRICKS_WAREHOUSE_ID: ${process.env.DATABRICKS_WAREHOUSE_ID || 'not set'}`);
  console.log(`  - DATABRICKS_WORKSPACE_ID: ${process.env.DATABRICKS_WORKSPACE_ID || 'not set'}`);
  console.log(`  - DATABRICKS_HOST: ${process.env.DATABRICKS_HOST || 'not set'}`);
  console.log(`  - NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  console.log(`  - PORT: ${process.env.PORT || 'not set'}`);
  
  // Primary detection: explicit runtime variables
  if (hasServerHostname && hasAppPort) {
    console.log('✅ Detected via runtime variables');
    return true;
  }
  
  // Secondary detection: production environment with Databricks-specific variables
  if (isProduction && hasWarehouseId && hasWorkspaceId && hasDatabricksHost) {
    console.log('✅ Detected via production + Databricks variables');
    return true;
  }
  
  // Fallback: if we have Databricks-specific variables and are in production, assume Databricks Apps
  if (hasWarehouseId && hasWorkspaceId && isProduction) {
    console.log('✅ Detected via warehouse + workspace + production environment (fallback)');
    return true;
  }
  
  console.log('❌ Not detected as Databricks Apps environment');
  return false;
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
