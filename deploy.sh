#!/bin/bash

# Visual SQL Query Builder - Databricks Apps Deployment Script
echo "🚀 Deploying Visual SQL Query Builder to Databricks Apps..."

# Check if databricks CLI is configured
if ! databricks configure --help > /dev/null 2>&1; then
    echo "❌ Databricks CLI not found or not configured"
    echo "Please run: databricks configure"
    exit 1
fi

# Build the project first
echo "🔨 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix the errors and try again."
    exit 1
fi

echo "✅ Build successful!"

# Create deployment directory
DEPLOY_DIR="deploy"
rm -rf $DEPLOY_DIR
mkdir -p $DEPLOY_DIR

# Copy only the files needed for production
echo "📦 Preparing deployment package..."
cp app.yaml $DEPLOY_DIR/
cp package.json $DEPLOY_DIR/
cp server.js $DEPLOY_DIR/
cp requirements.txt $DEPLOY_DIR/
cp -r dist $DEPLOY_DIR/

# Remove unnecessary files from dist
rm -rf $DEPLOY_DIR/dist/assets/*.map

echo "📁 Deployment package created in $DEPLOY_DIR/"
echo "📋 Files to deploy:"
ls -la $DEPLOY_DIR/

# Check if we should proceed with upload
read -p "Do you want to upload to Databricks workspace? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📤 Uploading to Databricks workspace..."
    
    # Create the target directory
    databricks workspace mkdirs /Users/fpatano@gmail.com/visual-query-builder
    
    # Upload the deployment package
    databricks workspace import_dir $DEPLOY_DIR /Users/fpatano@gmail.com/visual-query-builder
    
    if [ $? -eq 0 ]; then
        echo "✅ Upload successful!"
        echo ""
        echo "🎯 Next steps:"
        echo "1. Go to your Databricks workspace"
        echo "2. Navigate to Apps → visual-query-builder"
        echo "3. Click 'Deploy' to deploy the app"
        echo "4. Or run: databricks apps deploy visual-query-builder --source-code-path /Users/fpatano@gmail.com/visual-query-builder"
    else
        echo "❌ Upload failed. Please check your Databricks CLI configuration."
        echo "Run: databricks configure"
    fi
else
    echo "📁 Deployment package ready in $DEPLOY_DIR/"
    echo "You can manually upload these files to Databricks Apps."
fi

echo ""
echo "🎉 Deployment script completed!"
