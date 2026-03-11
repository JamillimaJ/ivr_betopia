#!/bin/bash

echo "🛑 Stopping Lead Qualifier System..."


# Stop backend
BACKEND_STOPPED=0
if [ -f "logs/backend.pid" ]; then
    BACKEND_PID=$(cat logs/backend.pid)
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        echo "🔴 Stopping backend (PID: $BACKEND_PID)..."
        kill $BACKEND_PID
        echo "✅ Backend stopped"
        BACKEND_STOPPED=1
    fi
    rm -f logs/backend.pid
fi

# Fallback: kill any stray manage.py runserver processes
STRAY_PIDS=$(pgrep -f "manage.py runserver 0.0.0.0:8001" 2>/dev/null)
if [ -n "$STRAY_PIDS" ]; then
    echo "🔴 Stopping stray backend process(es): $STRAY_PIDS"
    kill $STRAY_PIDS 2>/dev/null
    echo "✅ Backend stopped"
    BACKEND_STOPPED=1
fi

if [ $BACKEND_STOPPED -eq 0 ]; then
    echo "⚠️  Backend process not found"
fi

# Stop frontend
if [ -f "logs/frontend.pid" ]; then
    FRONTEND_PID=$(cat logs/frontend.pid)
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        echo "🔴 Stopping frontend (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID
        rm logs/frontend.pid
        echo "✅ Frontend stopped"
    else
        echo "⚠️  Frontend process not found"
        rm logs/frontend.pid
    fi
fi

echo ""
echo "✅ All services stopped"
