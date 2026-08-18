#!/bin/bash

# Kaizen Competition System - Setup Script

echo "🚀 Kaizen Competition Management System - Setup"
echo "================================================"
echo ""

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 16+ from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v)
echo "✓ Found Node.js: $NODE_VERSION"

# Install root dependencies
echo ""
echo "📦 Installing root dependencies..."
npm install --legacy-peer-deps 2>/dev/null || npm install

# Install backend dependencies
echo ""
echo "📦 Installing backend dependencies..."
cd backend
npm install --legacy-peer-deps 2>/dev/null || npm install
cd ..

# Install frontend dependencies
echo ""
echo "📦 Installing frontend dependencies..."
cd frontend
npm install --legacy-peer-deps 2>/dev/null || npm install
cd ..

echo ""
echo "✅ Installation complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Start both servers: npm run dev"
echo "  2. Open frontend: http://localhost:5173"
echo "  3. Backend running on: http://localhost:4000"
echo ""
echo "🔐 Demo Credentials:"
echo "  Admin: admin / admin123"
echo "  Jury: jury_h1_1 / jury1_1password"
echo ""
echo "📚 Documentation: See README.md and CONSOLIDATED_PROMPT.md"
echo ""
