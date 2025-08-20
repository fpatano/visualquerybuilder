#!/bin/bash

# View logs from both servers
echo "📋 Viewing server logs (Ctrl+C to exit)..."
echo "Backend logs will show proxy requests and SQL queries"
echo "Frontend logs will show hot reloading and build info"
echo "----------------------------------------"

# Show recent logs and follow new ones
tail -f ~/.npm/_logs/*.log 2>/dev/null &
sleep 1

# If no npm logs, show process info instead
if ! pgrep -f "node server.js" > /dev/null; then
    echo "⚠️ Backend server not running"
else
    echo "✅ Backend server running (PID: $(pgrep -f 'node server.js'))"
fi

if ! pgrep -f "vite" > /dev/null; then
    echo "⚠️ Frontend server not running"  
else
    echo "✅ Frontend server running (PID: $(pgrep -f 'vite'))"
fi

echo ""
echo "💡 Use ./scripts/start.sh to start servers if they're not running"
