#!/bin/bash

# Rebuild and start script for Visual Query Builder
echo "🔨 Rebuilding Visual Query Builder..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🏗️ Building project..."
npm run build

echo "✅ Rebuild complete! Use ./scripts/start.sh to start both servers."
