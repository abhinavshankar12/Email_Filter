#!/bin/bash

# Invora Email Filter - Automated Setup Script
# This script automates as much as possible

set -e

echo "🚀 Invora Email Filter - Automated Setup"
echo "========================================="
echo ""

# Check Node.js
echo "Checking Node.js version..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version must be 18 or higher. Current: $(node -v)"
    exit 1
fi
echo "✅ Node.js $(node -v) detected"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install
echo "✅ Root dependencies installed"
echo ""

cd backend
npm install
echo "✅ Backend dependencies installed"
echo ""

cd ../addin
npm install
echo "✅ Add-in dependencies installed"
echo ""

cd ..

# Check if .env exists
if [ ! -f "backend/.env" ]; then
    echo "📝 Creating backend/.env file..."
    cp backend/.env.example backend/.env
    echo "✅ Created backend/.env"
    echo ""
    echo "⚠️  IMPORTANT: You need to configure backend/.env with your Azure credentials!"
    echo ""
    echo "Please follow these steps:"
    echo "1. Go to https://portal.azure.com"
    echo "2. Navigate to: Azure Active Directory → App registrations → New registration"
    echo "3. Name: 'Invora Email Filter'"
    echo "4. Click Register and copy the Application (client) ID and Directory (tenant) ID"
    echo "5. Go to 'Certificates & secrets' → New client secret → Copy the secret value"
    echo "6. Go to 'API permissions' → Add these permissions:"
    echo "   - Mail.Read"
    echo "   - Mail.ReadWrite"
    echo "   - MailboxSettings.Read"
    echo "   - offline_access"
    echo "7. Click 'Grant admin consent'"
    echo ""
    echo "Then edit backend/.env and add your:"
    echo "   - GRAPH_TENANT_ID"
    echo "   - GRAPH_CLIENT_ID"
    echo "   - GRAPH_CLIENT_SECRET"
    echo ""
    
    # Open the file for editing
    if command -v code &> /dev/null; then
        echo "Opening .env in VS Code..."
        code backend/.env
    elif command -v nano &> /dev/null; then
        echo "Press Enter to edit .env in nano, or Ctrl+C to edit manually..."
        read -r
        nano backend/.env
    else
        echo "Please edit backend/.env manually"
    fi
    
    echo ""
    echo "After configuring .env, run: ./setup.sh continue"
    exit 0
fi

# Initialize database
echo "🗄️  Initializing database..."
cd backend
npm run seed
echo "✅ Database initialized with seed data"
echo ""

cd ..

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Start the servers: ./start.sh"
echo "2. Follow the sideloading instructions that will appear"
echo ""

