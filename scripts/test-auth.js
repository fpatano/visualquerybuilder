#!/usr/bin/env node

/**
 * Test script for the Visual SQL Query Builder authentication system
 * Tests both local development and Databricks Apps scenarios
 */

import { getUserToken, isDatabricksApps, getDatabricksHost, validateAuthEnvironment, logAuthEnvironment } from '../src/utils/auth-utils.js';
import { testConnection, getConnectionInfo } from '../src/utils/db-connection.js';

// Mock request object for testing
const mockReq = {
  header: (name) => {
    if (name === 'x-forwarded-access-token') {
      return process.env.TEST_FORWARDED_TOKEN || 'test-forwarded-token';
    }
    return null;
  }
};

async function runAuthTests() {
  console.log('🧪 Testing Visual SQL Query Builder Authentication System\n');
  
  try {
    // Test 1: Environment detection
    console.log('1️⃣ Testing Environment Detection...');
    const isApps = isDatabricksApps();
    console.log(`   Environment: ${isApps ? 'Databricks Apps' : 'Local Development'}`);
    console.log(`   Host: ${getDatabricksHost()}`);
    console.log(`   Warehouse ID: ${process.env.DATABRICKS_WAREHOUSE_ID || 'Not set'}`);
    console.log('   ✅ Environment detection working\n');
    
    // Test 2: Environment validation
    console.log('2️⃣ Testing Environment Validation...');
    try {
      validateAuthEnvironment();
      console.log('   ✅ Environment validation passed\n');
    } catch (error) {
      console.log(`   ⚠️  Environment validation failed: ${error.message}\n`);
    }
    
    // Test 3: Token extraction
    console.log('3️⃣ Testing Token Extraction...');
    try {
      const token = getUserToken(mockReq);
      console.log(`   ✅ Token extracted successfully (${token.substring(0, 10)}...)`);
      console.log(`   Token source: ${isApps ? 'x-forwarded-access-token header' : 'DATABRICKS_TOKEN env var'}\n`);
    } catch (error) {
      console.log(`   ❌ Token extraction failed: ${error.message}\n`);
    }
    
    // Test 4: Connection info
    console.log('4️⃣ Testing Connection Info...');
    try {
      const connInfo = getConnectionInfo();
      console.log(`   Host: ${connInfo.host}`);
      console.log(`   Path: ${connInfo.path}`);
      console.log(`   Warehouse: ${connInfo.warehouseId}`);
      console.log(`   Environment: ${connInfo.environment}`);
      console.log('   ✅ Connection info retrieved\n');
    } catch (error) {
      console.log(`   ❌ Connection info failed: ${error.message}\n`);
    }
    
    // Test 5: Database connectivity (if environment allows)
    if (process.env.DATABRICKS_TOKEN || process.env.TEST_FORWARDED_TOKEN) {
      console.log('5️⃣ Testing Database Connectivity...');
      try {
        const result = await testConnection(mockReq);
        if (result.success) {
          console.log('   ✅ Database connection test successful');
          console.log(`   Result: ${JSON.stringify(result.result)}`);
        } else {
          console.log(`   ❌ Database connection test failed: ${result.error}`);
        }
        console.log('');
      } catch (error) {
        console.log(`   ❌ Database connection test error: ${error.message}\n`);
      }
    } else {
      console.log('5️⃣ Skipping Database Connectivity Test (no token available)\n');
    }
    
    // Test 6: Authentication logging
    console.log('6️⃣ Testing Authentication Logging...');
    try {
      logAuthEnvironment();
      console.log('   ✅ Authentication logging working\n');
    } catch (error) {
      console.log(`   ❌ Authentication logging failed: ${error.message}\n`);
    }
    
    console.log('🎉 Authentication system test completed!');
    
  } catch (error) {
    console.error('💥 Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAuthTests();
}

export { runAuthTests };
