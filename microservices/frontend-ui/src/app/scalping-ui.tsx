'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { TrendingUp, TrendingDown, Minus, RotateCcw, Trash, X, Wifi, WifiOff, Play, Pause, Settings, DollarSign, Zap, Target, Activity } from 'lucide-react'

// API Configuration
const TRADING_ENGINE_URL = process.env.NEXT_PUBLIC_TRADING_ENGINE_URL || 'http://localhost:8080'

interface Position {
  id: string
  symbol: string
  side: 'buy' | 'sell'
  size: number
  entryPrice: number
  currentPrice: number
  pnl: number
  pnlPercent: number
  timestamp: number
}

interface TradingStatus {
  isActive: boolean
  totalPnL: number
  dailyPnL: number
  totalTrades: number
  winRate: number
  activePositions: Position[]
}

interface MarketData {
  symbol: string
  price: number
  change24h: number
  volume: number
  timestamp: number
}

export default function ScalpingTradingUI() {
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected')
  const [tradingStatus, setTradingStatus] = useState<TradingStatus>({
    isActive: false,
    totalPnL: 0,
    dailyPnL: 0,
    totalTrades: 0,
    winRate: 0,
    activePositions: []
  })
  const [marketData, setMarketData] = useState<MarketData[]>([])
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT')
  const [riskAmount, setRiskAmount] = useState(100)
  const [isAutoTrading, setIsAutoTrading] = useState(false)

  // WebSocket connection
  useEffect(() => {
    let ws: WebSocket

    const connectWebSocket = () => {
      try {
        setConnectionStatus('connecting')
        ws = new WebSocket('ws://localhost:8080/ws')

        ws.onopen = () => {
          setConnectionStatus('connected')
          console.log('Connected to Trading Engine WebSocket')
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            
            if (data.type === 'market_data') {
              setMarketData(prev => {
                const updated = [...prev]
                const index = updated.findIndex(item => item.symbol === data.symbol)
                if (index >= 0) {
                  updated[index] = data
                } else {
                  updated.push(data)
                }
                return updated.slice(0, 10) // Keep only top 10
              })
            } else if (data.type === 'trading_status') {
              setTradingStatus(data)
            }
          } catch (error) {
            console.error('Error parsing WebSocket data:', error)
          }
        }

        ws.onclose = () => {
          setConnectionStatus('disconnected')
          setTimeout(connectWebSocket, 3000) // Reconnect after 3 seconds
        }

        ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          setConnectionStatus('disconnected')
        }
      } catch (error) {
        console.error('Failed to connect WebSocket:', error)
        setConnectionStatus('disconnected')
      }
    }

    connectWebSocket()

    return () => {
      if (ws) {
        ws.close()
      }
    }
  }, [])

  const checkConnection = async () => {
    try {
      setConnectionStatus('connecting')
      const response = await fetch(`${TRADING_ENGINE_URL}/health`)
      if (response.ok) {
        setConnectionStatus('connected')
      } else {
        setConnectionStatus('disconnected')
      }
    } catch (error) {
      setConnectionStatus('disconnected')
    }
  }

  const toggleAutoTrading = async () => {
    try {
      const response = await fetch(`${TRADING_ENGINE_URL}/api/trading/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !isAutoTrading })
      })
      
      if (response.ok) {
        setIsAutoTrading(!isAutoTrading)
      }
    } catch (error) {
      console.error('Failed to toggle trading:', error)
    }
  }

  const executeManualTrade = async (side: 'buy' | 'sell') => {
    try {
      const response = await fetch(`${TRADING_ENGINE_URL}/api/trading/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: selectedSymbol,
          side,
          amount: riskAmount
        })
      })
      
      if (response.ok) {
        console.log(`Manual ${side} order executed`)
      }
    } catch (error) {
      console.error('Failed to execute manual trade:', error)
    }
  }

  const closePosition = async (positionId: string) => {
    try {
      const response = await fetch(`${TRADING_ENGINE_URL}/api/positions/${positionId}/close`, {
        method: 'POST'
      })
      
      if (response.ok) {
        console.log('Position closed')
      }
    } catch (error) {
      console.error('Failed to close position:', error)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    }).format(price)
  }

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-gray-900">⚡ Scalping Trading Dashboard</h1>
            <Badge variant={connectionStatus === 'connected' ? 'default' : 'secondary'}>
              {connectionStatus === 'connected' ? <Wifi className="h-4 w-4 mr-1" /> : <WifiOff className="h-4 w-4 mr-1" />}
              {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
            </Badge>
            <Badge variant={isAutoTrading ? 'default' : 'secondary'}>
              {isAutoTrading ? <Play className="h-4 w-4 mr-1" /> : <Pause className="h-4 w-4 mr-1" />}
              {isAutoTrading ? 'Auto Trading ON' : 'Auto Trading OFF'}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              onClick={checkConnection} 
              disabled={connectionStatus === 'connecting'}
              variant="outline"
              size="sm"
            >
              {connectionStatus === 'connecting' ? 'Checking...' : 'Check Connection'}
            </Button>
          </div>
        </div>

        {/* Trading Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Auto Trading Control */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Trading Control
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-trading">Auto Trading</Label>
                <Switch 
                  id="auto-trading"
                  checked={isAutoTrading}
                  onCheckedChange={toggleAutoTrading}
                  disabled={connectionStatus !== 'connected'}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="symbol">Symbol</Label>
                <Input
                  id="symbol"
                  value={selectedSymbol}
                  onChange={(e) => setSelectedSymbol(e.target.value)}
                  placeholder="BTCUSDT"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="risk">Risk Amount ($)</Label>
                <Input
                  id="risk"
                  type="number"
                  value={riskAmount}
                  onChange={(e) => setRiskAmount(Number(e.target.value))}
                  placeholder="100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => executeManualTrade('buy')}
                  disabled={connectionStatus !== 'connected'}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <TrendingUp className="h-4 w-4 mr-1" />
                  BUY
                </Button>
                <Button
                  onClick={() => executeManualTrade('sell')}
                  disabled={connectionStatus !== 'connected'}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <TrendingDown className="h-4 w-4 mr-1" />
                  SELL
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* P&L Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                P&L Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total P&L</span>
                  <span className={`font-bold ${tradingStatus.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPrice(tradingStatus.totalPnL)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Daily P&L</span>
                  <span className={`font-bold ${tradingStatus.dailyPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPrice(tradingStatus.dailyPnL)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Trades</span>
                  <span className="font-bold">{tradingStatus.totalTrades}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Win Rate</span>
                  <span className="font-bold text-blue-600">{tradingStatus.winRate.toFixed(1)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Market Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Market Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {marketData.length > 0 ? marketData.slice(0, 5).map((data) => (
                  <div key={data.symbol} className="flex justify-between items-center text-sm">
                    <span className="font-medium">{data.symbol}</span>
                    <div className="text-right">
                      <div className="font-bold">{formatPrice(data.price)}</div>
                      <div className={`text-xs ${data.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercent(data.change24h)}
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center text-gray-500 text-sm">
                    No market data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Positions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2" />
              Active Positions ({tradingStatus.activePositions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tradingStatus.activePositions.length > 0 ? (
              <div className="space-y-3">
                {tradingStatus.activePositions.map((position) => (
                  <div key={position.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div>
                        <div className="font-medium">{position.symbol}</div>
                        <div className="text-sm text-gray-600">
                          {position.side.toUpperCase()} • {position.size} @ {formatPrice(position.entryPrice)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="font-medium">{formatPrice(position.currentPrice)}</div>
                        <div className={`text-sm ${position.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatPrice(position.pnl)} ({formatPercent(position.pnlPercent)})
                        </div>
                      </div>
                      
                      <Button
                        onClick={() => closePosition(position.id)}
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                No active positions
              </div>
            )}
          </CardContent>
        </Card>

        {/* Connection Status */}
        {connectionStatus !== 'connected' && (
          <Alert variant="destructive">
            <AlertDescription>
              ❌ Cannot connect to Trading Engine at {TRADING_ENGINE_URL}. 
              Please ensure the Trading Engine service is running on port 8080.
            </AlertDescription>
          </Alert>
        )}
        
        {connectionStatus === 'connected' && (
          <Alert className="bg-green-50 border-green-200">
            <AlertDescription className="text-green-800">
              ✅ Connected to Trading Engine! Ready for scalping operations.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
