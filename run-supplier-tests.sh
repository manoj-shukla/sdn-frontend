#!/bin/bash

# Supplier Onboarding Test Runner
# This script helps run the supplier onboarding E2E tests

echo "=========================================="
echo "Supplier Onboarding Test Runner"
echo "=========================================="
echo ""

# Check if frontend servers are running
echo "📋 Checking if servers are running..."
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "❌ Frontend not running on http://localhost:3000"
    echo "   Please run: npm run dev"
    echo ""
fi

if ! curl -s http://localhost:8083 > /dev/null; then
    echo "❌ Backend not running on http://localhost:8083"
    echo "   Please start the backend server"
    echo ""
fi

echo "=========================================="
echo "Choose test mode:"
echo "=========================================="
echo "1) UI Mode - Interactive with browser"
echo "2) Headless Mode - Run tests without browser UI"
echo "3) Debug Mode - Run with extra logging"
echo "4) Show Test Report"
echo ""
read -p "Enter choice (1-4): " choice

case $choice in
    1)
        echo ""
        echo "🚀 Starting Playwright UI Mode..."
        echo "   This will open a browser window where you can:"
        echo "   - See each test step visually"
        echo "   - Debug failing tests"
        echo "   - Run tests one-by-one"
        echo ""
        npm run test:e2e:ui
        ;;
    2)
        echo ""
        echo "🚀 Running tests headless..."
        npm run test:e2e
        ;;
    3)
        echo ""
        echo "🚀 Running tests with debug output..."
        DEBUG=pw:* npm run test:e2e
        ;;
    4)
        echo ""
        echo "📊 Opening test report..."
        npm run test:e2e:report
        ;;
    *)
        echo "Invalid choice. Please run again."
        exit 1
        ;;
esac

echo ""
echo "=========================================="
echo "Test complete!"
echo "=========================================="
echo "📄 Test results saved in: playwright-report/"
echo "📸 Screenshots saved in: test-results/"
echo ""
