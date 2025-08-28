#!/bin/bash

# Quick Deployment Script for Databricks Apps
# This script deploys the current code to Databricks for testing and development
# For production releases with full validation, use: scripts/deploy-databricks-app.sh

set -e

echo "🚀 Quick Deployment - Visual SQL Query Builder to Databricks Apps..."
echo "===================================================================="
echo "📝 This deploys current code to Databricks for testing/development"
echo "🚀 For production releases, use: scripts/deploy-databricks-app.sh"
echo ""

# Check if new CLI is available
if ! command -v /usr/local/bin/databricks &> /dev/null; then
    echo "❌ New Databricks CLI not found at /usr/local/bin/databricks"
    echo "Please ensure you have Databricks CLI v0.200+ installed"
    exit 1
fi

# Build the project
echo "🔨 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix the errors and try again."
    exit 1
fi

echo "✅ Build successful!"

# Deploy to Databricks Apps
echo "📤 Deploying to Databricks Apps..."
/usr/local/bin/databricks apps deploy visual-query-builder \
    --source-code-path /Workspace/Users/fpatano@gmail.com/visual-query-builder

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    echo ""
    echo "🎯 Next steps:"
    echo "1. Go to your Databricks workspace"
    echo "2. Navigate to Apps → visual-query-builder"
    echo "3. Click 'Launch' to test the app"
    echo ""
    echo "🌐 To check app status:"
    echo "   /usr/local/bin/databricks apps get visual-query-builder"
else
    echo "❌ Deployment failed. Please check the error messages above."
    exit 1
fi

echo ""
echo "🎉 Deployment script completed!"
