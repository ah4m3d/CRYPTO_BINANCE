# Trading Engine Microservice

## Overview
Standalone Go microservice that handles all cryptocurrency trading logic, technical analysis, and real-time market data processing.

## Features
- 🎯 **Real-time Trading**: Automated scalping based on technical indicators
- 📊 **Technical Analysis**: EMA, RSI, MACD, VWAP calculations
- 🛡️ **Risk Management**: Stop loss, take profit, position limits
- 🔌 **WebSocket Streaming**: Live market data from Binance
- 🌐 **REST API**: Full trading state management
- 📈 **Position Tracking**: Real-time P&L monitoring

## API Endpoints

### REST API
- `GET /api/trading/state` - Get current trading state
- `PUT /api/trading/settings` - Update trading settings
- `POST /api/trading/subscribe/{symbol}` - Subscribe to symbol
- `POST /api/trading/close/{symbol}` - Force close position
- `POST /api/trading/reset` - Reset trading balance
- `POST /api/trading/clear-trades` - Clear trade history
- `GET /health` - Health check

### WebSocket
- `ws://localhost:8080/ws` - Live data streaming

## Usage

```bash
# Install dependencies
go mod tidy

# Run the service
go run main.go
```

## Environment
- **Port**: 8080
- **WebSocket**: ws://localhost:8080/ws
- **API Base**: http://localhost:8080/api

## Integration
This microservice provides data to the Frontend UI microservice via HTTP/WebSocket APIs.
