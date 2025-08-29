#!/usr/bin/env node

/**
 * Databricks Apps Environment Verification Script
 * This script validates that the app is properly configured for Databricks Apps deployment
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  log('\n' + '='.repeat(60), 'blue');
  log(` ${message}`, 'blue');
  log('='.repeat(60), 'blue');
}

function logSection(message) {
  log(`\n${message}`, 'cyan');
  log('-'.repeat(message.length));
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Check if running in Databricks Apps environment
function checkDatabricksAppsEnvironment() {
  logSection('Checking Databricks Apps Environment');
  
  // Check if we're in a browser-like environment
  if (typeof window !== 'undefined') {
    const databricks = window.databricks;
    if (databricks) {
      logSuccess('Databricks Apps context detected');
      logInfo(`Version: ${databricks.version || 'Unknown'}`);
      logInfo(`Workspace: ${databricks.workspace || 'Unknown'}`);
      logInfo(`User: ${databricks.user || 'Unknown'}`);
      return true;
    } else {
      logWarning('Not running in Databricks Apps context');
      return false;
    }
  } else {
    logInfo('Running in Node.js environment (server-side)');
    return false;
  }
}

// Validate app.yaml configuration
function validateAppYaml() {
  logSection('Validating app.yaml Configuration');
  
  const appYamlPath = path.join(process.cwd(), 'app.yaml');
  
  if (!fs.existsSync(appYamlPath)) {
    logError('app.yaml not found');
    return false;
  }
  
  try {
    const appYamlContent = fs.readFileSync(appYamlPath, 'utf8');
    
    // Check required fields
    const requiredFields = ['name', 'display_name', 'description', 'permissions'];
    let hasAllFields = true;
    
    requiredFields.forEach(field => {
      if (appYamlContent.includes(`${field}:`)) {
        logSuccess(`Found ${field} field`);
      } else {
        logError(`Missing ${field} field`);
        hasAllFields = false;
      }
    });
    
    // Check permissions
    if (appYamlContent.includes('CAN_USE_CATALOG') && 
        appYamlContent.includes('CAN_USE_SCHEMA') && 
        appYamlContent.includes('CAN_SELECT')) {
      logSuccess('Required Unity Catalog permissions found');
    } else {
      logError('Missing required Unity Catalog permissions');
      hasAllFields = false;
    }
    
    // Check environment configuration
    if (appYamlContent.includes('FEATURE_ALLOW_NO_DBRX') && 
        appYamlContent.includes('value: \'0\'')) {
      logSuccess('Proper environment enforcement configured');
    } else {
      logWarning('Environment enforcement may not be properly configured');
    }
    
    return hasAllFields;
    
  } catch (error) {
    logError(`Failed to read app.yaml: ${error.message}`);
    return false;
  }
}

// Validate package.json
function validatePackageJson() {
  logSection('Validating package.json');
  
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    logError('package.json not found');
    return false;
  }
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Check required scripts
    const requiredScripts = ['build', 'start'];
    let hasAllScripts = true;
    
    requiredScripts.forEach(script => {
      if (packageJson.scripts && packageJson.scripts[script]) {
        logSuccess(`Found ${script} script`);
      } else {
        logError(`Missing ${script} script`);
        hasAllScripts = false;
      }
    });
    
    // Check required dependencies
    const requiredDeps = ['express', 'axios', 'react', 'react-dom'];
    let hasAllDeps = true;
    
    requiredDeps.forEach(dep => {
      if (packageJson.dependencies && packageJson.dependencies[dep]) {
        logSuccess(`Found ${dep} dependency`);
      } else {
        logError(`Missing ${dep} dependency`);
        hasAllDeps = false;
      }
    });
    
    return hasAllScripts && hasAllDeps;
    
  } catch (error) {
    logError(`Failed to parse package.json: ${error.message}`);
    return false;
  }
}

// Validate build output
function validateBuildOutput() {
  logSection('Validating Build Output');
  
  const distPath = path.join(process.cwd(), 'dist');
  
  if (!fs.existsSync(distPath)) {
    logError('dist directory not found - run npm run build first');
    return false;
  }
  
  const requiredFiles = ['index.html', 'assets'];
  let hasAllFiles = true;
  
  requiredFiles.forEach(file => {
    const filePath = path.join(distPath, file);
    if (fs.existsSync(filePath)) {
      logSuccess(`Found ${file}`);
    } else {
      logError(`Missing ${file}`);
      hasAllFiles = false;
    }
  });
  
  // Check if assets directory has content
  const assetsPath = path.join(distPath, 'assets');
  if (fs.existsSync(assetsPath)) {
    const assets = fs.readdirSync(assetsPath);
    if (assets.length > 0) {
      logSuccess(`Assets directory contains ${assets.length} files`);
    } else {
      logWarning('Assets directory is empty');
    }
  }
  
  return hasAllFiles;
}

// Validate server configuration
function validateServerConfig() {
  logSection('Validating Server Configuration');
  
  const serverPath = path.join(process.cwd(), 'server.js');
  
  if (!fs.existsSync(serverPath)) {
    logError('server.js not found');
    return false;
  }
  
  try {
    const serverContent = fs.readFileSync(serverPath, 'utf8');
    
    // Check for required middleware and routes
    const requiredFeatures = [
      '/api/databricks',
      'createProxyMiddleware',
      'getUserToken',
      'isDatabricksApps'
    ];
    
    let hasAllFeatures = true;
    requiredFeatures.forEach(feature => {
      if (serverContent.includes(feature)) {
        logSuccess(`Found ${feature}`);
      } else {
        logError(`Missing ${feature}`);
        hasAllFeatures = false;
      }
    });
    
    return hasAllFeatures;
    
  } catch (error) {
    logError(`Failed to read server.js: ${error.message}`);
    return false;
  }
}

// Generate deployment checklist
function generateDeploymentChecklist() {
  logSection('Deployment Checklist');
  
  logInfo('Before deploying to Databricks Apps:');
  log('1. Ensure you have Databricks CLI installed and authenticated', 'blue');
  log('2. Verify your workspace has Apps feature enabled', 'blue');
  log('3. Confirm you have Unity Catalog access permissions', 'blue');
  log('4. Build the application: npm run build', 'blue');
  log('5. Deploy using: ./scripts/deploy-databricks-app.sh', 'blue');
  log('6. Launch the app from your Databricks workspace Apps menu', 'blue');
  
  logInfo('\nAfter deployment:');
  log('1. Check browser console for Databricks Apps context validation', 'blue');
  log('2. Verify Unity Catalog permissions are working', 'blue');
  log('3. Test SQL query execution', 'blue');
  log('4. Monitor app logs for any errors', 'blue');
}

// Main verification function
function main() {
  logHeader('DATABRICKS APPS ENVIRONMENT VERIFICATION');
  
  let allChecksPassed = true;
  
  // Run all validation checks
  const checks = [
    { name: 'App YAML Configuration', fn: validateAppYaml },
    { name: 'Package.json', fn: validatePackageJson },
    { name: 'Build Output', fn: validateBuildOutput },
    { name: 'Server Configuration', fn: validateServerConfig }
  ];
  
  checks.forEach(check => {
    try {
      const result = check.fn();
      if (!result) {
        allChecksPassed = false;
      }
    } catch (error) {
      logError(`${check.name} check failed: ${error.message}`);
      allChecksPassed = false;
    }
  });
  
  // Environment check (only if running in browser)
  if (typeof window !== 'undefined') {
    try {
      const envResult = checkDatabricksAppsEnvironment();
      if (!envResult) {
        allChecksPassed = false;
      }
    } catch (error) {
      logError(`Environment check failed: ${error.message}`);
      allChecksPassed = false;
    }
  }
  
  // Final summary
  logHeader('VERIFICATION SUMMARY');
  
  if (allChecksPassed) {
    logSuccess('All checks passed! Your app is ready for Databricks Apps deployment.');
    generateDeploymentChecklist();
  } else {
    logError('Some checks failed. Please fix the issues before deploying.');
    logInfo('Run this script again after making the necessary changes.');
  }
  
  logHeader('TROUBLESHOOTING TIPS');
  logInfo('If you encounter issues:');
  log('• Check the browser console for detailed error messages', 'blue');
  log('• Verify the app has the required Unity Catalog permissions', 'blue');
  log('• Ensure you\'re launching from within the Databricks workspace', 'blue');
  log('• Contact your workspace admin if problems persist', 'blue');
  log('• Never run this app on localhost - it must be a Databricks App', 'blue');
}

// Run the verification
if (import.meta.url.includes(process.argv[1].replace(/\\/g, '/')) || 
    import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  main();
}

export {
  checkDatabricksAppsEnvironment,
  validateAppYaml,
  validatePackageJson,
  validateBuildOutput,
  validateServerConfig
};
