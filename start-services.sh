#!/bin/bash

# 🚀 Crypto Trading Microservices Startup Script
# This script starts all microservices for the distributed trading system

echo "🏗️  Starting Crypto Trading Microservices..."
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if port is available
check_port() {
    local port=$1
    if lsof -i :$port > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Port $port is already in use${NC}"
        return 1
    else
        echo -e "${GREEN}✅ Port $port is available${NC}"
        return 0
    fi
}

# Function to check environment setup
check_environment() {
    echo "🔧 Checking environment setup..."
    
    # Check for .env files
    if [ ! -f "microservices/trading-engine/.env" ]; then
        echo -e "${YELLOW}⚠️  Creating default .env file for trading engine...${NC}"
        cat > microservices/trading-engine/.env << EOF
# Trading Engine Configuration
PORT=8080
ENV=development

# Binance API Configuration (Testnet)
BINANCE_API_KEY=your_testnet_api_key_here
BINANCE_SECRET_KEY=your_testnet_secret_key_here
BINANCE_TESTNET=true

# Database Configuration (Optional)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=crypto_trading
DB_USER=postgres
DB_PASSWORD=password

# Redis Configuration (Optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Trading Configuration
TRADING_ENABLED=false
INITIAL_BALANCE=50000
MAX_POSITION_SIZE=10000
RISK_PER_TRADE=2
MAX_DAILY_LOSS=2500
EOF
        echo -e "${GREEN}✅ Created default .env file${NC}"
    fi
    
    # Check Go installation
    if ! command -v go &> /dev/null; then
        echo -e "${RED}❌ Go is not installed. Please install Go 1.21+${NC}"
        exit 1
    fi
    
    # Check Node.js installation
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Environment check passed${NC}"
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=0
    
    echo -e "${BLUE}🔍 Waiting for $service_name to be ready...${NC}"
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s $url > /dev/null 2>&1; then
            echo -e "${GREEN}✅ $service_name is ready!${NC}"
            return 0
        fi
        
        echo -e "${YELLOW}⏳ Attempt $((attempt + 1))/$max_attempts - waiting for $service_name...${NC}"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}❌ $service_name failed to start after $max_attempts attempts${NC}"
    return 1
}

# Check if we're in the right directory
if [ ! -d "microservices" ]; then
    echo -e "${RED}❌ Error: microservices directory not found. Please run this script from the project root.${NC}"
    exit 1
fi

# Check environment setup
check_environment

echo "🔍 Checking port availability..."
check_port 8080 || exit 1
check_port 3000 || exit 1

echo ""
echo "1️⃣  Starting Trading Engine Microservice (Go - Port 8080)..."
echo "------------------------------------------------------"

# Start Trading Engine in background
cd microservices/trading-engine
if [ ! -f "main.go" ]; then
    echo -e "${RED}❌ Trading Engine main.go not found${NC}"
    exit 1
fi

echo "📦 Installing Go dependencies..."
go mod tidy

echo "� Building optimized Trading Engine..."
go build -o trading-engine-optimized .
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to build Trading Engine${NC}"
    exit 1
fi

echo "🚀 Starting Trading Engine..."
./trading-engine-optimized > ../../logs/trading-engine.log 2>&1 &
TRADING_ENGINE_PID=$!
echo "Trading Engine PID: $TRADING_ENGINE_PID"

# Return to project root
cd ../..

# Wait for Trading Engine to be ready
wait_for_service "http://localhost:8080/api/health" "Trading Engine"

echo ""
echo "2️⃣  Starting Frontend UI Microservice (Next.js - Port 3000)..."
echo "--------------------------------------------------------"

# Start Frontend UI in background
cd microservices/frontend-ui
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Frontend UI package.json not found${NC}"
    exit 1
fi

echo "📦 Installing Node.js dependencies..."
npm install > /dev/null 2>&1

echo "🚀 Starting Frontend UI..."
npm run dev > ../../logs/frontend-ui.log 2>&1 &
FRONTEND_UI_PID=$!
echo "Frontend UI PID: $FRONTEND_UI_PID"

# Return to project root
cd ../..

# Wait for Frontend UI to be ready
wait_for_service "http://localhost:3000" "Frontend UI"

echo ""
echo "🎉 All Microservices Started Successfully!"
echo "=========================================="
echo -e "${GREEN}🎯 Trading Engine:${NC} http://localhost:8080"
echo -e "   • Health Check: http://localhost:8080/api/health"
echo -e "   • Trading State: http://localhost:8080/api/trading-state"
echo -e "   • Market Data: http://localhost:8080/api/market-data"
echo -e "   • WebSocket: ws://localhost:8080/ws"
echo -e "   • API Documentation: http://localhost:8080/api"
echo ""
echo -e "${BLUE}🎨 Frontend UI:${NC} http://localhost:3000"
echo -e "   • Dashboard: http://localhost:3000"
echo ""
echo -e "${YELLOW}📊 Service Status:${NC}"
echo "   • Trading Engine PID: $TRADING_ENGINE_PID"
echo "   • Frontend UI PID: $FRONTEND_UI_PID"
echo ""
echo -e "${YELLOW}📝 Logs:${NC}"
echo "   • Trading Engine: logs/trading-engine.log"
echo "   • Frontend UI: logs/frontend-ui.log"
echo ""
echo "🛑 To stop all services, run: ./stop-services.sh"
echo ""

# Save PIDs for later cleanup
mkdir -p logs
echo $TRADING_ENGINE_PID > logs/trading-engine.pid
echo $FRONTEND_UI_PID > logs/frontend-ui.pid

# Setup cleanup on script exit
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down services...${NC}"
    if [ ! -z "$TRADING_ENGINE_PID" ]; then
        kill $TRADING_ENGINE_PID 2>/dev/null
    fi
    if [ ! -z "$FRONTEND_UI_PID" ]; then
        kill $FRONTEND_UI_PID 2>/dev/null
    fi
    exit 0
}

trap cleanup INT TERM

echo "✅ Microservices startup complete!"
echo "🌐 Open http://localhost:3000 to access the trading dashboard"
echo ""
echo -e "${BLUE}💡 Tips:${NC}"
echo "   • Press Ctrl+C to stop all services"
echo "   • Use ./stop-services.sh to stop services manually"
echo "   • Use ./status.sh to check service status"
echo "   • Check logs/ directory for service logs"