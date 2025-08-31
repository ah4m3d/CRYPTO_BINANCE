'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Plus, 
  X, 
  RefreshCw,
  BarChart3,
  Target,
  Shield,
  Zap
} from 'lucide-react'
import { AdvancedTechnicalIndicators, formatAdvancedTechnicalAnalysis } from '@/lib/advanced-technical-indicators'
import AutoTrader from './auto-trader'

interface Stock {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  technicalAnalysis?: AdvancedTechnicalIndicators
  isLoading?: boolean
  error?: string
}

interface TimeframeOption {
  label: string
  value: string
  interval: string
  period: string
  refreshRate: number
}

const TIMEFRAME_OPTIONS: TimeframeOption[] = [
  { label: '3 Seconds', value: '3s', interval: '1m', period: '1d', refreshRate: 3 },
  { label: '5 Seconds', value: '5s', interval: '1m', period: '1d', refreshRate: 5 },
  { label: '10 Seconds', value: '10s', interval: '1m', period: '1d', refreshRate: 10 },
  { label: '30 Seconds', value: '30s', interval: '1m', period: '1d', refreshRate: 30 },
  { label: '1 Minute', value: '1m', interval: '1m', period: '5d', refreshRate: 60 },
  { label: '5 Minutes', value: '5m', interval: '5m', period: '1mo', refreshRate: 300 },
  { label: '15 Minutes', value: '15m', interval: '15m', period: '3mo', refreshRate: 900 },
  { label: '30 Minutes', value: '30m', interval: '30m', period: '6mo', refreshRate: 1800 },
  { label: '1 Hour', value: '1h', interval: '1h', period: '1y', refreshRate: 3600 },
  { label: '4 Hours', value: '4h', interval: '1h', period: '2y', refreshRate: 14400 },
  { label: '1 Day', value: '1d', interval: '1d', period: '5y', refreshRate: 86400 }
]

const AI_WATCHLIST_STOCKS = [
  // Major Cryptocurrencies
  'BTC-USD', 'ETH-USD', 'BNB-USD', 'XRP-USD', 'ADA-USD',
  'SOL-USD', 'DOGE-USD', 'MATIC-USD', 'DOT-USD', 'LINK-USD'
]

interface AIWatchlistAnalyzerProps {
  onTechnicalDataUpdate?: (data: { [symbol: string]: any }) => void
  autoTradingEnabled?: boolean
  onAutoTradingToggle?: (enabled: boolean) => void
}

export default function AIWatchlistAnalyzer({ 
  onTechnicalDataUpdate, 
  autoTradingEnabled: propAutoTradingEnabled,
  onAutoTradingToggle 
}: AIWatchlistAnalyzerProps = {}) {
  const [stocks, setStocks] = useState<Stock[]>([])
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeOption>(TIMEFRAME_OPTIONS[4]) // 1m default
  const [customSymbol, setCustomSymbol] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  
  // Use prop-based auto-trading state if available, otherwise use internal state
  const [internalAutoTradingEnabled, setInternalAutoTradingEnabled] = useState(false)
  const autoTradingEnabled = propAutoTradingEnabled !== undefined ? propAutoTradingEnabled : internalAutoTradingEnabled

  // Load auto trading state from localStorage on component mount (only for internal state)
  useEffect(() => {
    // Only manage internal state if not controlled by props
    if (propAutoTradingEnabled === undefined) {
      try {
        let savedAutoTradingState = localStorage.getItem('autoTradingEnabled')
        
        // If main state is missing, try backup
        if (savedAutoTradingState === null) {
          savedAutoTradingState = localStorage.getItem('autoTradingEnabled_backup')
          if (savedAutoTradingState !== null) {
            console.log('🔄 Restored from backup state')
            // Restore main state from backup
            localStorage.setItem('autoTradingEnabled', savedAutoTradingState)
          }
        }
        
        if (savedAutoTradingState !== null) {
          const parsedState = JSON.parse(savedAutoTradingState)
          setInternalAutoTradingEnabled(parsedState)
          console.log('✅ Auto trading state restored:', parsedState)
        } else {
          console.log('ℹ️ No saved auto trading state found, defaulting to false')
        }
      } catch (error) {
        console.error('❌ Error loading auto trading state:', error)
        setInternalAutoTradingEnabled(false)
      }
    }
  }, [propAutoTradingEnabled])

  // Save auto trading state to localStorage (only for internal state)
  useEffect(() => {
    if (propAutoTradingEnabled === undefined) {
      try {
        localStorage.setItem('autoTradingEnabled', JSON.stringify(internalAutoTradingEnabled))
        // Also set a backup key for redundancy
        localStorage.setItem('autoTradingEnabled_backup', JSON.stringify(internalAutoTradingEnabled))
        console.log('💾 Auto trading state saved:', internalAutoTradingEnabled)
      } catch (error) {
        console.error('❌ Error saving auto trading state:', error)
      }
    }
  }, [internalAutoTradingEnabled, propAutoTradingEnabled])

  // Enhanced toggle function with immediate persistence
  const handleAutoTradingToggle = (enabled: boolean) => {
    console.log('🔄 Auto trading toggle initiated:', enabled)
    
    // Use prop callback if available, otherwise use internal state
    if (onAutoTradingToggle) {
      onAutoTradingToggle(enabled)
    } else {
      setInternalAutoTradingEnabled(enabled)
      
      // Immediate backup save to ensure persistence
      try {
        localStorage.setItem('autoTradingEnabled', JSON.stringify(enabled))
        localStorage.setItem('autoTradingEnabled_backup', JSON.stringify(enabled))
        console.log('✅ Auto trading state immediately saved:', enabled)
      } catch (error) {
        console.error('❌ Error in immediate save:', error)
      }
    }
  }

  // Additional persistence check on window focus/visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Window became visible, re-verify state (only for internal state)
        if (propAutoTradingEnabled === undefined) {
          try {
            const currentState = localStorage.getItem('autoTradingEnabled')
            if (currentState !== null) {
              const parsedState = JSON.parse(currentState)
              if (parsedState !== autoTradingEnabled) {
                console.log('🔍 State mismatch detected, restoring from localStorage:', parsedState)
                setInternalAutoTradingEnabled(parsedState)
              }
            }
          } catch (error) {
            console.error('❌ Error in visibility change handler:', error)
          }
        }
      }
    }

    const handleBeforeUnload = () => {
      // Ensure state is saved before page unload
      try {
        localStorage.setItem('autoTradingEnabled', JSON.stringify(autoTradingEnabled))
        localStorage.setItem('autoTradingEnabled_backup', JSON.stringify(autoTradingEnabled))
      } catch (error) {
        console.error('❌ Error in beforeunload handler:', error)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [autoTradingEnabled])
  
  // Convert stocks array to technical data format for AutoTrader
  const technicalData = stocks.reduce((acc, stock) => {
    if (stock.technicalAnalysis) {
      acc[stock.symbol] = {
        quote: {
          regularMarketPrice: stock.price,
          regularMarketChange: stock.change,
          regularMarketChangePercent: stock.changePercent,
          symbol: stock.symbol,
          shortName: stock.name
        },
        technicalAnalysis: stock.technicalAnalysis
      }
    }
    return acc
  }, {} as any)

  // Fetch advanced technical analysis for a stock
  const fetchAdvancedTechnicalAnalysis = useCallback(async (symbol: string) => {
    try {
      console.log(`Fetching technical analysis for ${symbol} with timeframe ${selectedTimeframe.value}`)
      
      const response = await fetch('/api/stocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbols: [symbol],
          interval: selectedTimeframe.interval,
          period: selectedTimeframe.period,
          timeframe: selectedTimeframe.value
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log(`API response for ${symbol}:`, data)
      console.log(`API response keys:`, Object.keys(data))
      console.log(`API response results:`, data.results)
      
      // Get result by exact symbol match
      let result = data.results?.[symbol]
      
      console.log(`Final result for ${symbol}:`, result)
      console.log(`Result has quote:`, !!result?.quote)
      console.log(`Result has technicalAnalysis:`, !!result?.technicalAnalysis)
      
      return result || null
    } catch (error) {
      console.error(`Error fetching data for ${symbol}:`, error)
      return null
    }
  }, [selectedTimeframe])

  // Initialize watchlist with default stocks
  const initializeWatchlist = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const stockPromises = AI_WATCHLIST_STOCKS.map(async (symbol) => {
        const data = await fetchAdvancedTechnicalAnalysis(symbol)
        
        if (data?.quote) {
          return {
            symbol,
            name: data.quote.shortName || symbol,
            price: data.quote.regularMarketPrice || 0,
            change: data.quote.regularMarketChange || 0,
            changePercent: data.quote.regularMarketChangePercent || 0,
            technicalAnalysis: data.technicalAnalysis,
            isLoading: false,
            error: undefined
          }
        }
        
        console.warn(`No quote data found for ${symbol}, data received:`, data)
        return {
          symbol,
          name: symbol,
          price: 0,
          change: 0,
          changePercent: 0,
          error: 'No quote data available',
          isLoading: false
        }
      })

      const stocksData = await Promise.all(stockPromises)
      setStocks(stocksData)
      setLastUpdate(new Date())
    } catch (error) {
      setError('Failed to initialize watchlist')
      console.error('Watchlist initialization error:', error)
    } finally {
      setIsLoading(false)
    }
  }, [fetchAdvancedTechnicalAnalysis])

  // Add custom stock to watchlist
  const addCustomStock = async () => {
    if (!customSymbol.trim()) return

    const symbol = customSymbol.toUpperCase().trim()
    if (stocks.some(stock => stock.symbol === symbol)) {
      setError('Stock already in watchlist')
      return
    }

    setStocks(prev => [...prev, {
      symbol,
      name: symbol,
      price: 0,
      change: 0,
      changePercent: 0,
      isLoading: true
    }])

    const data = await fetchAdvancedTechnicalAnalysis(symbol)
    
    setStocks(prev => prev.map(stock => 
      stock.symbol === symbol 
        ? {
            ...stock,
            name: data?.quote?.shortName || symbol,
            price: data?.quote?.regularMarketPrice || 0,
            change: data?.quote?.regularMarketChange || 0,
            changePercent: data?.quote?.regularMarketChangePercent || 0,
            technicalAnalysis: data?.technicalAnalysis,
            isLoading: false,
            error: data?.quote ? undefined : 'No quote data available'
          }
        : stock
    ))

    setCustomSymbol('')
  }

  // Remove stock from watchlist
  const removeStock = (symbol: string) => {
    setStocks(prev => prev.filter(stock => stock.symbol !== symbol))
  }

  // Refresh all stocks
  const refreshAllStocks = async () => {
    setIsLoading(true)
    
    const updatedStocks = await Promise.all(
      stocks.map(async (stock) => {
        const data = await fetchAdvancedTechnicalAnalysis(stock.symbol)
        
        return {
          ...stock,
          price: data?.quote?.regularMarketPrice || stock.price,
          change: data?.quote?.regularMarketChange || stock.change,
          changePercent: data?.quote?.regularMarketChangePercent || stock.changePercent,
          technicalAnalysis: data?.technicalAnalysis || stock.technicalAnalysis,
          error: data ? undefined : 'Failed to refresh'
        }
      })
    )
    
    setStocks(updatedStocks)
    setLastUpdate(new Date())
    setIsLoading(false)
    
    // Share technical data with other components
    if (onTechnicalDataUpdate) {
      const technicalData: { [symbol: string]: any } = {}
      updatedStocks.forEach(stock => {
        if (stock.technicalAnalysis) {
          technicalData[stock.symbol] = {
            quote: {
              regularMarketPrice: stock.price,
              regularMarketChange: stock.change,
              regularMarketChangePercent: stock.changePercent
            },
            technicalAnalysis: stock.technicalAnalysis
          }
        }
      })
      onTechnicalDataUpdate(technicalData)
    }
  }

  // Handle timeframe change
  const handleTimeframeChange = (newTimeframe: TimeframeOption) => {
    setSelectedTimeframe(newTimeframe)
    // Refresh all technical analysis with new timeframe
    setTimeout(refreshAllStocks, 100)
  }

  // Auto-refresh based on timeframe
  useEffect(() => {
    const interval = setInterval(() => {
      if (stocks.length > 0) {
        refreshAllStocks()
      }
    }, selectedTimeframe.refreshRate * 1000)

    return () => clearInterval(interval)
  }, [selectedTimeframe, stocks.length])

  // Initialize on mount
  useEffect(() => {
    initializeWatchlist()
  }, [])

  // Get signal color and icon
  const getSignalDisplay = (signal?: string) => {
    switch (signal) {
      case 'STRONG_BUY':
        return { color: 'bg-green-600', icon: <TrendingUp className="w-4 h-4" />, text: 'Strong Buy' }
      case 'BUY':
        return { color: 'bg-green-500', icon: <TrendingUp className="w-4 h-4" />, text: 'Buy' }
      case 'SELL':
        return { color: 'bg-red-500', icon: <TrendingDown className="w-4 h-4" />, text: 'Sell' }
      case 'STRONG_SELL':
        return { color: 'bg-red-600', icon: <TrendingDown className="w-4 h-4" />, text: 'Strong Sell' }
      default:
        return { color: 'bg-gray-500', icon: <Minus className="w-4 h-4" />, text: 'Hold' }
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      {/* Auto Trading Component */}
      <AutoTrader 
        technicalData={technicalData}
        isEnabled={autoTradingEnabled}
        onToggle={handleAutoTradingToggle}
      />
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            AI Watchlist Analyzer
            <Badge variant="outline" className="ml-auto">
              Advanced Technical Analysis
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Timeframe Selection */}
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-2">Analysis Timeframe</h3>
            <div className="flex flex-wrap gap-2">
              {TIMEFRAME_OPTIONS.map((timeframe) => (
                <Button
                  key={timeframe.value}
                  variant={selectedTimeframe.value === timeframe.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleTimeframeChange(timeframe)}
                  className="h-8"
                >
                  {timeframe.label}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Auto-refresh: {selectedTimeframe.refreshRate}s | 
              Current: {selectedTimeframe.label}
            </p>
          </div>

          {/* Add Custom Stock */}
          <div className="flex gap-2 mb-6">
            <Input
              placeholder="Add stock symbol (e.g., AAPL, GOOGL)"
              value={customSymbol}
              onChange={(e) => setCustomSymbol(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addCustomStock()}
              className="flex-1"
            />
            <Button onClick={addCustomStock} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add Stock
            </Button>
            <Button onClick={refreshAllStocks} variant="outline" size="sm" disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh All
            </Button>
          </div>

          {error && (
            <Alert className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {lastUpdate && (
            <p className="text-xs text-muted-foreground mb-4">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          )}

          {/* Watchlist Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stocks.map((stock) => (
              <Card key={stock.symbol} className="relative">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{stock.symbol}</CardTitle>
                      <p className="text-sm text-muted-foreground truncate">
                        {stock.name}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeStock(stock.symbol)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {stock.isLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <RefreshCw className="w-6 h-6 animate-spin" />
                    </div>
                  ) : stock.error ? (
                    <div className="text-red-500 text-sm">{stock.error}</div>
                  ) : (
                    <Tabs defaultValue="overview" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="indicators">Indicators</TabsTrigger>
                        <TabsTrigger value="targets">Targets</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="overview" className="space-y-3">
                        <div>
                          <p className="text-2xl font-bold">${stock.price.toFixed(2)}</p>
                          <p className={`text-sm ${stock.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)} 
                            ({stock.changePercent.toFixed(2)}%)
                          </p>
                        </div>
                        
                        {stock.technicalAnalysis && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              {(() => {
                                const display = getSignalDisplay(stock.technicalAnalysis.signal)
                                return (
                                  <>
                                    <Badge className={`${display.color} text-white`}>
                                      {display.icon}
                                      <span className="ml-1">{display.text}</span>
                                    </Badge>
                                    <span className="text-sm text-muted-foreground">
                                      {stock.technicalAnalysis.confidence}%
                                    </span>
                                  </>
                                )
                              })()}
                            </div>
                            
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span>Trend:</span>
                                <span className={
                                  stock.technicalAnalysis.analysis.trendDirection === 'UPTREND' ? 'text-green-600' :
                                  stock.technicalAnalysis.analysis.trendDirection === 'DOWNTREND' ? 'text-red-600' :
                                  'text-gray-600'
                                }>
                                  {stock.technicalAnalysis.analysis.trendDirection}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </TabsContent>
                      
                      <TabsContent value="indicators" className="space-y-3">
                        {stock.technicalAnalysis && (
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>RSI (14):</span>
                              <span className={
                                stock.technicalAnalysis.rsi < 30 ? 'text-green-600' :
                                stock.technicalAnalysis.rsi > 70 ? 'text-red-600' :
                                'text-gray-600'
                              }>
                                {stock.technicalAnalysis.rsi}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>VWAP:</span>
                              <span>${stock.technicalAnalysis.vwap}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>MA50:</span>
                              <span>${stock.technicalAnalysis.ma50}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>MA100:</span>
                              <span>${stock.technicalAnalysis.ma100}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>MA Signal:</span>
                              <span className={
                                stock.technicalAnalysis.analysis.maSignal === 'BULLISH' ? 'text-green-600' :
                                stock.technicalAnalysis.analysis.maSignal === 'BEARISH' ? 'text-red-600' :
                                'text-gray-600'
                              }>
                                {stock.technicalAnalysis.analysis.maSignal}
                              </span>
                            </div>
                          </div>
                        )}
                      </TabsContent>
                      
                      <TabsContent value="targets" className="space-y-3">
                        {stock.technicalAnalysis?.priceTargets && (
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center">
                              <span className="flex items-center gap-1">
                                <Target className="w-3 h-3 text-green-600" />
                                Buy Price:
                              </span>
                              <span className="text-green-600 font-medium">
                                ${stock.technicalAnalysis.priceTargets.buyPrice}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="flex items-center gap-1">
                                <Target className="w-3 h-3 text-red-600" />
                                Sell Price:
                              </span>
                              <span className="text-red-600 font-medium">
                                ${stock.technicalAnalysis.priceTargets.sellPrice}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="flex items-center gap-1">
                                <Shield className="w-3 h-3 text-orange-600" />
                                Stop Loss:
                              </span>
                              <span className="text-orange-600 font-medium">
                                ${stock.technicalAnalysis.priceTargets.stopLoss}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="flex items-center gap-1">
                                <Zap className="w-3 h-3 text-blue-600" />
                                Take Profit:
                              </span>
                              <span className="text-blue-600 font-medium">
                                ${stock.technicalAnalysis.priceTargets.takeProfit}
                              </span>
                            </div>
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {stocks.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No stocks in watchlist. Add some stocks to get started.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
