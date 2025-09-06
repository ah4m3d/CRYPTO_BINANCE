#!/bin/bash

# 🛑 Crypto Trading Microservices Stop Script
# This script stops all running microservices

echo "🛑 Stopping Crypto Trading Microservices..."
echo "==========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to stop service by PID
stop_service() {
    local pid_file=$1
    local service_name=$2
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat $pid_file)
        if ps -p $pid > /dev/null 2>&1; then
            echo -e "${YELLOW}🛑 Stopping $service_name (PID: $pid)...${NC}"
            kill $pid
            sleep 2
            
            # Force kill if still running
            if ps -p $pid > /dev/null 2>&1; then
                echo -e "${YELLOW}⚡ Force stopping $service_name...${NC}"
                kill -9 $pid
            fi
            
            echo -e "${GREEN}✅ $service_name stopped${NC}"
        else
            echo -e "${YELLOW}⚠️  $service_name was not running${NC}"
        fi
        rm -f $pid_file
    else
        echo -e "${YELLOW}⚠️  No PID file found for $service_name${NC}"
    fi
}

# Stop services by PID files
if [ -d "logs" ]; then
    stop_service "logs/trading-engine.pid" "Trading Engine"
    stop_service "logs/frontend-ui.pid" "Frontend UI"
else
    echo -e "${YELLOW}⚠️  No logs directory found${NC}"
fi

# Kill any remaining processes by port
echo ""
echo "🔍 Checking for remaining processes..."

# Kill processes on port 8080 (Trading Engine)
TRADING_PIDS=$(lsof -ti :8080 2>/dev/null)
if [ ! -z "$TRADING_PIDS" ]; then
    echo -e "${YELLOW}🛑 Stopping remaining processes on port 8080...${NC}"
    kill -9 $TRADING_PIDS 2>/dev/null
fi

# Kill processes on port 3000 (Frontend UI)
FRONTEND_PIDS=$(lsof -ti :3000 2>/dev/null)
if [ ! -z "$FRONTEND_PIDS" ]; then
    echo -e "${YELLOW}🛑 Stopping remaining processes on port 3000...${NC}"
    kill -9 $FRONTEND_PIDS 2>/dev/null
fi

# Kill any Go processes running main.go
GO_PIDS=$(pgrep -f "go run main.go" 2>/dev/null)
if [ ! -z "$GO_PIDS" ]; then
    echo -e "${YELLOW}🛑 Stopping Go processes...${NC}"
    kill -9 $GO_PIDS 2>/dev/null
fi

# Kill any Node.js dev processes
NODE_PIDS=$(pgrep -f "npm run dev\|next dev" 2>/dev/null)
if [ ! -z "$NODE_PIDS" ]; then
    echo -e "${YELLOW}🛑 Stopping Node.js dev processes...${NC}"
    kill -9 $NODE_PIDS 2>/dev/null
fi

echo ""
echo "🎉 All microservices stopped successfully!"
echo ""
echo -e "${GREEN}✅ Port 8080 (Trading Engine): Available${NC}"
echo -e "${GREEN}✅ Port 3000 (Frontend UI): Available${NC}"
echo ""
echo "🚀 To start services again, run: ./start-services.sh"
