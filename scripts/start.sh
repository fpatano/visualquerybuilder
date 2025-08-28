#!/bin/bash

# Start both backend and frontend servers
echo "🚀 Starting Visual Query Builder servers..."

# Kill any existing processes
echo "🔄 Stopping any existing processes..."
pkill -f "node server.js" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 2

# Start backend server in background
echo "🖥️ Starting backend server (port 3000)..."
npm start &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend server in background  
echo "🌐 Starting frontend server (port 5173)..."
npm run dev &
FRONTEND_PID=$!

# Wait a moment for both to start
sleep 3

# Check if both servers are running
echo "🔍 Checking server status..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health | grep -q "200"; then
    echo "✅ Backend server: Running on http://localhost:3000"
    
    # Test authentication if possible
    echo "🔐 Testing authentication..."
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/whoami | grep -q "200"; then
        echo "✅ Authentication: Working"
    else
        echo "⚠️  Authentication: Check your .env file and credentials"
    fi
else
    echo "❌ Backend server: Not responding"
fi

if curl -s -o /dev/null -w "%{http_code}" http://localhost:5173 | grep -q "200"; then
    echo "✅ Frontend server: Running on http://localhost:5173"
else
    echo "❌ Frontend server: Not responding"
fi

echo ""
echo "🌟 Visual Query Builder is ready!"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:3000"
echo ""
echo "💡 To stop servers: ./scripts/stop.sh"
echo "💡 To view logs: ./scripts/logs.sh"
