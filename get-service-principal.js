#!/usr/bin/env node

/**
 * Service Principal Setup Script
 * This script helps you create and configure a service principal for Databricks Apps
 */

import fetch from 'node-fetch';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('🔧 Service Principal Setup for Visual SQL Query Builder');
  console.log('=====================================================\n');
  
  console.log('This script will help you create a service principal for your Databricks workspace.');
  console.log('You will need:');
  console.log('1. Your Databricks workspace URL');
  console.log('2. A personal access token with admin privileges');
  console.log('3. The name you want to give your service principal\n');
  
  const workspaceUrl = await question('Enter your Databricks workspace URL (e.g., https://dbc-xxxxx.cloud.databricks.com/): ');
  const personalToken = await question('Enter your personal access token: ');
  const spName = await question('Enter a name for your service principal (e.g., visual-query-builder-sp): ');
  
  console.log('\n🚀 Creating service principal...');
  
  try {
    // Step 1: Create the service principal
    const createResponse = await fetch(`${workspaceUrl}/api/2.0/preview/scim/v2/ServicePrincipals`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${personalToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        applicationId: `${spName}-${Date.now()}`,
        displayName: spName,
        entitlements: [
          { value: 'workspace-access' },
          { value: 'allow-cluster-create' },
          { value: 'allow-instance-pool-create' }
        ]
      })
    });
    
    if (!createResponse.ok) {
      const error = await createResponse.text();
      throw new Error(`Failed to create service principal: ${createResponse.status} - ${error}`);
    }
    
    const spData = await createResponse.json();
    console.log('✅ Service principal created successfully!');
    
    // Step 2: Create a token for the service principal
    const tokenResponse = await fetch(`${workspaceUrl}/api/2.0/token/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${personalToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        comment: `Token for ${spName}`,
        lifetime_seconds: 86400 * 365, // 1 year
        owner: spData.id
      })
    });
    
    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`Failed to create token: ${tokenResponse.status} - ${error}`);
    }
    
    const tokenData = await tokenResponse.json();
    console.log('✅ Service principal token created successfully!');
    
    // Step 3: Display the configuration
    console.log('\n📋 Configuration for your .env file:');
    console.log('=====================================');
    console.log(`DATABRICKS_CLIENT_ID=${spData.applicationId}`);
    console.log(`DATABRICKS_CLIENT_SECRET=${tokenData.token_value}`);
    console.log(`DATABRICKS_WORKSPACE_ID=${workspaceUrl.split('/')[2].split('.')[0].replace('dbc-', '')}`);
    console.log('\n⚠️  IMPORTANT: Save these credentials securely!');
    console.log('   The client secret will only be shown once.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Alternative: You can create a service principal manually in the Databricks UI:');
    console.log('1. Go to Settings > Service Principals');
    console.log('2. Click "Add Service Principal"');
    console.log('3. Give it a name and description');
    console.log('4. Add the necessary permissions');
    console.log('5. Create a token for the service principal');
  } finally {
    rl.close();
  }
}

main().catch(console.error);
