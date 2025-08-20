#!/usr/bin/env node

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const REQUIRED = ['NODE_ENV'];
const RECOMMENDED = [
  'PORT',
  'APP_BASE_PATH',
  'LOG_LEVEL',
  'DATABRICKS_HOST',
  'DATABRICKS_TOKEN',
  'DATABRICKS_WAREHOUSE_ID'
];

const OPTIONAL = [
  'APP_VERSION',
  'CORS_ORIGIN',
  'FEATURE_SKIP_READINESS',
  'FEATURE_ALLOW_NO_DBRX'
];

console.log('🔍 Environment Verification');
console.log('==========================\n');

let hasErrors = false;
let hasWarnings = false;

// Check required variables
console.log('✅ Required Variables:');
REQUIRED.forEach(key => {
  const value = process.env[key];
  if (!value) {
    console.log(`  ❌ ${key}: MISSING (required)`);
    hasErrors = true;
  } else {
    console.log(`  ✅ ${key}: ${value}`);
  }
});

console.log('\n📋 Recommended Variables:');
RECOMMENDED.forEach(key => {
  const value = process.env[key];
  if (!value) {
    console.log(`  ⚠️  ${key}: not set`);
    hasWarnings = true;
  } else {
    // Mask sensitive values
    const displayValue = key.includes('TOKEN') || key.includes('KEY') ? 
      `${value.substring(0, 8)}...` : value;
    console.log(`  ✅ ${key}: ${displayValue}`);
  }
});

console.log('\n🔧 Optional Variables:');
OPTIONAL.forEach(key => {
  const value = process.env[key];
  if (value) {
    console.log(`  ℹ️  ${key}: ${value}`);
  }
});

// Check Databricks connectivity requirements
console.log('\n🔗 Databricks Configuration:');
const hasHost = !!process.env.DATABRICKS_HOST;
const hasToken = !!process.env.DATABRICKS_TOKEN;
const hasWarehouse = !!process.env.DATABRICKS_WAREHOUSE_ID;

if (hasHost && hasToken) {
  console.log('  ✅ Databricks connectivity: configured');
  if (hasWarehouse) {
    console.log('  ✅ SQL Warehouse: configured');
  } else {
    console.log('  ⚠️  SQL Warehouse: not configured (query execution may fail)');
  }
} else if (process.env.FEATURE_ALLOW_NO_DBRX === '1') {
  console.log('  ℹ️  Databricks connectivity: skipped (FEATURE_ALLOW_NO_DBRX=1)');
} else {
  console.log('  ❌ Databricks connectivity: missing host or token');
  hasErrors = true;
}

// Port configuration
console.log('\n🌐 Server Configuration:');
const port = process.env.PORT || process.env.DATABRICKS_APP_PORT || 3000;
const basePath = process.env.APP_BASE_PATH || '/';
console.log(`  ℹ️  Port: ${port}`);
console.log(`  ℹ️  Base Path: ${basePath}`);
console.log(`  ℹ️  Log Level: ${process.env.LOG_LEVEL || 'info'}`);

// Summary
console.log('\n📊 Summary:');
if (hasErrors) {
  console.log('  ❌ Configuration has ERRORS - deployment may fail');
  process.exit(1);
} else if (hasWarnings) {
  console.log('  ⚠️  Configuration has warnings - some features may not work');
  process.exit(0);
} else {
  console.log('  ✅ Configuration looks good for deployment!');
  process.exit(0);
}
