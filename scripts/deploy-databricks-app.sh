#!/bin/bash

# Databricks Apps Deployment Script
# This script deploys the Visual SQL Query Builder as a Databricks App

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="visual-query-builder"
APP_DISPLAY_NAME="Visual SQL Query Builder"
WORKSPACE_URL=""
APP_ID=""

echo -e "${BLUE}🚀 Databricks Apps Deployment Script${NC}"
echo "=================================="

# Check if required tools are installed
check_requirements() {
    echo -e "${BLUE}Checking requirements...${NC}"
    
    if ! command -v databricks &> /dev/null; then
        echo -e "${RED}❌ Databricks CLI not found${NC}"
        echo "Please install Databricks CLI: https://docs.databricks.com/dev-tools/cli/index.html"
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js not found${NC}"
        echo "Please install Node.js: https://nodejs.org/"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm not found${NC}"
        echo "Please install npm: https://www.npmjs.com/"
        exit 1
    fi
    
    echo -e "${GREEN}✅ All requirements met${NC}"
}

# Build the application
build_app() {
    echo -e "${BLUE}Building application...${NC}"
    
    # Install dependencies
    echo "Installing dependencies..."
    npm ci --only=production
    
    # Build the application
    echo "Building application..."
    npm run build
    
    echo -e "${GREEN}✅ Application built successfully${NC}"
}

# Validate app configuration
validate_config() {
    echo -e "${BLUE}Validating app configuration...${NC}"
    
    # Check if app.yaml exists
    if [ ! -f "app.yaml" ]; then
        echo -e "${RED}❌ app.yaml not found${NC}"
        exit 1
    fi
    
    # Check if dist directory exists
    if [ ! -d "dist" ]; then
        echo -e "${RED}❌ dist directory not found. Run build first.${NC}"
        exit 1
    fi
    
    # Validate app.yaml structure
    if ! grep -q "name:" app.yaml; then
        echo -e "${RED}❌ Invalid app.yaml: missing name${NC}"
        exit 1
    fi
    
    if ! grep -q "permissions:" app.yaml; then
        echo -e "${RED}❌ Invalid app.yaml: missing permissions${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ App configuration validated${NC}"
}

# Get workspace information
get_workspace_info() {
    echo -e "${BLUE}Getting workspace information...${NC}"
    
    # Check if already authenticated
    if ! databricks auth list &> /dev/null; then
        echo -e "${YELLOW}⚠️  Not authenticated with Databricks${NC}"
        echo "Please run: databricks auth login"
        exit 1
    fi
    
    # Get workspace URL
    WORKSPACE_URL=$(databricks workspace list --output JSON | jq -r '.workspace_url' 2>/dev/null || echo "")
    
    if [ -z "$WORKSPACE_URL" ]; then
        echo -e "${YELLOW}⚠️  Could not determine workspace URL${NC}"
        read -p "Please enter your Databricks workspace URL: " WORKSPACE_URL
    fi
    
    echo -e "${GREEN}✅ Workspace URL: ${WORKSPACE_URL}${NC}"
}

# Deploy the app
deploy_app() {
    echo -e "${BLUE}Deploying app to Databricks...${NC}"
    
    # Create app bundle
    echo "Creating app bundle..."
    databricks apps create \
        --name "$APP_NAME" \
        --display-name "$APP_DISPLAY_NAME" \
        --description "Visual SQL Query Builder for Databricks" \
        --manifest-file app.yaml \
        --bundle-path dist \
        --output JSON > deploy_output.json
    
    # Extract app ID
    APP_ID=$(cat deploy_output.json | jq -r '.app_id')
    
    if [ "$APP_ID" = "null" ] || [ -z "$APP_ID" ]; then
        echo -e "${RED}❌ Failed to deploy app${NC}"
        cat deploy_output.json
        exit 1
    fi
    
    echo -e "${GREEN}✅ App deployed successfully with ID: ${APP_ID}${NC}"
    
    # Clean up
    rm deploy_output.json
}

# Verify deployment
verify_deployment() {
    echo -e "${BLUE}Verifying deployment...${NC}"
    
    # Check app status
    echo "Checking app status..."
    databricks apps get --app-id "$APP_ID" --output JSON > app_status.json
    
    APP_STATUS=$(cat app_status.json | jq -r '.status')
    APP_URL=$(cat app_status.json | jq -r '.url')
    
    echo -e "${GREEN}✅ App status: ${APP_STATUS}${NC}"
    echo -e "${GREEN}✅ App URL: ${APP_URL}${NC}"
    
    # Clean up
    rm app_status.json
}

# Main deployment flow
main() {
    echo -e "${BLUE}Starting deployment process...${NC}"
    
    check_requirements
    build_app
    validate_config
    get_workspace_info
    deploy_app
    verify_deployment
    
    echo ""
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Go to your Databricks workspace: ${WORKSPACE_URL}"
    echo "2. Navigate to Apps in the left sidebar"
    echo "3. Find '${APP_DISPLAY_NAME}' and click 'Launch'"
    echo "4. The app will open in a new tab with proper Databricks Apps context"
    echo ""
    echo -e "${YELLOW}⚠️  Important: Do not run this app on localhost${NC}"
    echo "   It must be launched from within the Databricks workspace"
    echo ""
    echo -e "${BLUE}If you encounter issues:${NC}"
    echo "1. Check the browser console for detailed error messages"
    echo "2. Verify the app has the required Unity Catalog permissions"
    echo "3. Contact your workspace admin if problems persist"
}

# Run main function
main "$@"
