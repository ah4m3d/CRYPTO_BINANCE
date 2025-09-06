#!/bin/bash

# 📊 Crypto Trading Microservices Status Check
# This script checks the status of all microservices

echo "📊 Crypto Trading Microservices Status"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check service health
check_service() {
    local url=$1
    local service_name=$2
    local port=$3
    
    if curl -s "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $service_name${NC} - Running on port $port"
        return 0
    else
        echo -e "${RED}❌ $service_name${NC} - Not responding on port $port"
        return 1
    fi
}

# Function to check if process is running by PID
check_pid() {
    local pid_file=$1
    local service_name=$2
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat $pid_file)
        if ps -p $pid > /dev/null 2>&1; then
            echo -e "${GREEN}🟢 $service_name PID $pid${NC} - Process running"
            return 0
        else
            echo -e "${RED}🔴 $service_name PID $pid${NC} - Process not found"
            return 1
        fi
    else
        echo -e "${YELLOW}⚪ $service_name${NC} - No PID file found"
        return 1
    fi
}

echo ""
echo "🌐 Service Health Checks:"
echo "------------------------"

# Check Trading Engine
check_service "http://localhost:8080/health" "Trading Engine" "8080"
TRADING_STATUS=$?

# Check Frontend UI  
check_service "http://localhost:3000" "Frontend UI" "3000"
FRONTEND_STATUS=$?

echo ""
echo "🔍 Process Status:"
echo "-----------------"

# Check PIDs if logs directory exists
if [ -d "logs" ]; then
    check_pid "logs/trading-engine.pid" "Trading Engine"
    check_pid "logs/frontend-ui.pid" "Frontend UI"
else
    echo -e "${YELLOW}⚠️  No logs directory found${NC}"
fi

echo ""
echo "🚀 Port Usage:"
echo "-------------"

# Check port 8080
if lsof -i :8080 > /dev/null 2>&1; then
    echo -e "${GREEN}🟢 Port 8080${NC} - In use (Trading Engine)"
else
    echo -e "${RED}🔴 Port 8080${NC} - Available"
fi

# Check port 3000
if lsof -i :3000 > /dev/null 2>&1; then
    echo -e "${GREEN}🟢 Port 3000${NC} - In use (Frontend UI)"
else
    echo -e "${RED}🔴 Port 3000${NC} - Available"
fi

echo ""
echo "📝 Recent Logs:"
echo "--------------"

if [ -f "logs/trading-engine.log" ]; then
    echo -e "${BLUE}Trading Engine (last 3 lines):${NC}"
    tail -3 logs/trading-engine.log | sed 's/^/  /'
else
    echo -e "${YELLOW}⚠️  No Trading Engine log found${NC}"
fi

echo ""

if [ -f "logs/frontend-ui.log" ]; then
    echo -e "${BLUE}Frontend UI (last 3 lines):${NC}"
    tail -3 logs/frontend-ui.log | sed 's/^/  /'
else
    echo -e "${YELLOW}⚠️  No Frontend UI log found${NC}"
fi

echo ""
echo "🎯 Quick Actions:"
echo "----------------"

if [ $TRADING_STATUS -eq 0 ] && [ $FRONTEND_STATUS -eq 0 ]; then
    echo -e "${GREEN}🎉 All services are running!${NC}"
    echo "   • Trading Dashboard: http://localhost:3000"
    echo "   • Trading API: http://localhost:8080"
    echo "   • Stop services: ./stop-services.sh"
else
    echo -e "${YELLOW}⚠️  Some services are not running${NC}"
    echo "   • Start services: ./start-services.sh"
    echo "   • Check logs in logs/ directory"
fi

echo ""
