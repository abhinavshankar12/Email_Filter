#!/bin/bash

# Invora Email Filter - Start Script
# Starts both backend and add-in servers

echo "🚀 Starting Invora Email Filter..."
echo ""

# Check if .env is configured
if ! grep -q "your-tenant-id" backend/.env 2>/dev/null; then
    if ! grep -q "GRAPH_TENANT_ID=.*[a-f0-9-]" backend/.env 2>/dev/null; then
        echo "⚠️  Warning: backend/.env may not be configured yet"
        echo "Please make sure you've added your Azure credentials"
        echo ""
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
fi

echo "Starting backend server on http://localhost:3000..."
echo "Starting add-in server on https://localhost:3001..."
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""
echo "========================================="
echo "📋 SIDELOAD INSTRUCTIONS:"
echo "========================================="
echo ""
echo "For Outlook on the Web (easiest):"
echo "1. Go to https://outlook.office.com"
echo "2. Open any email"
echo "3. Click the three dots (...) → Get Add-ins"
echo "4. Click 'My add-ins' tab"
echo "5. Click '+ Add a custom add-in' → 'Add from file'"
echo "6. Upload this file:"
echo "   $PWD/addin/manifest.xml"
echo "7. Click Install"
echo "8. Open an email and click the 'Check Email' button!"
echo ""
echo "For Outlook Desktop:"
echo "1. Open Outlook"
echo "2. Go to File → Get Add-ins"
echo "3. Click 'My add-ins' → '+ Add a custom add-in' → 'Add from file'"
echo "4. Browse to: $PWD/addin/manifest.xml"
echo "5. Click Install"
echo ""
echo "========================================="
echo ""
echo "Servers starting in 3 seconds..."
sleep 3

# Start both servers using npm workspace commands
npm run dev

