'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { TradingSettingsPanel } from "@/components/trading-settings-panel"
import { TechnicalIndicatorsDisplay } from "@/components/technical-indicators-display"

const TRADING_ENGINE_URL = process.env.NEXT_PUBLIC_TRADING_ENGINE_URL || 'http://localhost:8080'

interface MarketData {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  technical?: any
  lastUpdate: string
  isActive: boolean
}

interface TradingSettings {
  minConfidence: number
  maxPositionSize: number
  riskPerTrade: number
  maxDailyLoss: number
  maxPositions: number
  stopLossPercent: number
  takeProfitPercent: number
  maxHoldTime: number
  scalingFactor: number
  isEnabled: boolean
}

interface TradingState {
  trades: any[]
  positions: any[]
  totalPnL: number
  dayPnL: number
  tradingBalance: number
  availableBalance: number
  settings: TradingSettings
  watchlist: MarketData[]
}

export default function Home() {
  const [tradingState, setTradingState] = useState<TradingState | null>(null)
  const [isEnabled, setIsEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState<TradingSettings | null>(null)
  const [settingsLoading, setSettingsLoading] = useState(false)

  // Fetch trading state from backend
  useEffect(() => {
    const fetchTradingState = async () => {
      try {
        console.log('🔗 Connecting to Trading Engine at:', TRADING_ENGINE_URL)
        const response = await fetch(`${TRADING_ENGINE_URL}/api/trading-state`)
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const data = await response.json()
        console.log('📊 Trading state received:', data)
        setTradingState(data)
        setIsEnabled(data.settings?.isEnabled || false)
        setSettings(data.settings)
        setError(null)
      } catch (error) {
        console.error('❌ Error fetching trading state:', error)
        setError(error instanceof Error ? error.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchTradingState()
    
    // Refresh trading state every 10 seconds
    const interval = setInterval(fetchTradingState, 10000)
    return () => clearInterval(interval)
  }, [])

  const handleToggle = async (enabled: boolean) => {
    try {
      const endpoint = enabled ? '/api/trading/enable' : '/api/trading/disable'
      const response = await fetch(`${TRADING_ENGINE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        setIsEnabled(enabled)
        console.log('✅ Trading status updated:', enabled)
      } else {
        console.error('❌ Failed to update trading status')
      }
    } catch (error) {
      console.error('❌ Error toggling trading:', error)
    }
  }

  const handleSettingsUpdate = async (newSettings: TradingSettings) => {
    setSettingsLoading(true)
    try {
      const response = await fetch(`${TRADING_ENGINE_URL}/api/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newSettings)
      })
      
      if (response.ok) {
        setSettings(newSettings)
        console.log('✅ Settings updated:', newSettings)
        
        // Refresh trading state to get updated data
        const stateResponse = await fetch(`${TRADING_ENGINE_URL}/api/trading-state`)
        if (stateResponse.ok) {
          const data = await stateResponse.json()
          setTradingState(data)
        }
      } else {
        console.error('❌ Failed to update settings')
      }
    } catch (error) {
      console.error('❌ Error updating settings:', error)
    } finally {
      setSettingsLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Connecting to Trading Engine...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Connection Error</h1>
          <p className="text-gray-600 mb-4">Failed to connect to Trading Engine</p>
          <p className="text-sm text-gray-500">{error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-4"
          >
            Retry Connection
          </Button>
        </div>
      </div>
    )
  }

  return (
          <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            🚀 Crypto Trading Dashboard
          </h1>

          {/* Trading Control Panel */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Trading Engine
                <Badge variant={isEnabled ? "default" : "secondary"}>
                  {isEnabled ? "ACTIVE" : "INACTIVE"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={isEnabled}
                  onCheckedChange={handleToggle}
                />
                <span className="text-sm">
                  {isEnabled ? "Trading Enabled" : "Trading Disabled"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total:</span>
                  <span className="font-semibold">
                    ${tradingState?.tradingBalance?.toLocaleString() || '0'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Available:</span>
                  <span className="font-semibold">
                    ${tradingState?.availableBalance?.toLocaleString() || '0'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>P&L</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total:</span>
                  <span className={`font-semibold ${
                    (tradingState?.totalPnL || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    ${tradingState?.totalPnL?.toFixed(2) || '0.00'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Today:</span>
                  <span className={`font-semibold ${
                    (tradingState?.dayPnL || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    ${tradingState?.dayPnL?.toFixed(2) || '0.00'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Settings
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  ⚙️ Configure
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Min Confidence:</span>
                  <span>{settings?.minConfidence || 0}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Stop Loss:</span>
                  <span>{settings?.stopLossPercent || 0}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Settings Panel */}
        {showSettings && settings && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>⚙️ Trading Settings</CardTitle>
              <CardDescription>
                Configure your trading parameters and risk management settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TradingSettingsPanel 
                settings={settings}
                onUpdate={handleSettingsUpdate}
                loading={settingsLoading}
              />
            </CardContent>
          </Card>
        )}

        {/* Active Positions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              📈 Active Positions
              <Badge variant="outline">
                {tradingState?.positions?.length || 0} Open
              </Badge>
            </CardTitle>
            <CardDescription>
              Current open positions with real-time P&L
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tradingState?.positions && tradingState.positions.length > 0 ? (
              <div className="space-y-4">
                {tradingState.positions.map((position) => {
                  const pnlColor = position.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600';
                  const pnlIcon = position.unrealizedPnL >= 0 ? '📈' : '📉';
                  const entryTime = new Date(position.entryTime).toLocaleString();
                  
                  return (
                    <div key={position.id} className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <div className="font-semibold text-lg">{position.symbol}</div>
                          <div className="text-sm text-gray-600">
                            {position.quantity.toFixed(6)} @ ${position.avgBuyPrice.toFixed(2)}
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-sm text-gray-500">Current Value</div>
                          <div className="font-semibold">
                            ${position.currentValue.toFixed(2)}
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-sm text-gray-500">P&L {pnlIcon}</div>
                          <div className={`font-semibold ${pnlColor}`}>
                            ${position.unrealizedPnL.toFixed(2)}
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-sm text-gray-500">Entry Time</div>
                          <div className="text-sm">
                            {entryTime}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Target: </span>
                          <span className="text-green-600 font-medium">
                            ${position.targetPrice?.toFixed(2) || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Stop Loss: </span>
                          <span className="text-red-600 font-medium">
                            ${position.stopLossPrice?.toFixed(2) || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">💤</div>
                <div>No active positions</div>
                <div className="text-sm">Positions will appear here when trades are executed</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trading History */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              📊 Trading History
              <Badge variant="outline">
                {tradingState?.trades?.length || 0} Trades
              </Badge>
            </CardTitle>
            <CardDescription>
              Recent trading activity and executed orders
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tradingState?.trades && tradingState.trades.length > 0 ? (
              <div className="space-y-3">
                {tradingState.trades.slice(0, 10).map((trade) => {
                  const tradeTime = new Date(trade.timestamp).toLocaleString();
                  const typeColor = trade.type === 'BUY' ? 'text-green-600' : 'text-red-600';
                  const typeIcon = trade.type === 'BUY' ? '🟢' : '🔴';
                  const signalBadgeColor = trade.signal === 'STRONG_BUY' ? 'bg-green-100 text-green-800' : 
                                          trade.signal === 'STRONG_SELL' ? 'bg-red-100 text-red-800' :
                                          trade.signal === 'BUY' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800';
                  
                  return (
                    <div key={trade.id} className="border rounded-lg p-3 bg-white hover:bg-gray-50 transition-colors">
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
                        <div>
                          <div className="font-semibold">{trade.symbol}</div>
                          <div className="text-sm text-gray-500">{tradeTime}</div>
                        </div>
                        
                        <div>
                          <div className={`font-semibold ${typeColor}`}>
                            {typeIcon} {trade.type}
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-sm text-gray-500">Price</div>
                          <div className="font-medium">${trade.price.toFixed(2)}</div>
                        </div>
                        
                        <div>
                          <div className="text-sm text-gray-500">Quantity</div>
                          <div className="font-medium">{trade.quantity.toFixed(6)}</div>
                        </div>
                        
                        <div className="flex flex-col items-end">
                          <Badge className={`text-xs ${signalBadgeColor}`}>
                            {trade.signal}
                          </Badge>
                          <div className="text-sm text-gray-500 mt-1">
                            {trade.confidence}% confidence
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {tradingState.trades.length > 10 && (
                  <div className="text-center py-2">
                    <div className="text-sm text-gray-500">
                      Showing latest 10 trades out of {tradingState.trades.length} total
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📈</div>
                <div>No trading history</div>
                <div className="text-sm">Trade history will appear here after trades are executed</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Market Data */}
        <Card>
          <CardHeader>
            <CardTitle>Live Market Data</CardTitle>
            <CardDescription>
              Real-time cryptocurrency prices with technical analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tradingState?.watchlist?.map((coin) => (
                <div 
                  key={coin.symbol} 
                  className="border rounded-lg p-4 bg-white shadow-sm"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold">{coin.name}</h3>
                      <p className="text-sm text-gray-500">{coin.symbol}</p>
                    </div>
                    <Badge 
                      variant={coin.isActive ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {coin.isActive ? "ACTIVE" : "INACTIVE"}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-lg font-bold">
                        ${coin.price?.toLocaleString() || '0'}
                      </span>
                      <span className={`text-sm ${
                        (coin.changePercent || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {coin.changePercent ? 
                          `${coin.changePercent > 0 ? '+' : ''}${coin.changePercent.toFixed(2)}%` 
                          : '0.00%'
                        }
                      </span>
                    </div>
                    
                    {/* Technical Indicators */}
                    <TechnicalIndicatorsDisplay technical={coin.technical} />
                  </div>
                  
                  <div className="text-xs text-gray-400 mt-2">
                    Updated: {new Date(coin.lastUpdate).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* API Endpoints */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>🔗 Backend Integration Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Available Endpoints:</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>✅ <code>/api/health</code> - System health</li>
                  <li>✅ <code>/api/trading-state</code> - Trading data</li>
                  <li>✅ <code>/api/market-data</code> - Live prices</li>
                  <li>✅ <code>/api/trading/status</code> - Engine status</li>
                  <li>✅ <code>/api/performance</code> - Performance metrics</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Connection Info:</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>🎯 Backend: <code>{TRADING_ENGINE_URL}</code></li>
                  <li>🔄 Auto-refresh: 10 seconds</li>
                  <li>📊 Data source: Binance API</li>
                  <li>🧪 Environment: Testnet</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
