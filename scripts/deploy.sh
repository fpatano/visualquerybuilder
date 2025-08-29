#!/bin/bash

# Exit on error
set -e

# Check required environment variables
if [ -z "$DATABRICKS_HOST" ]; then
    echo "❌ DATABRICKS_HOST environment variable is required"
    exit 1
fi

if [ -z "$DATABRICKS_TOKEN" ]; then
    echo "❌ DATABRICKS_TOKEN environment variable is required"
    exit 1
fi

if [ -z "$DATABRICKS_REPO_PATH" ]; then
    echo "❌ DATABRICKS_REPO_PATH environment variable is required"
    exit 1
fi

if [ -z "$APP_NAME" ]; then
    echo "❌ APP_NAME environment variable is required"
    exit 1
fi

# Set default branch if not provided
BRANCH="${BRANCH:-main}"

echo "🚀 Deploying to Databricks..."
echo "  Host: $DATABRICKS_HOST"
echo "  Repo Path: $DATABRICKS_REPO_PATH"
echo "  Branch: $BRANCH"
echo "  App: $APP_NAME"

# Configure Databricks CLI
echo "🔧 Configuring Databricks CLI..."
databricks configure --host "$DATABRICKS_HOST" --token "$DATABRICKS_TOKEN" --profile default --quiet || true

# Update the Databricks Repos folder
echo "📥 Updating Databricks Repos folder..."
databricks repos update "$DATABRICKS_REPO_PATH" --branch "$BRANCH"

# Try to deploy the app from the same folder
echo "🚀 Attempting to deploy Databricks App..."
if databricks apps deploy "$APP_NAME" --source-code-path "$DATABRICKS_REPO_PATH"; then
    echo "✅ App deployed successfully!"
else
    echo "⚠️  Apps CLI not available. Repo updated. Open Databricks > Apps > $APP_NAME and click Rebuild."
fi

echo "✅ Deployment completed successfully!"
echo "  Repo path: $DATABRICKS_REPO_PATH"
echo "  Branch: $BRANCH"
