#!/bin/bash

echo "🚀 Setting up Lead Qualifier Backend..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "✨ Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r backend/requirements.txt

# Check if .env exists
if [ ! -f "backend/.env" ]; then
    echo "⚙️  Creating .env file..."
    cp .env.example backend/.env
    echo "⚠️  Please update backend/.env with your VAPI credentials!"
fi

# Run migrations
echo "🗄️  Running database migrations..."
cd backend
python manage.py makemigrations
python manage.py migrate
cd ..

# Ask if user wants to create superuser
read -p "Do you want to create a superuser? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd backend
    python manage.py createsuperuser
    cd ..
fi

echo "✅ Backend setup complete!"
echo ""
echo "To start the server, run:"
echo "  ./start.sh"
