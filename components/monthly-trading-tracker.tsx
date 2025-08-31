"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, TrendingUp, TrendingDown, DollarSign, Target, BarChart3, Activity, Clock, History } from "lucide-react"

interface Trade {
  id: string
  symbol: string
  type: 'BUY' | 'SELL'
  price: number
  quantity: number
  timestamp: Date
  signal: string
  confidence: number
  pnl?: number
}

interface DailyStats {
  date: string
  trades: Trade[]
  totalPnL: number
  winningTrades: number
  losingTrades: number
  volume: number
}

export default function TradingHistoryAnalyzer() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([])
  const [isUsingMockData, setIsUsingMockData] = useState(false)
  const [overallStats, setOverallStats] = useState({
    totalTrades: 0,
    totalPnL: 0,
    winRate: 0,
    avgTradeSize: 0,
    bestDay: 0,
    worstDay: 0,
    totalVolume: 0,
    avgDailyPnL: 0,
    profitableDays: 0,
    losingDays: 0
  })

  // Load trades from localStorage (saved by auto-trader)
  useEffect(() => {
    const loadTradeHistory = () => {
      console.log('🔍 Loading trade history from localStorage...')
      
      const savedTrades = localStorage.getItem('aiTradingHistory')
      const savedPositions = localStorage.getItem('aiTradingData')
      
      console.log('Saved trades:', savedTrades)
      console.log('Saved positions:', savedPositions)
      
      if (savedTrades) {
        const parsedTrades = JSON.parse(savedTrades).map((trade: any) => ({
          ...trade,
          timestamp: new Date(trade.timestamp)
        }))
        console.log('✅ Found real trades:', parsedTrades.length)
        setTrades(parsedTrades)
        setIsUsingMockData(false)
        calculateStats(parsedTrades)
      } else {
        console.log('ℹ️ No trades found in localStorage')
        // Check if there are any positions being tracked
        if (savedPositions) {
          const positionsData = JSON.parse(savedPositions)
          if (positionsData.positions && positionsData.positions.length > 0) {
            console.log('📊 Found positions, creating sample trades for display')
            // Create sample trades based on current positions for display
            createSampleTradesFromPositions(positionsData.positions)
          } else {
            showEmptyState()
          }
        } else {
          showEmptyState()
        }
      }
    }

    const createSampleTradesFromPositions = (positions: any[]) => {
      const sampleTrades = positions.map((position, index) => ({
        id: `pos-${index}`,
        symbol: position.symbol,
        type: 'BUY' as const,
        price: position.entryPrice,
        quantity: position.quantity,
        timestamp: new Date(position.entryTime),
        signal: 'Technical Analysis',
        confidence: 85,
        pnl: position.unrealizedPnL || 0
      }))
      
      console.log('📈 Created sample trades from positions:', sampleTrades)
      setTrades(sampleTrades)
      setIsUsingMockData(true)
      calculateStats(sampleTrades)
    }

    const showEmptyState = () => {
      setTrades([])
      setIsUsingMockData(true)
      setOverallStats({
        totalTrades: 0,
        totalPnL: 0,
        winRate: 0,
        avgTradeSize: 0,
        bestDay: 0,
        worstDay: 0,
        totalVolume: 0,
        avgDailyPnL: 0,
        profitableDays: 0,
        losingDays: 0
      })
      setDailyStats([])
    }

    loadTradeHistory()
    
    // Refresh every 30 seconds to pick up new trades
    const interval = setInterval(loadTradeHistory, 30000)
    return () => clearInterval(interval)
  }, [])

  // Generate sample trades for demonstration
  const generateSampleTrades = () => {
    const symbols = ['RELIANCE', 'TCS', 'HDFCBANK', 'ICICIBANK', 'BHARTIARTL', 'ITC', 'SBIN', 'LT', 'KOTAKBANK', 'INFY']
    const sampleTrades: Trade[] = []
    const now = new Date()
    
    for (let i = 0; i < 150; i++) {
      const daysAgo = Math.floor(i / 5) // 5 trades per day on average
      const tradeDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
      
      const symbol = symbols[Math.floor(Math.random() * symbols.length)]
      const isBuy = Math.random() > 0.5
      const price = 1000 + Math.random() * 2000
      const quantity = Math.floor(1 + Math.random() * 10)
      const pnl = isBuy ? undefined : (Math.random() - 0.4) * 1000 // 40% chance of loss
      
      sampleTrades.push({
        id: `trade_${i}`,
        symbol,
        type: isBuy ? 'BUY' : 'SELL',
        price,
        quantity,
        timestamp: tradeDate,
        signal: isBuy ? (Math.random() > 0.7 ? 'STRONG_BUY' : 'BUY') : (Math.random() > 0.7 ? 'STRONG_SELL' : 'SELL'),
        confidence: 70 + Math.random() * 25,
        pnl
      })
    }
    
    setTrades(sampleTrades.reverse()) // Most recent first
    calculateStats(sampleTrades)
  }

  // Calculate comprehensive statistics
  const calculateStats = (allTrades: Trade[]) => {
    if (allTrades.length === 0) return

    // Group trades by day
    const dailyGroups: { [key: string]: Trade[] } = {}
    allTrades.forEach(trade => {
      const dateKey = trade.timestamp.toDateString()
      if (!dailyGroups[dateKey]) {
        dailyGroups[dateKey] = []
      }
      dailyGroups[dateKey].push(trade)
    })

    // Calculate daily stats
    const dailyStatsArray: DailyStats[] = Object.entries(dailyGroups).map(([date, dayTrades]) => {
      const sellTrades = dayTrades.filter(t => t.type === 'SELL' && t.pnl !== undefined)
      const dailyPnL = sellTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0)
      const winningTrades = sellTrades.filter(t => (t.pnl || 0) > 0).length
      const losingTrades = sellTrades.filter(t => (t.pnl || 0) < 0).length
      const volume = dayTrades.reduce((sum, trade) => sum + (trade.price * trade.quantity), 0)

      return {
        date,
        trades: dayTrades,
        totalPnL: dailyPnL,
        winningTrades,
        losingTrades,
        volume
      }
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    setDailyStats(dailyStatsArray)

    // Calculate overall statistics
    const sellTrades = allTrades.filter(t => t.type === 'SELL' && t.pnl !== undefined)
    const totalPnL = sellTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0)
    const winningTrades = sellTrades.filter(t => (t.pnl || 0) > 0).length
    const totalVolume = allTrades.reduce((sum, trade) => sum + (trade.price * trade.quantity), 0)
    const avgTradeSize = totalVolume / allTrades.length
    
    const dailyPnLs = dailyStatsArray.map(d => d.totalPnL)
    const bestDay = Math.max(...dailyPnLs, 0)
    const worstDay = Math.min(...dailyPnLs, 0)
    const avgDailyPnL = dailyPnLs.reduce((sum, pnl) => sum + pnl, 0) / dailyPnLs.length || 0
    const profitableDays = dailyStatsArray.filter(d => d.totalPnL > 0).length
    const losingDays = dailyStatsArray.filter(d => d.totalPnL < 0).length

    setOverallStats({
      totalTrades: allTrades.length,
      totalPnL,
      winRate: sellTrades.length > 0 ? (winningTrades / sellTrades.length) * 100 : 0,
      avgTradeSize,
      bestDay,
      worstDay,
      totalVolume,
      avgDailyPnL,
      profitableDays,
      losingDays
    })
  }

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
  }

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'STRONG_BUY': return 'bg-green-600'
      case 'BUY': return 'bg-green-500'
      case 'SELL': return 'bg-red-500'
      case 'STRONG_SELL': return 'bg-red-600'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="space-y-6">
      {/* Real vs Mock Data Indicator */}
      {isUsingMockData && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <Activity className="h-5 w-5" />
              <div>
                <p className="font-semibold">No Trading History Found</p>
                <p className="text-sm">Start the Auto Trading system to generate real trade data. Currently showing empty state.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overall Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">Total P&L</p>
                <p className={`text-lg font-semibold ${overallStats.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(overallStats.totalPnL)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-xs text-muted-foreground">Total Trades</p>
                <p className="text-lg font-semibold">{overallStats.totalTrades}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-xs text-muted-foreground">Win Rate</p>
                <p className="text-lg font-semibold">{overallStats.winRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-xs text-muted-foreground">Avg Daily P&L</p>
                <p className={`text-lg font-semibold ${overallStats.avgDailyPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(overallStats.avgDailyPnL)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Trading Performance Analysis
          </CardTitle>
          <CardDescription>
            Comprehensive breakdown of your AI trading history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Volume Traded:</span>
                <span className="font-medium">{formatCurrency(overallStats.totalVolume)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Average Trade Size:</span>
                <span className="font-medium">{formatCurrency(overallStats.avgTradeSize)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Best Day:</span>
                <span className="font-medium text-green-600">{formatCurrency(overallStats.bestDay)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Worst Day:</span>
                <span className="font-medium text-red-600">{formatCurrency(overallStats.worstDay)}</span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Profitable Days:</span>
                <span className="font-medium text-green-600">{overallStats.profitableDays}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Losing Days:</span>
                <span className="font-medium text-red-600">{overallStats.losingDays}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trading Days:</span>
                <span className="font-medium">{dailyStats.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Daily Win Rate:</span>
                <span className="font-medium">{dailyStats.length > 0 ? ((overallStats.profitableDays / dailyStats.length) * 100).toFixed(1) : 0}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Trading History</CardTitle>
          <CardDescription>Day-by-day breakdown of trading performance</CardDescription>
        </CardHeader>
        <CardContent>
          {dailyStats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No trading history available</p>
              <p className="text-sm">Enable Auto Trading to start generating trade data</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {dailyStats.map((day, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{new Date(day.date).toLocaleDateString()}</div>
                    <div className="text-sm text-muted-foreground">
                      {day.trades.length} trades • {day.winningTrades}W {day.losingTrades}L
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-medium ${day.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(day.totalPnL)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Vol: {formatCurrency(day.volume)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Trades */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Trade History</CardTitle>
          <CardDescription>Latest trades executed by the AI system</CardDescription>
        </CardHeader>
        <CardContent>
          {trades.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No trades executed yet</p>
              <p className="text-sm">Go to "AI Auto Trading" tab and enable auto trading to start</p>
              
              {/* Debug Section */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg text-left">
                <h4 className="font-medium text-gray-900 mb-2">🔍 Debug Info</h4>
                <button 
                  onClick={() => {
                    const trades = localStorage.getItem('aiTradingHistory')
                    const positions = localStorage.getItem('aiTradingData')
                    console.log('=== TRADE HISTORY DEBUG ===')
                    console.log('Trades in localStorage:', trades)
                    console.log('Positions in localStorage:', positions)
                    if (positions) {
                      const posData = JSON.parse(positions)
                      console.log('Parsed positions:', posData)
                    }
                    alert('Check browser console for debug info')
                  }}
                  className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                >
                  Check Data
                </button>
                <p className="text-xs mt-2 text-gray-600">
                  {isUsingMockData ? '⚠️ Using mock data' : '✅ Using real data'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {trades.slice(0, 50).map((trade) => (
                <div key={trade.id} className="flex items-center justify-between p-2 border rounded text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant={trade.type === 'BUY' ? 'default' : 'secondary'} className={getSignalColor(trade.signal)}>
                      {trade.type}
                    </Badge>
                    <span className="font-medium">{trade.symbol}</span>
                    <span className="text-muted-foreground">
                      {trade.quantity} @ {formatCurrency(trade.price)}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {trade.confidence.toFixed(0)}%
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">
                      {trade.timestamp.toLocaleDateString()} {trade.timestamp.toLocaleTimeString()}
                    </div>
                    {trade.pnl && (
                      <div className={`text-xs ${trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        P&L: {formatCurrency(trade.pnl)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
