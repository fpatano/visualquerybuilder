#!/bin/bash

# Manual Deployment Script for Databricks Apps
# This script works with older Databricks CLI versions

set -e

echo "🚀 Manual Deployment Script for Databricks Apps"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
WORKSPACE_PATH="/Users/fpatano@gmail.com/visual-query-builder"
DEPLOY_DIR="databricks-app-deployment"

echo -e "${BLUE}Step 1: Checking prerequisites...${NC}"

# Check if deployment directory exists
if [ ! -d "$DEPLOY_DIR" ]; then
    echo -e "${RED}❌ Deployment directory not found. Run the build first.${NC}"
    exit 1
fi

# Check if databricks CLI is configured
if ! databricks configure --help > /dev/null 2>&1; then
    echo -e "${RED}❌ Databricks CLI not found or not configured${NC}"
    echo "Please run: databricks configure"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

echo -e "${BLUE}Step 2: Creating workspace directory...${NC}"

# Create the target directory in workspace
databricks workspace mkdirs "$WORKSPACE_PATH"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Workspace directory created: $WORKSPACE_PATH${NC}"
else
    echo -e "${YELLOW}⚠️  Directory may already exist, continuing...${NC}"
fi

echo -e "${BLUE}Step 3: Uploading files to workspace...${NC}"

# Upload files one by one (since the CLI doesn't support directory uploads well)
echo "Uploading app.yaml..."
databricks workspace import "$DEPLOY_DIR/app.yaml" "$WORKSPACE_PATH/app.yaml" --language PYTHON

echo "Uploading server.js..."
databricks workspace import "$DEPLOY_DIR/server.js" "$WORKSPACE_PATH/server.js" --language PYTHON

echo "Uploading package.json..."
databricks workspace import "$DEPLOY_DIR/package.json" "$WORKSPACE_PATH/package.json" --language PYTHON

echo "Uploading dist/index.html..."
databricks workspace import "$DEPLOY_DIR/dist/index.html" "$WORKSPACE_PATH/dist/index.html" --language HTML

echo "Uploading dist/assets..."
# Create assets directory first
databricks workspace mkdirs "$WORKSPACE_PATH/dist/assets"

# Upload CSS and JS files
for file in "$DEPLOY_DIR"/dist/assets/*; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        echo "Uploading $filename..."
        databricks workspace import "$file" "$WORKSPACE_PATH/dist/assets/$filename" --language PYTHON
    fi
done

echo -e "${GREEN}✅ All files uploaded successfully!${NC}"

echo -e "${BLUE}Step 4: Deployment Summary${NC}"
echo ""
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Go to your Databricks workspace"
echo "2. Navigate to Admin → Apps"
echo "3. Click 'Create App'"
echo "4. Configure the app with these settings:"
echo "   - Name: visual-query-builder"
echo "   - Display Name: Visual SQL Query Builder"
echo "   - Source Code Path: $WORKSPACE_PATH"
echo "   - Entry Point: server.js"
echo ""
echo "5. Deploy the app"
echo "6. Launch from the Apps menu in your workspace"
echo ""
echo -e "${YELLOW}⚠️  Important: Never run this app on localhost${NC}"
echo "   It must be launched from within the Databricks workspace"
echo ""
echo -e "${BLUE}Files uploaded to: $WORKSPACE_PATH${NC}"
echo ""
echo -e "${GREEN}Deployment package ready! 🚀${NC}"
