#!/bin/bash

# Clean and rebuild script for Visual Query Builder
echo "🧹 Cleaning Visual Query Builder..."

# Kill any running processes
echo "🔄 Stopping any running processes..."
pkill -f "node server.js" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 2

# Clean node modules and package lock
echo "📦 Cleaning dependencies..."
rm -rf node_modules
rm -f package-lock.json

# Clean build artifacts
echo "🗑️ Cleaning build artifacts..."
rm -rf dist
rm -rf .vite

# Clean any temp files
echo "🧽 Cleaning temp files..."
find . -name "*.log" -delete 2>/dev/null || true
find . -name ".DS_Store" -delete 2>/dev/null || true

echo "✅ Clean complete! Run ./scripts/rebuild.sh to reinstall and start."
