#!/usr/bin/env node

/**
 * Test script to verify authentication is working properly
 * This script tests both local development and Databricks Apps scenarios
 */

import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function testAuthentication() {
  console.log('🧪 Testing Authentication Flow');
  console.log('================================');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('');

  try {
    // Test 1: Health endpoint
    console.log('1️⃣ Testing health endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check passed:', healthResponse.data);
    console.log('');

    // Test 2: Configuration endpoint
    console.log('2️⃣ Testing configuration endpoint...');
    const configResponse = await axios.get(`${BASE_URL}/api/config`);
    console.log('✅ Configuration retrieved:', configResponse.data);
    console.log('');

    // Test 3: Whoami endpoint (will fail without proper auth)
    console.log('3️⃣ Testing whoami endpoint...');
    try {
      const whoamiResponse = await axios.get(`${BASE_URL}/api/whoami`);
      console.log('✅ Whoami check passed:', whoamiResponse.data);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('⚠️  Whoami check failed (expected without auth):', error.response.data);
      } else {
        console.log('❌ Whoami check failed unexpectedly:', error.message);
      }
    }
    console.log('');

    // Test 4: Test endpoint
    console.log('4️⃣ Testing test endpoint...');
    const testResponse = await axios.get(`${BASE_URL}/api/test`);
    console.log('✅ Test endpoint passed:', testResponse.data);
    console.log('');

    // Test 5: Unity Catalog test (will fail without proper auth)
    console.log('5️⃣ Testing Unity Catalog endpoint...');
    try {
      const ucResponse = await axios.get(`${BASE_URL}/api/test/unity-catalog`);
      console.log('✅ Unity Catalog test passed:', ucResponse.data);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('⚠️  Unity Catalog test failed (expected without auth):', error.response.data);
      } else {
        console.log('❌ Unity Catalog test failed unexpectedly:', error.message);
      }
    }
    console.log('');

    console.log('🎉 All basic tests completed!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('   - If running locally: Set DATABRICKS_TOKEN environment variable');
    console.log('   - If running in Databricks Apps: Ensure app is installed with "sql" scope');
    console.log('   - Check logs for detailed authentication information');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the test
testAuthentication().catch(console.error);
