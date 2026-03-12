#!/bin/bash

echo "🚀 Starting Lead Qualifier System..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found!"
    echo "Please run ./setup_backend.sh first"
    exit 1
fi

# Activate virtual environment
source venv/bin/activate

# Create logs directory
mkdir -p logs

# Start Django backend
echo "🔥 Starting Django backend server..."
cd backend
nohup python manage.py runserver 0.0.0.0:5869 > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Save PID to file
echo $BACKEND_PID > logs/backend.pid
sleep 1

echo "✅ Backend started on http://0.0.0.0.:5869"
echo "   PID: $BACKEND_PID"
echo ""

# Start frontend server (React + Vite)
echo "🌐 Starting React frontend server..."
cd frontend

# Check if node_modules exists, if not, install dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

nohup npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Save PID to file
echo $FRONTEND_PID > logs/frontend.pid
sleep 2

echo "✅ Frontend started on http://0.0.0.0:5569"
echo "   PID: $FRONTEND_PID"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 System is running!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Access Points:"
echo "   • Dashboard:    http://127.0.0.1:5569"
echo "   • Login:        http://127.0.0.1:5569/login"
echo "   • Backend API:  http://127.0.0.1:5869/api"
echo ""
echo "🔐 Login Credentials:"
echo "   Username: admin"
echo "   Password: admin"
echo ""
echo "📱 Access from other devices:"
echo "   Replace 127.0.0.1 with this machine's IP address"
echo ""
echo "📊 Logs:"
echo "   • Backend:  tail -f logs/backend.log"
echo "   • Frontend: tail -f logs/frontend.log"
echo ""
echo "🛑 To stop the servers, run: ./stop.sh"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
