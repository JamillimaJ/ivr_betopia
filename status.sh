#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Lead Qualifier System Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check backend
if [ -f "logs/backend.pid" ]; then
    BACKEND_PID=$(cat logs/backend.pid)
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        echo "✅ Backend:  Running (PID: $BACKEND_PID)"
        echo "   URL:      http://0.0.0.0.:8001"
    else
        echo "❌ Backend:  Not running (stale PID file)"
    fi
else
    echo "❌ Backend:  Not running"
fi

echo ""

# Check frontend
if [ -f "logs/frontend.pid" ]; then
    FRONTEND_PID=$(cat logs/frontend.pid)
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        echo "✅ Frontend: Running (PID: $FRONTEND_PID)"
        echo "   URL:      http://0.0.0.0.:8000"
    else
        echo "❌ Frontend: Not running (stale PID file)"
    fi
else
    echo "❌ Frontend: Not running"
fi

echo ""
echo "📊 View Logs:"
echo "   Backend:  tail -f logs/backend.log"
echo "   Frontend: tail -f logs/frontend.log"
echo "   Both:     tail -f logs/*.log"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
