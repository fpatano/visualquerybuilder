#!/bin/bash

# Stop all Visual Query Builder servers
echo "🛑 Stopping Visual Query Builder servers..."

# Kill backend processes
echo "🔄 Stopping backend server..."
pkill -f "node server.js" 2>/dev/null || true

# Kill frontend processes  
echo "🔄 Stopping frontend server..."
pkill -f "vite" 2>/dev/null || true

# Wait for processes to stop
sleep 2

echo "✅ All servers stopped."
