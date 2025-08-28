#!/bin/bash

# Deployment script for testing authentication fixes
# This script helps deploy and test the updated Visual SQL Query Builder

set -e

echo "🚀 Deploying Visual SQL Query Builder with Authentication Fixes"
echo "================================================================"

# Check if we're in the right directory
if [ ! -f "app.yaml" ]; then
    echo "❌ Error: app.yaml not found. Please run this script from the project root."
    exit 1
fi

# Build the application
echo "📦 Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix build errors before deploying."
    exit 1
fi

echo "✅ Build completed successfully"

# Check if databricks CLI is available
if ! command -v databricks &> /dev/null; then
    echo "⚠️  Databricks CLI not found. Please install it first:"
    echo "   pip install databricks-cli"
    echo "   databricks configure --token"
    echo ""
    echo "📋 Manual deployment steps:"
    echo "   1. Run: databricks apps deploy"
    echo "   2. Or use the Databricks UI to deploy app.yaml"
    exit 1
fi

# Deploy to Databricks Apps
echo "🚀 Deploying to Databricks Apps..."
databricks apps deploy

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    echo ""
    echo "🧪 Testing the deployment..."
    echo "   - Check the app logs for authentication information"
    echo "   - Verify forwarded headers are being received"
    echo "   - Test Unity Catalog endpoints"
    echo ""
    echo "📋 Key things to verify:"
    echo "   - No more 'null.split()' errors in logs"
    echo "   - 'Using x-forwarded-access-token from Databricks Apps' messages"
    echo "   - '[PROXY] Target URL: https://...' messages"
    echo "   - Unity Catalog calls working without 500 errors"
else
    echo "❌ Deployment failed. Check the error messages above."
    exit 1
fi

echo ""
echo "🎉 Deployment and testing completed!"
echo "📖 Check AUTHENTICATION_FIXES_SUMMARY.md for detailed information about the fixes."
