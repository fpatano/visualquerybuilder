/**
 * Databricks Apps Context Detection and Validation
 * This module ensures the app is running in the proper Databricks Apps environment
 */

export interface DatabricksContext {
  isAvailable: boolean;
  version?: string;
  workspace?: string;
  user?: string;
  permissions?: string[];
  environment: 'databricks-apps' | 'localhost' | 'unknown';
  warnings: string[];
  errors: string[];
}

/**
 * Comprehensive check for Databricks Apps context
 */
export function checkDatabricksContext(): DatabricksContext {
  const context: DatabricksContext = {
    isAvailable: false,
    environment: 'unknown',
    warnings: [],
    errors: []
  };

  console.log('🔍 Checking Databricks Apps context...');

  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    context.errors.push('Not running in browser environment');
    console.error('❌ Not running in browser environment');
    return context;
  }

  // Check for Databricks Apps context
  const databricks = (window as any).databricks;
  if (databricks) {
    console.log('✅ Databricks Apps context detected:', databricks);
    context.isAvailable = true;
    context.environment = 'databricks-apps';
    
    // Extract available information
    if (databricks.version) {
      context.version = databricks.version;
      console.log(`📋 Databricks Apps version: ${databricks.version}`);
    }
    
    if (databricks.workspace) {
      context.workspace = databricks.workspace;
      console.log(`🏢 Workspace: ${databricks.workspace}`);
    }
    
    if (databricks.user) {
      context.user = databricks.user;
      console.log(`👤 User: ${databricks.user}`);
    }
    
    if (databricks.permissions) {
      context.permissions = databricks.permissions;
      console.log(`🔑 Permissions: ${databricks.permissions.join(', ')}`);
    }
    
    // Validate required permissions
    const requiredPermissions = ['CAN_USE_CATALOG', 'CAN_USE_SCHEMA', 'CAN_SELECT'];
    const missingPermissions = requiredPermissions.filter(p => !context.permissions?.includes(p));
    
    if (missingPermissions.length > 0) {
      context.warnings.push(`Missing required permissions: ${missingPermissions.join(', ')}`);
      console.warn(`⚠️ Missing required permissions: ${missingPermissions.join(', ')}`);
    } else {
      console.log('✅ All required permissions are available');
    }
    
  } else {
    // Check if we're running on localhost
    const hostname = window.location.hostname;
    const port = window.location.port;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1' || port === '3000' || port === '5173') {
      context.environment = 'localhost';
      context.errors.push('Running on localhost - this app must be deployed as a Databricks App');
      console.error('❌ Running on localhost - this app must be deployed as a Databricks App');
      console.error('❌ To fix: Deploy the app via Databricks Apps and launch from the workspace UI');
    } else {
      context.environment = 'unknown';
      context.errors.push('Databricks Apps context not available');
      console.error('❌ Databricks Apps context not available');
    }
    
    // Log browser details for debugging
    console.error('🌐 Browser Details:');
    console.error(`  - URL: ${window.location.href}`);
    console.error(`  - Hostname: ${hostname}`);
    console.error(`  - Port: ${port}`);
    console.error(`  - User Agent: ${navigator.userAgent}`);
    console.error(`  - Protocol: ${window.location.protocol}`);
  }

  // Log final context status
  if (context.isAvailable) {
    console.log('🎉 Databricks Apps context is valid and ready!');
  } else {
    console.error('💥 Databricks Apps context validation failed');
    console.error('📋 Context Summary:', context);
  }

  return context;
}

/**
 * Validate that the app can make Unity Catalog API calls
 */
export function validateUnityCatalogAccess(): boolean {
  const context = checkDatabricksContext();
  
  if (!context.isAvailable) {
    console.error('❌ Cannot access Unity Catalog - not in Databricks Apps context');
    return false;
  }
  
  // Check if we have the required permissions for Unity Catalog
  const hasCatalogAccess = context.permissions?.includes('CAN_USE_CATALOG') || false;
  const hasSchemaAccess = context.permissions?.includes('CAN_USE_SCHEMA') || false;
  
  if (!hasCatalogAccess || !hasSchemaAccess) {
    console.error('❌ Insufficient permissions for Unity Catalog access');
    console.error(`  - CAN_USE_CATALOG: ${hasCatalogAccess ? '✅' : '❌'}`);
    console.error(`  - CAN_USE_SCHEMA: ${hasSchemaAccess ? '✅' : '❌'}`);
    return false;
  }
  
  console.log('✅ Unity Catalog access validated');
  return true;
}

/**
 * Get environment-specific configuration
 */
export function getEnvironmentConfig() {
  const context = checkDatabricksContext();
  
  return {
    isDatabricksApps: context.isAvailable,
    environment: context.environment,
    apiBase: context.isAvailable ? '/api/databricks' : null,
    canUseUnityCatalog: validateUnityCatalogAccess(),
    context
  };
}

/**
 * Log comprehensive environment information for debugging
 */
export function logEnvironmentInfo() {
  console.log('🔍 === DATABRICKS APPS ENVIRONMENT DEBUG ===');
  
  const context = checkDatabricksContext();
  const config = getEnvironmentConfig();
  
  console.log('📊 Environment Summary:');
  console.log(`  - Databricks Apps: ${config.isDatabricksApps ? '✅' : '❌'}`);
  console.log(`  - Environment: ${config.environment}`);
  console.log(`  - Unity Catalog Access: ${config.canUseUnityCatalog ? '✅' : '❌'}`);
  console.log(`  - API Base: ${config.apiBase || 'N/A'}`);
  
  if (context.warnings.length > 0) {
    console.log('⚠️ Warnings:', context.warnings);
  }
  
  if (context.errors.length > 0) {
    console.log('❌ Errors:', context.errors);
  }
  
  console.log('🔍 === END DEBUG INFO ===');
}
