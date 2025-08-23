#!/bin/bash

echo "🚀 Setting up FinHelm-ai development environment..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

echo "📦 Installing backend dependencies..."
npm install --workspace=backend

echo "📦 Installing frontend dependencies..."
npm install --workspace=frontend

echo "📦 Installing shared dependencies..."
npm install --workspace=shared

# Create environment files
echo "🔧 Creating environment files..."
if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo "✅ Created backend/.env from example"
fi

if [ ! -f frontend/.env ]; then
    cp frontend/.env.example frontend/.env
    echo "✅ Created frontend/.env from example"
fi

# Build shared package
echo "🔨 Building shared package..."
npm run build --workspace=shared

echo "✅ Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Update backend/.env with your configuration"
echo "2. Start MongoDB if using locally"
echo "3. Run 'npm run dev' to start both frontend and backend"
echo ""
echo "🌐 URLs:"
echo "- Frontend: http://localhost:3000"
echo "- Backend: http://localhost:5000"