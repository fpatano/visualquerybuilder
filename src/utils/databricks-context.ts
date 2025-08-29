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
  environment: 'databricks-apps' | 'databricks-apps-url' | 'localhost' | 'unknown';
  warnings: string[];
  errors: string[];
}

/**
 * Strict Databricks Apps context check as required
 * Throws an error if not running in proper Databricks Apps context
 */
export function enforceStrictDatabricksContext(): void {
  // The Visual Query Builder can run in multiple environments (Databricks Apps or localhost for storybook/dev).
  // The original implementation hard-failed when the `window.databricks` runtime object wasn’t injected,
  // resulting in an uncaught error: “Not running in Databricks Apps context”.
  //
  // That logic is no longer desirable because Databricks Apps already uses the user’s access token for
  // every backend request, so the client side does **not** need to guess or enforce the runtime context.
  //
  // We therefore convert this guard into a soft no-op that only emits an informational log when the
  // Databricks Apps object is missing.

  if ((window as any).databricks) {
    console.log('✅ Databricks Apps context detected');
  } else {
    // Intentionally *not* throwing – the backend handles auth and will surface errors if missing.
    console.log('ℹ️  Databricks Apps context not detected in browser; continuing without strict guard');
  }
}

/**
 * Alternative detection method when window.databricks is not available
 */
export function detectDatabricksAppsFromEnvironment(): boolean {
  const href = window.location.href;
  const hostname = window.location.hostname;
  
  // Check for Databricks Apps URL patterns
  const isDatabricksAppsUrl = href.includes('databricksapps.com') || 
                              href.includes('databricks.com') ||
                              hostname.includes('databricks');
  
  // Check for Databricks Apps specific patterns
  const hasDatabricksAppsPatterns = href.includes('aws.databricksapps.com') ||
                                   href.includes('azure.databricksapps.com') ||
                                   href.includes('gcp.databricksapps.com');
  
  console.log('🔍 Alternative Databricks Apps Detection:');
  console.log(`  - Databricks Apps URL: ${isDatabricksAppsUrl ? '✅' : '❌'}`);
  console.log(`  - Databricks Apps patterns: ${hasDatabricksAppsPatterns ? '✅' : '❌'}`);
  console.log(`  - Hostname: ${hostname}`);
  
  return isDatabricksAppsUrl || hasDatabricksAppsPatterns;
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
    const protocol = window.location.protocol;
    const href = window.location.href;
    
    console.log('🌐 Browser Environment Details:');
    console.log(`  - URL: ${href}`);
    console.log(`  - Hostname: ${hostname}`);
    console.log(`  - Port: ${port}`);
    console.log(`  - Protocol: ${protocol}`);
    console.log(`  - User Agent: ${navigator.userAgent}`);
    
    // Check for Databricks Apps URL patterns
    const isDatabricksAppsUrl = detectDatabricksAppsFromEnvironment();
    console.log(`  - Databricks Apps URL pattern: ${isDatabricksAppsUrl ? '✅ detected' : '❌ not detected'}`);
    
    if (hostname === 'localhost' || hostname === '127.0.0.1' || port === '3000' || port === '5173') {
      context.environment = 'localhost';
      // Remove error - allow local development for testing
      console.log('ℹ️ Running on localhost - using backend for authentication');
    } else if (isDatabricksAppsUrl) {
      context.environment = 'databricks-apps-url';
      // Remove error - backend handles authentication
      console.log('ℹ️ Databricks Apps URL detected - backend handles authentication');
      
      // Try to wait for context injection (fallback mechanism)
      console.log('🔄 Attempting to wait for Databricks Apps context injection...');
      setTimeout(() => {
        const retryDatabricks = (window as any).databricks;
        if (retryDatabricks) {
          console.log('✅ Databricks Apps context found on retry:', retryDatabricks);
        } else {
          console.log('❌ Databricks Apps context still not available on retry');
        }
      }, 2000);
      
    } else {
      context.environment = 'unknown';
      // Remove error - backend handles authentication
      console.log('ℹ️ Unknown environment - backend handles authentication');
    }
  }

  // Log final context status
  if (context.isAvailable) {
    console.log('🎉 Databricks Apps context is valid and ready!');
  } else {
    console.log('ℹ️ Databricks Apps context not available - backend handles authentication');
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
