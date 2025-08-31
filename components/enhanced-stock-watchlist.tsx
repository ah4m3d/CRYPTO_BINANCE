"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, TrendingUp, TrendingDown, Minus, BarChart3, Target, Zap, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { StockAutocompleteWithCallback } from "@/components/ui/stock-autocomplete-callback"
import { AIWatchlistDemo } from "@/components/ai-watchlist-demo"
import { TimeframeSelector } from "@/components/ui/timeframe-selector"
import { RealTimeIndicator } from "@/components/ui/real-time-indicator"
import { PerformanceMonitor } from "@/components/ui/performance-monitor"
import { yahooFinanceAPI, getPerformanceStats, getBatchQuotes } from "@/lib/stock-api"
import type { TechnicalIndicators } from "@/lib/technical-analysis"
import { TIMEFRAMES, type TimeframeOption } from "@/lib/technical-analysis"

interface Stock {
  symbol: string
  name: string
  currentPrice?: number
  change?: number
  changePercent?: number
  volume?: number
  error?: string
}

interface WatchlistStock extends Stock {
  signals?: TechnicalIndicators
  isAnalyzing?: boolean
}

const formatCurrency = (amount: number, currency: string = 'INR') => {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount)
}

const formatNumber = (num: number) => {
  if (num >= 10000000) {
    return `₹${(num / 10000000).toFixed(2)}Cr`
  } else if (num >= 100000) {
    return `₹${(num / 100000).toFixed(2)}L`
  } else if (num >= 1000) {
    return `₹${(num / 1000).toFixed(2)}K`
  }
  return `₹${num.toFixed(2)}`
}

const getTechnicalBadgeColor = (signal: string, confidence: number) => {
  if (confidence < 40) return "bg-gray-500"
  
  switch (signal) {
    case 'BUY':
      return confidence > 70 ? "bg-green-600" : "bg-green-500"
    case 'SELL':
      return confidence > 70 ? "bg-red-600" : "bg-red-500"
    default:
      return "bg-yellow-500"
  }
}

const SignalIcon = ({ signal }: { signal: string }) => {
  switch (signal) {
    case 'BUY':
      return <TrendingUp className="w-3 h-3" />
    case 'SELL':
      return <TrendingDown className="w-3 h-3" />
    default:
      return <Minus className="w-3 h-3" />
  }
}

export function EnhancedStockWatchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistStock[]>([])
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeOption>(TIMEFRAMES[3]) // Default to 30s
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastRefreshRef = useRef<number>(0)
  
  // Performance monitoring state
  const [performanceStats, setPerformanceStats] = useState({
    totalRequests: 0,
    cacheHits: 0,
    averageResponseTime: 0,
    rateLimitSkips: 0,
    lastRefresh: null as Date | null
  })

  const handleAddStock = useCallback(async (selectedStock: { symbol: string; name: string }) => {
    // Check if stock already exists in watchlist
    if (watchlist.some(stock => stock.symbol === selectedStock.symbol)) {
      setError(`${selectedStock.symbol} is already in your watchlist`)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const quote = await yahooFinanceAPI.getQuote(selectedStock.symbol)
      const newStock: WatchlistStock = {
        symbol: selectedStock.symbol,
        name: selectedStock.name,
        currentPrice: quote.price,
        change: quote.change,
        changePercent: quote.changePercent,
        volume: quote.volume,
        isAnalyzing: true
      }

      setWatchlist(prev => [...prev, newStock])

      // Fetch technical analysis in background
      try {
        console.log(`Fetching technical analysis for ${selectedStock.symbol} with timeframe ${selectedTimeframe.value}`)
        const technical = await yahooFinanceAPI.getTechnicalAnalysis(selectedStock.symbol, selectedTimeframe.value)
        console.log(`Received technical analysis for ${selectedStock.symbol}:`, technical)
        setWatchlist(prev => prev.map(stock => 
          stock.symbol === selectedStock.symbol 
            ? { ...stock, signals: technical, isAnalyzing: false }
            : stock
        ))
      } catch (techError) {
        console.error('Technical analysis failed:', techError)
        setWatchlist(prev => prev.map(stock => 
          stock.symbol === selectedStock.symbol 
            ? { ...stock, isAnalyzing: false }
            : stock
        ))
      }
    } catch (err) {
      setError(`Failed to add ${selectedStock.symbol}. Please try again.`)
      console.error('Error adding stock:', err)
    } finally {
      setIsLoading(false)
    }
  }, [watchlist])

  const handleRemoveStock = useCallback((symbol: string) => {
    setWatchlist(prev => prev.filter(stock => stock.symbol !== symbol))
  }, [])

  const refreshTechnicalAnalysis = useCallback(async (symbol: string) => {
    console.log(`Manually refreshing technical analysis for ${symbol} with timeframe ${selectedTimeframe.value}`)
    setWatchlist(prev => prev.map(stock => 
      stock.symbol === symbol 
        ? { ...stock, isAnalyzing: true }
        : stock
    ))

    try {
      const technical = await yahooFinanceAPI.getTechnicalAnalysis(symbol, selectedTimeframe.value)
      console.log(`Manual refresh - received technical analysis for ${symbol}:`, technical)
      setWatchlist(prev => prev.map(stock => 
        stock.symbol === symbol 
          ? { ...stock, signals: technical, isAnalyzing: false }
          : stock
      ))
    } catch (error) {
      console.error('Failed to refresh technical analysis:', error)
      setWatchlist(prev => prev.map(stock => 
        stock.symbol === symbol 
          ? { ...stock, isAnalyzing: false }
          : stock
      ))
    }
  }, [selectedTimeframe])

  const refreshAllPrices = useCallback(async () => {
    if (watchlist.length === 0) return

    // Rate limiting check - prevent calls more frequent than the selected timeframe
    const now = Date.now()
    const minInterval = selectedTimeframe.refreshRate * 800 // Convert to ms and allow 80% of the interval for flexibility
    
    if (now - lastRefreshRef.current < minInterval) {
      console.log(`Rate limiting: Skipping refresh (last: ${now - lastRefreshRef.current}ms, min: ${minInterval}ms)`)
      setPerformanceStats(prev => ({
        ...prev,
        rateLimitSkips: prev.rateLimitSkips + 1
      }))
      return
    }

    setIsLoading(true)
    setError(null)

    const requestStart = Date.now()

    try {
      const symbols = watchlist.map(stock => stock.symbol)
      console.log(`Fetching data for ${symbols.length} symbols:`, symbols)
      
      // Update last refresh time before making the call
      lastRefreshRef.current = now
      
      const quotes = await getBatchQuotes(symbols, selectedTimeframe.value)
      const technicalData = await yahooFinanceAPI.getBatchTechnicalAnalysis(symbols, selectedTimeframe.value)

      const requestEnd = Date.now()
      const responseTime = requestEnd - requestStart

      // Update performance stats
      const apiStats = getPerformanceStats()
      setPerformanceStats(prev => {
        const newTotalRequests = prev.totalRequests + 1
        const newAverageResponseTime = Math.round(
          (prev.averageResponseTime * prev.totalRequests + responseTime) / newTotalRequests
        )
        
        return {
          ...prev,
          totalRequests: newTotalRequests,
          cacheHits: apiStats.cacheHits,
          averageResponseTime: newAverageResponseTime,
          lastRefresh: new Date()
        }
      })

      setWatchlist(prev => prev.map(stock => {
        const quote = quotes.find((q: any) => q.symbol === stock.symbol)
        const technical = technicalData.get(stock.symbol)
        
        if (quote && !('error' in quote)) {
          return {
            ...stock,
            currentPrice: quote.regularMarketPrice,
            change: quote.regularMarketChange,
            changePercent: quote.regularMarketChangePercent,
            signals: technical
          }
        }
        return stock
      }))
    } catch (err) {
      setError('Failed to refresh stock prices. Please try again.')
      console.error('Error refreshing prices:', err)
    } finally {
      setIsLoading(false)
    }
  }, [watchlist, selectedTimeframe])

  const handleTimeframeChange = useCallback(async (newTimeframe: TimeframeOption) => {
    console.log(`Changing timeframe from ${selectedTimeframe.label} to ${newTimeframe.label}`)
    setSelectedTimeframe(newTimeframe)
    
    // Refresh all technical analysis with new timeframe
    if (watchlist.length > 0) {
      setWatchlist(prev => prev.map(stock => ({ ...stock, isAnalyzing: true })))
      
      try {
        const symbols = watchlist.map(stock => stock.symbol)
        console.log(`Refreshing technical analysis for ${symbols.length} symbols with timeframe ${newTimeframe.value}`)
        
        // Force individual technical analysis calls for each symbol to ensure proper timeframe handling
        const technicalPromises = symbols.map(async (symbol) => {
          console.log(`Getting technical analysis for ${symbol} with timeframe ${newTimeframe.value}`)
          const technical = await yahooFinanceAPI.getTechnicalAnalysis(symbol, newTimeframe.value)
          return { symbol, technical }
        })
        
        const technicalResults = await Promise.all(technicalPromises)
        
        // Update watchlist with new technical analysis
        setWatchlist(prev => prev.map(stock => {
          const result = technicalResults.find(r => r.symbol === stock.symbol)
          if (result) {
            console.log(`Updated technical analysis for ${stock.symbol}:`, result.technical)
            return {
              ...stock,
              signals: result.technical,
              isAnalyzing: false
            }
          }
          return { ...stock, isAnalyzing: false }
        }))
        
        console.log(`Successfully updated technical analysis for ${symbols.length} symbols`)
      } catch (error) {
        console.error('Failed to update technical analysis for new timeframe:', error)
        setWatchlist(prev => prev.map(stock => ({ ...stock, isAnalyzing: false })))
      }
    }
  }, [watchlist, selectedTimeframe])

  // Auto-refresh based on selected timeframe with debouncing
  useEffect(() => {
    if (watchlist.length === 0) return

    // Clear existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }

    const scheduleNextRefresh = () => {
      refreshTimeoutRef.current = setTimeout(async () => {
        await refreshAllPrices()
        scheduleNextRefresh() // Schedule the next refresh
      }, selectedTimeframe.refreshRate * 1000) // Convert seconds to milliseconds
    }

    // Start the refresh cycle
    scheduleNextRefresh()

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [watchlist.length, selectedTimeframe.refreshRate, refreshAllPrices])

  return (
    <div className="space-y-6">
      <AIWatchlistDemo />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <TimeframeSelector
            selectedTimeframe={selectedTimeframe.value}
            onTimeframeChange={handleTimeframeChange}
            disabled={isLoading}
          />
        </div>
        <div>
          <PerformanceMonitor
            stats={performanceStats}
            timeframeName={selectedTimeframe.label}
            isActive={watchlist.length > 0 && !isLoading}
          />
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            AI-Powered Stock Watchlist
            <Badge variant="outline" className="text-xs">
              VWAP + RSI Analysis
            </Badge>
            {watchlist.length > 0 && (
              <>
                <Badge variant="secondary" className="ml-auto">
                  {watchlist.length} stocks
                </Badge>
                <RealTimeIndicator
                  refreshRate={selectedTimeframe.refreshRate}
                  isActive={watchlist.length > 0}
                  lastUpdate={watchlist[0]?.signals?.lastUpdated}
                />
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <StockAutocompleteWithCallback
              onStockSelect={handleAddStock}
              placeholder="Search and add stocks for automated analysis..."
              disabled={isLoading}
              className="flex-1"
            />
            {watchlist.length > 0 && (
              <Button 
                onClick={refreshAllPrices} 
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  "Refresh All"
                )}
              </Button>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {watchlist.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">No stocks in AI watchlist</p>
              <p className="text-sm">Add stocks to get automated buy/sell price recommendations using VWAP and RSI</p>
              <div className="mt-4 p-4 bg-blue-50 rounded-lg text-left max-w-md mx-auto">
                <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• VWAP calculates fair value based on volume</li>
                  <li>• RSI identifies overbought/oversold conditions</li>
                  <li>• AI combines both to suggest optimal entry/exit prices</li>
                  <li>• Real-time confidence scoring for each signal</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              {watchlist.map((stock) => (
                <Card key={stock.symbol} className="relative border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{stock.symbol}</h3>
                          {stock.signals && (
                            <Badge 
                              className={`text-white ${getTechnicalBadgeColor(stock.signals.signal, stock.signals.confidence)}`}
                            >
                              <SignalIcon signal={stock.signals.signal} />
                              <span className="ml-1">{stock.signals.signal}</span>
                            </Badge>
                          )}
                          {stock.isAnalyzing && (
                            <Badge variant="outline" className="animate-pulse">
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              Analyzing...
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{stock.name}</p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Current Price</p>
                            <p className="text-xl font-bold">{formatCurrency(stock.currentPrice || 0)}</p>
                            <div className={`flex items-center gap-1 text-sm ${
                              (stock.changePercent || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {(stock.changePercent || 0) >= 0 ? (
                                <TrendingUp className="w-3 h-3" />
                              ) : (
                                <TrendingDown className="w-3 h-3" />
                              )}
                              {formatCurrency(stock.change || 0)} ({(stock.changePercent || 0).toFixed(2)}%)
                            </div>
                          </div>

                          <div>
                            <p className="text-sm text-muted-foreground">Volume</p>
                            <p className="font-semibold">{formatNumber(stock.volume || 0)}</p>
                          </div>

                          {stock.signals && (
                            <>
                              <div>
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Target className="w-3 h-3 text-green-600" />
                                  AI Buy Price
                                </p>
                                <p className="font-semibold text-green-600 text-lg">
                                  {formatCurrency(stock.signals.buyPrice)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  VWAP: {formatCurrency(stock.signals.vwap)}
                                </p>
                                {(stock.currentPrice || 0) <= stock.signals.buyPrice && (
                                  <Badge className="text-xs bg-green-600 mt-1">
                                    BUY ZONE!
                                  </Badge>
                                )}
                              </div>

                              <div>
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Target className="w-3 h-3 text-red-600" />
                                  AI Sell Price
                                </p>
                                <p className="font-semibold text-red-600 text-lg">
                                  {formatCurrency(stock.signals.sellPrice)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  RSI: {stock.signals.rsi.toFixed(1)}
                                </p>
                                {(stock.currentPrice || 0) >= stock.signals.sellPrice && (
                                  <Badge className="text-xs bg-red-600 mt-1">
                                    SELL ZONE!
                                  </Badge>
                                )}
                              </div>
                            </>
                          )}
                        </div>

                        {stock.signals && (
                          <div className="border-t pt-3 mt-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-muted-foreground">Signal Confidence:</span>
                                  <Badge 
                                    variant="outline"
                                    className={`${
                                      stock.signals.confidence > 70 
                                        ? 'border-green-500 text-green-700' 
                                        : stock.signals.confidence > 50 
                                        ? 'border-yellow-500 text-yellow-700'
                                        : 'border-red-500 text-red-700'
                                    }`}
                                  >
                                    {stock.signals.confidence.toFixed(0)}%
                                  </Badge>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Timeframe: <span className="font-medium text-blue-600">
                                    {selectedTimeframe.label}
                                  </span>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Potential Return: <span className="font-medium text-green-600">
                                    {((stock.signals.sellPrice - stock.signals.buyPrice) / stock.signals.buyPrice * 100).toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => refreshTechnicalAnalysis(stock.symbol)}
                                disabled={stock.isAnalyzing}
                              >
                                <Zap className="w-3 h-3 mr-1" />
                                {stock.isAnalyzing ? "Analyzing..." : "Refresh AI"}
                              </Button>
                            </div>
                            
                            <div className="mt-2 text-xs text-muted-foreground">
                              Last updated: {new Date(stock.signals.lastUpdated).toLocaleTimeString()} • 
                              Next update in {selectedTimeframe.refreshRate}s
                            </div>
                          </div>
                        )}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveStock(stock.symbol)}
                        className="ml-4"
                      >
                        Remove
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
