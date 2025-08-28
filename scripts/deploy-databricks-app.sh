#!/bin/bash

# Production Deployment Script for Databricks Apps
# This script is for production releases with full validation and verification
# For quick testing, use: deploy-new.sh

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
WORKSPACE_PATH="/Workspace/Users/6bde2ca2-5ad5-47bb-8284-db7289e1c333/visual-query-builder"
CLI_PATH="/usr/local/bin/databricks"

echo -e "${BLUE}🚀 Databricks Apps Deployment Script${NC}"
echo "=================================="

# Check if required tools are installed
check_requirements() {
    echo -e "${BLUE}Checking requirements...${NC}"
    
    # Check for new Databricks CLI with apps support
    if ! command -v "$CLI_PATH" &> /dev/null; then
        echo -e "${RED}❌ New Databricks CLI not found at $CLI_PATH${NC}"
        echo "Please install Databricks CLI v0.200+ with apps support"
        echo "Current CLI at $(which databricks) may be outdated"
        exit 1
    fi
    
    # Verify CLI version supports apps
    CLI_VERSION=$("$CLI_PATH" --version 2>/dev/null | grep -o 'v[0-9]\+\.[0-9]\+' || echo "unknown")
    echo "Found CLI version: $CLI_VERSION"
    
    if ! "$CLI_PATH" apps --help &> /dev/null; then
        echo -e "${RED}❌ CLI doesn't support 'apps' command${NC}"
        echo "Please upgrade to Databricks CLI v0.200+"
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

# Check authentication
check_auth() {
    echo -e "${BLUE}Checking authentication...${NC}"
    
    # Test CLI authentication
    if ! "$CLI_PATH" workspace list /Users &> /dev/null; then
        echo -e "${RED}❌ Not authenticated with Databricks${NC}"
        echo "Please run: $CLI_PATH configure"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Authentication verified${NC}"
}

# Deploy the app using new CLI
deploy_app() {
    echo -e "${BLUE}Deploying app to Databricks Apps...${NC}"
    
    # Deploy using the new apps command
    echo "Deploying app: $APP_NAME"
    echo "Source path: $WORKSPACE_PATH"
    
    "$CLI_PATH" apps deploy "$APP_NAME" \
        --source-code-path "$WORKSPACE_PATH" \
        --mode SNAPSHOT
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ App deployed successfully${NC}"
    else
        echo -e "${RED}❌ App deployment failed${NC}"
        exit 1
    fi
}

# Verify deployment
verify_deployment() {
    echo -e "${BLUE}Verifying deployment...${NC}"
    
    # Wait a moment for deployment to complete
    echo "Waiting for deployment to complete..."
    sleep 10
    
    # Check app status
    echo "Checking app status..."
    "$CLI_PATH" apps get "$APP_NAME" --output JSON > app_status.json
    
    APP_STATUS=$(cat app_status.json | jq -r '.active_deployment.status.state' 2>/dev/null || echo "unknown")
    APP_URL=$(cat app_status.json | jq -r '.url' 2>/dev/null || echo "unknown")
    
    echo -e "${GREEN}✅ App status: ${APP_STATUS}${NC}"
    echo -e "${GREEN}✅ App URL: ${APP_URL}${NC}"
    
    # Clean up
    rm -f app_status.json
    
    if [ "$APP_STATUS" = "SUCCEEDED" ]; then
        echo -e "${GREEN}🎉 Deployment successful!${NC}"
    else
        echo -e "${YELLOW}⚠️  Deployment may still be in progress${NC}"
    fi
}

# Main deployment flow
main() {
    echo -e "${BLUE}Starting deployment process...${NC}"
    
    check_requirements
    check_auth
    build_app
    validate_config
    deploy_app
    verify_deployment
    
    echo ""
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Go to your Databricks workspace"
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
    echo ""
    echo -e "${BLUE}To check app status anytime:${NC}"
    echo "   $CLI_PATH apps get $APP_NAME"
}

# Run main function
main "$@"
