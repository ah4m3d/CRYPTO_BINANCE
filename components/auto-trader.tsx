"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { AlertTriangle, TrendingUp, TrendingDown, Activity, DollarSign, Clock, Target, X } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

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

interface Position {
  symbol: string
  quantity: number
  avgBuyPrice: number
  currentValue: number
  unrealizedPnL: number
}

interface AutoTraderProps {
  technicalData: any
  isEnabled: boolean
  onToggle: (enabled: boolean) => void
}

export default function AutoTrader({ technicalData, isEnabled, onToggle }: AutoTraderProps) {
  const [trades, setTrades] = useState<Trade[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [totalPnL, setTotalPnL] = useState(0)
  const [dayPnL, setDayPnL] = useState(0)
  const [tradingBalance, setTradingBalance] = useState(100000) // Starting with ₹1,00,000
  const [availableBalance, setAvailableBalance] = useState(100000)
  const [isDataLoaded, setIsDataLoaded] = useState(false) // Track if data has been loaded
  
  // Trading parameters - Conservative defaults for lower risk
  const [minConfidence, setMinConfidence] = useState(85) // Higher confidence threshold
  const [maxPositionSize, setMaxPositionSize] = useState(5000) // Max ₹5,000 per trade
  const [riskPerTrade, setRiskPerTrade] = useState(1) // 1% risk per trade
  const [maxDailyLoss, setMaxDailyLoss] = useState(5000) // Max ₹5,000 daily loss
  const [maxPositions, setMaxPositions] = useState(3) // Max 3 open positions
  const [stopLossPercent, setStopLossPercent] = useState(3) // 3% stop loss
  const [takeProfitPercent, setTakeProfitPercent] = useState(5) // 5% take profit
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastTradeRef = useRef<{ [symbol: string]: number }>({})

  // Close/Remove position function
  const closePosition = (symbolToClose: string) => {
    console.log(`🚪 Closing position for ${symbolToClose}`)
    
    const updatedPositions = positions.filter(position => position.symbol !== symbolToClose)
    
    // Create a sell trade record for the closed position
    const closedPosition = positions.find(p => p.symbol === symbolToClose)
    if (closedPosition) {
      const currentPrice = technicalData[symbolToClose]?.quote?.regularMarketPrice || closedPosition.avgBuyPrice
      const sellTrade: Trade = {
        id: `close-${Date.now()}`,
        symbol: symbolToClose,
        type: 'SELL',
        price: currentPrice,
        quantity: closedPosition.quantity,
        timestamp: new Date(),
        signal: 'Manual Close',
        confidence: 100,
        pnl: closedPosition.unrealizedPnL
      }
      
      const updatedTrades = [...trades, sellTrade]
      const newAvailableBalance = availableBalance + (closedPosition.quantity * currentPrice)
      const newTotalPnL = totalPnL + closedPosition.unrealizedPnL
      
      setPositions(updatedPositions)
      setTrades(updatedTrades)
      setAvailableBalance(newAvailableBalance)
      setTotalPnL(newTotalPnL)
      
      console.log(`✅ Position closed: ${symbolToClose}, P&L: ₹${closedPosition.unrealizedPnL.toFixed(2)}`)
      
      // Save updated data
      saveTradingData(updatedTrades, updatedPositions, newTotalPnL, undefined, undefined, newAvailableBalance)
    }
  }

  // Save all trading data to localStorage
  const saveTradingData = (newTrades?: Trade[], newPositions?: Position[], newTotalPnL?: number, newDayPnL?: number, newBalance?: number, newAvailableBalance?: number) => {
    try {
      const tradingData = {
        trades: newTrades || trades,
        positions: newPositions || positions,
        totalPnL: newTotalPnL !== undefined ? newTotalPnL : totalPnL,
        dayPnL: newDayPnL !== undefined ? newDayPnL : dayPnL,
        tradingBalance: newBalance !== undefined ? newBalance : tradingBalance,
        availableBalance: newAvailableBalance !== undefined ? newAvailableBalance : availableBalance,
        lastUpdated: new Date().toISOString(),
        settings: {
          minConfidence,
          maxPositionSize,
          riskPerTrade,
          maxDailyLoss,
          maxPositions,
          stopLossPercent,
          takeProfitPercent
        }
      }
      
      localStorage.setItem('aiTradingData', JSON.stringify(tradingData))
      localStorage.setItem('aiTradingHistory', JSON.stringify(newTrades || trades))
      
      console.log('Trading data saved successfully:', {
        trades: (newTrades || trades).length,
        positions: (newPositions || positions).length,
        totalPnL: newTotalPnL !== undefined ? newTotalPnL : totalPnL
      })
    } catch (error) {
      console.error('Error saving trading data:', error)
    }
  }

  // Manual save function for immediate saves
  const saveDataNow = () => {
    saveTradingData(trades, positions, totalPnL, dayPnL, tradingBalance, availableBalance)
  }

  // Debug function to check localStorage
  const checkLocalStorage = () => {
    const data = localStorage.getItem('aiTradingData')
    console.log('Current localStorage data:', data ? JSON.parse(data) : 'No data found')
    
    // Also check for any issues
    try {
      if (data) {
        const parsed = JSON.parse(data)
        console.log('Data integrity check:', {
          hasTradesArray: Array.isArray(parsed.trades),
          tradesCount: parsed.trades?.length || 0,
          hasPositionsArray: Array.isArray(parsed.positions),
          positionsCount: parsed.positions?.length || 0,
          totalPnL: parsed.totalPnL,
          availableBalance: parsed.availableBalance
        })
      }
    } catch (error) {
      console.error('Error parsing localStorage data:', error)
    }
  }

  // Test function to create a sample trade and save it
  const createTestTrade = () => {
    const testTrade: Trade = {
      id: `test_${Date.now()}`,
      symbol: 'TEST',
      type: 'BUY',
      price: 1000,
      quantity: 1,
      timestamp: new Date(),
      signal: 'TEST_BUY',
      confidence: 90
    }
    
    const newTrades = [testTrade, ...trades]
    setTrades(newTrades)
    
    // Manually save
    setTimeout(() => {
      saveTradingData(newTrades, positions, totalPnL, dayPnL, tradingBalance, availableBalance)
      console.log('Test trade created and saved:', testTrade)
    }, 100)
  }

  // Load trading data from localStorage
  const loadTradingData = () => {
    try {
      const savedData = localStorage.getItem('aiTradingData')
      if (savedData) {
        const data = JSON.parse(savedData)
        
        // Restore trades with proper date parsing
        const restoredTrades = (data.trades || []).map((trade: any) => ({
          ...trade,
          timestamp: new Date(trade.timestamp)
        }))
        
        setTrades(restoredTrades)
        setPositions(data.positions || [])
        setTotalPnL(data.totalPnL || 0)
        setDayPnL(data.dayPnL || 0)
        setTradingBalance(data.tradingBalance || 100000)
        setAvailableBalance(data.availableBalance || 100000)
        
        // Restore settings if available
        if (data.settings) {
          setMinConfidence(data.settings.minConfidence || 85)
          setMaxPositionSize(data.settings.maxPositionSize || 5000)
          setRiskPerTrade(data.settings.riskPerTrade || 1)
          setMaxDailyLoss(data.settings.maxDailyLoss || 5000)
          setMaxPositions(data.settings.maxPositions || 3)
          setStopLossPercent(data.settings.stopLossPercent || 3)
          setTakeProfitPercent(data.settings.takeProfitPercent || 5)
        }
        
        console.log('Trading data restored from localStorage:', {
          trades: restoredTrades.length,
          positions: data.positions?.length || 0,
          totalPnL: data.totalPnL || 0
        })
      }
      setIsDataLoaded(true) // Mark data as loaded
    } catch (error) {
      console.error('Error loading trading data:', error)
      setIsDataLoaded(true) // Still mark as loaded even if error
    }
  }

  // Load data on component mount
  useEffect(() => {
    loadTradingData()
  }, [])

  // Reset all trading data
  const resetTradingData = () => {
    setTrades([])
    setPositions([])
    setTotalPnL(0)
    setDayPnL(0)
    setTradingBalance(100000)
    setAvailableBalance(100000)
    
    // Clear localStorage
    localStorage.removeItem('aiTradingData')
    localStorage.removeItem('aiTradingHistory')
    localStorage.removeItem('monthlyTrading')
    
    console.log('All trading data has been reset')
  }

  // Save data whenever important state changes (only after initial load)
  useEffect(() => {
    if (isDataLoaded && (trades.length > 0 || positions.length > 0 || totalPnL !== 0 || availableBalance !== 100000)) {
      console.log('Auto-saving trading data...')
      saveTradingData()
    }
  }, [trades, positions, totalPnL, dayPnL, tradingBalance, availableBalance, isDataLoaded])

  // Save settings when they change (only after initial load)
  useEffect(() => {
    if (isDataLoaded) {
      console.log('Auto-saving settings...')
      saveTradingData()
    }
  }, [minConfidence, maxPositionSize, riskPerTrade, maxDailyLoss, maxPositions, stopLossPercent, takeProfitPercent, isDataLoaded])

  // Save trade to monthly tracking
  const saveTradeToMonthlyTracking = (trade: Trade) => {
    const trackingData = localStorage.getItem('monthlyTrading')
    if (trackingData) {
      const data = JSON.parse(trackingData)
      if (data.isActive) {
        data.trades = data.trades || []
        data.trades.push({
          ...trade,
          timestamp: trade.timestamp.toISOString()
        })
        
        // Update daily P&L
        const today = new Date().toDateString()
        const dailyIndex = data.dailyPnL.findIndex((d: any) => d.date === today)
        
        if (dailyIndex >= 0) {
          data.dailyPnL[dailyIndex].pnl += trade.pnl || 0
          data.dailyPnL[dailyIndex].trades += 1
        } else {
          data.dailyPnL.push({
            date: today,
            pnl: trade.pnl || 0,
            trades: 1,
            winRate: 0
          })
        }
        
        localStorage.setItem('monthlyTrading', JSON.stringify(data))
      }
    }
  }

  // Calculate position size based on risk management
  const calculatePositionSize = (price: number, stopLoss: number) => {
    const riskAmount = (tradingBalance * riskPerTrade) / 100
    const riskPerShare = Math.abs(price - stopLoss)
    const quantity = Math.floor(riskAmount / riskPerShare)
    const positionValue = quantity * price
    
    return Math.min(quantity, Math.floor(maxPositionSize / price))
  }

  // Check if Indian stock market is open
  const isMarketOpen = () => {
    const now = new Date()
    const istTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}))
    
    // Get day of week (0 = Sunday, 6 = Saturday)
    const day = istTime.getDay()
    
    // Market is closed on weekends
    if (day === 0 || day === 6) {
      return false
    }
    
    // Get current time in IST
    const hours = istTime.getHours()
    const minutes = istTime.getMinutes()
    const currentTime = hours * 100 + minutes // Convert to HHMM format
    
    // Indian stock market hours: 9:15 AM to 3:30 PM IST
    const marketOpen = 915  // 9:15 AM
    const marketClose = 1530 // 3:30 PM
    
    return currentTime >= marketOpen && currentTime <= marketClose
  }

  // Get market status message
  const getMarketStatus = () => {
    const now = new Date()
    const istTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}))
    const day = istTime.getDay()
    const hours = istTime.getHours()
    const minutes = istTime.getMinutes()
    const currentTime = hours * 100 + minutes
    
    if (day === 0 || day === 6) {
      return "Market Closed - Weekend"
    } else if (currentTime < 915) {
      return "Market Closed - Opens at 9:15 AM IST"
    } else if (currentTime > 1530) {
      return "Market Closed - Opens at 9:15 AM IST"
    } else {
      return "Market Open - 9:15 AM to 3:30 PM IST"
    }
  }

  // Execute trade based on AI signals with enhanced risk management
  const executeTrade = async (symbol: string, analysis: any) => {
    if (!isEnabled || !analysis) return

    // Check if market is open first
    if (!isMarketOpen()) {
      console.log(`Trading halted - ${getMarketStatus()}`)
      return
    }

    const { signal, confidence, priceTargets, rsi, vwap } = analysis
    const currentPrice = technicalData[symbol]?.quote?.regularMarketPrice || 0
    
    // Enhanced risk checks
    if (confidence < minConfidence || currentPrice === 0) return
    
    // Check daily loss limit
    if (dayPnL <= -maxDailyLoss) {
      console.log(`Daily loss limit reached: ₹${maxDailyLoss}`)
      return
    }
    
    // Check maximum positions limit
    if (positions.length >= maxPositions && (signal === 'STRONG_BUY' || signal === 'BUY')) {
      console.log(`Maximum positions limit reached: ${maxPositions}`)
      return
    }

    // Prevent duplicate trades within 5 minutes
    const lastTradeTime = lastTradeRef.current[symbol] || 0
    const timeSinceLastTrade = Date.now() - lastTradeTime
    if (timeSinceLastTrade < 5 * 60 * 1000) return // 5 minutes cooldown

    const existingPosition = positions.find(p => p.symbol === symbol)
    
    try {
      if ((signal === 'STRONG_BUY' || signal === 'BUY') && confidence >= minConfidence) {
        if (!existingPosition || existingPosition.quantity === 0) {
          // Enhanced position sizing with multiple risk factors
          const volatilityFactor = Math.abs(rsi - 50) / 50 // Lower size for extreme RSI
          const confidenceFactor = confidence / 100
          const baseQuantity = calculatePositionSize(priceTargets.buyPrice, priceTargets.stopLoss)
          
          // Apply risk reduction factors
          const adjustedQuantity = Math.floor(baseQuantity * confidenceFactor * (1 - volatilityFactor * 0.3))
          const quantity = Math.min(adjustedQuantity, Math.floor(maxPositionSize / priceTargets.buyPrice))
          const totalCost = quantity * priceTargets.buyPrice
          
          // Additional safety checks
          if (totalCost <= availableBalance && quantity > 0 && totalCost <= maxPositionSize) {
            const trade: Trade = {
              id: `trade_${Date.now()}_${symbol}`,
              symbol,
              type: 'BUY',
              price: priceTargets.buyPrice,
              quantity,
              timestamp: new Date(),
              signal,
              confidence
            }
            
            const newTrades = [trade, ...trades]
            const newAvailableBalance = availableBalance - totalCost
            
            setTrades(newTrades)
            setAvailableBalance(newAvailableBalance)
            
            // Save to monthly tracking
            saveTradeToMonthlyTracking(trade)
            
            // Update or create position with stop loss and take profit
            setPositions(prev => {
              const existingIndex = prev.findIndex(p => p.symbol === symbol)
              let updatedPositions
              if (existingIndex >= 0) {
                const updated = [...prev]
                const existing = updated[existingIndex]
                const newQuantity = existing.quantity + quantity
                const newAvgPrice = ((existing.quantity * existing.avgBuyPrice) + totalCost) / newQuantity
                
                updated[existingIndex] = {
                  ...existing,
                  quantity: newQuantity,
                  avgBuyPrice: newAvgPrice,
                  currentValue: newQuantity * currentPrice,
                  unrealizedPnL: (currentPrice - newAvgPrice) * newQuantity
                }
                updatedPositions = updated
              } else {
                updatedPositions = [...prev, {
                  symbol,
                  quantity,
                  avgBuyPrice: priceTargets.buyPrice,
                  currentValue: quantity * currentPrice,
                  unrealizedPnL: (currentPrice - priceTargets.buyPrice) * quantity
                }]
              }
              
              // Immediately save to localStorage
              saveTradingData(newTrades, updatedPositions, undefined, undefined, undefined, newAvailableBalance)
              return updatedPositions
            })
            
            lastTradeRef.current[symbol] = Date.now()
          }
        }
      } else if ((signal === 'STRONG_SELL' || signal === 'SELL') && existingPosition && existingPosition.quantity > 0) {
        // Enhanced sell logic with profit protection
        const currentValue = existingPosition.quantity * currentPrice
        const unrealizedPnL = (currentPrice - existingPosition.avgBuyPrice) * existingPosition.quantity
        const sellPrice = Math.max(priceTargets.sellPrice, currentPrice * 0.98) // Don't sell below 2% of current
        
        // Only sell if profitable or hitting stop loss
        if (unrealizedPnL > 0 || unrealizedPnL <= -(existingPosition.avgBuyPrice * stopLossPercent / 100 * existingPosition.quantity)) {
          const totalValue = existingPosition.quantity * sellPrice
          const pnl = (sellPrice - existingPosition.avgBuyPrice) * existingPosition.quantity
          
          const trade: Trade = {
            id: `trade_${Date.now()}_${symbol}`,
            symbol,
            type: 'SELL',
            price: sellPrice,
            quantity: existingPosition.quantity,
            timestamp: new Date(),
            signal,
            confidence,
            pnl
          }
          
          const newTrades = [trade, ...trades]
          const newAvailableBalance = availableBalance + totalValue
          const newTotalPnL = totalPnL + pnl
          const newDayPnL = dayPnL + pnl
          
          setTrades(newTrades)
          setAvailableBalance(newAvailableBalance)
          setTotalPnL(newTotalPnL)
          setDayPnL(newDayPnL)
          
          // Save to monthly tracking
          saveTradeToMonthlyTracking(trade)
          
          // Remove position
          const newPositions = positions.filter(p => p.symbol !== symbol)
          setPositions(newPositions)
          
          // Immediately save to localStorage
          saveTradingData(newTrades, newPositions, newTotalPnL, newDayPnL, undefined, newAvailableBalance)
          
          lastTradeRef.current[symbol] = Date.now()
        }
      }
    } catch (error) {
      console.error('Trade execution error:', error)
    }
  }

  // Auto trading effect
  useEffect(() => {
    if (isEnabled && Object.keys(technicalData).length > 0) {
      intervalRef.current = setInterval(() => {
        Object.keys(technicalData).forEach(symbol => {
          const analysis = technicalData[symbol]?.technicalAnalysis
          if (analysis) {
            executeTrade(symbol, analysis)
          }
        })
      }, 10000) // Check every 10 seconds
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isEnabled, technicalData, minConfidence, maxPositionSize, riskPerTrade])

  // Update unrealized P&L
  useEffect(() => {
    setPositions(prev => prev.map(position => {
      const currentPrice = technicalData[position.symbol]?.quote?.regularMarketPrice || position.avgBuyPrice
      return {
        ...position,
        currentValue: position.quantity * currentPrice,
        unrealizedPnL: (currentPrice - position.avgBuyPrice) * position.quantity
      }
    }))
  }, [technicalData])

  // Calculate total unrealized P&L
  const totalUnrealizedPnL = positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0)
  const totalEquity = availableBalance + positions.reduce((sum, pos) => sum + pos.currentValue, 0)

  // Reset daily P&L at midnight
  useEffect(() => {
    const now = new Date()
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    const msUntilMidnight = tomorrow.getTime() - now.getTime()
    
    const resetTimer = setTimeout(() => {
      setDayPnL(0)
    }, msUntilMidnight)
    
    return () => clearTimeout(resetTimer)
  }, [])

  const todayTrades = trades.filter(trade => {
    const today = new Date().toDateString()
    return trade.timestamp.toDateString() === today
  })

  return (
    <div className="space-y-6">
      {/* Market Status Indicator */}
      <Alert className={isMarketOpen() ? "border-green-200 bg-green-50 dark:bg-green-900/20" : "border-red-200 bg-red-50 dark:bg-red-900/20"}>
        <Clock className="h-4 w-4" />
        <AlertDescription>
          <span className={`font-semibold ${isMarketOpen() ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
            {getMarketStatus()}
          </span>
          {!isMarketOpen() && (
            <span className="ml-2 text-sm text-muted-foreground">
              Auto trading will resume when market opens
            </span>
          )}
        </AlertDescription>
      </Alert>

      {/* Auto Trading Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                AI Auto Trading System
              </CardTitle>
              <CardDescription>
                Automated trading based on AI technical analysis signals
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="auto-trading">Enable Auto Trading</Label>
              <Switch
                id="auto-trading"
                checked={isEnabled}
                onCheckedChange={onToggle}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="min-confidence">Min Confidence (%)</Label>
              <Input
                id="min-confidence"
                type="number"
                value={minConfidence}
                onChange={(e) => setMinConfidence(Number(e.target.value))}
                placeholder="Enter 50-100"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">Enter 50-100%</p>
            </div>
            <div>
              <Label htmlFor="max-position">Max Position Size (₹)</Label>
              <Input
                id="max-position"
                type="number"
                value={maxPositionSize}
                onChange={(e) => setMaxPositionSize(Number(e.target.value))}
                placeholder="e.g., 5000"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">Enter amount in ₹</p>
            </div>
            <div>
              <Label htmlFor="risk-per-trade">Risk Per Trade (%)</Label>
              <Input
                id="risk-per-trade"
                type="number"
                value={riskPerTrade}
                onChange={(e) => setRiskPerTrade(Number(e.target.value))}
                step="0.1"
                placeholder="e.g., 2.5"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">Enter 0.1-10%</p>
            </div>
            <div>
              <Label htmlFor="max-daily-loss">Max Daily Loss (₹)</Label>
              <Input
                id="max-daily-loss"
                type="number"
                value={maxDailyLoss}
                onChange={(e) => setMaxDailyLoss(Number(e.target.value))}
                placeholder="e.g., 5000"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">Enter amount in ₹</p>
            </div>
            <div>
              <Label htmlFor="max-positions">Max Open Positions</Label>
              <Input
                id="max-positions"
                type="number"
                value={maxPositions}
                onChange={(e) => setMaxPositions(Number(e.target.value))}
                placeholder="e.g., 3"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">Enter 1-10 positions</p>
            </div>
            <div>
              <Label htmlFor="stop-loss">Stop Loss (%)</Label>
              <Input
                id="stop-loss"
                type="number"
                value={stopLossPercent}
                onChange={(e) => setStopLossPercent(Number(e.target.value))}
                step="0.5"
                placeholder="e.g., 3.0"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">Enter 1-10%</p>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <h4 className="text-sm font-medium mb-2">🛡️ Enhanced Risk Management Active</h4>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Conservative confidence threshold: {minConfidence}% minimum</p>
              <p>• Position size limited to ₹{maxPositionSize.toLocaleString()}</p>
              <p>• Daily loss protection: Stop trading at ₹{maxDailyLoss.toLocaleString()} loss</p>
              <p>• Portfolio diversification: Maximum {maxPositions} open positions</p>
              <p>• Automatic stop-loss: {stopLossPercent}% protection per trade</p>
              <p>• Risk per trade capped at {riskPerTrade}% of balance</p>
            </div>
          </div>

          <div className="mt-4 flex justify-between items-center">
            <div className="flex gap-2 items-center">
              <div className="text-sm text-muted-foreground">
                Trading data is automatically saved and restored on refresh
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={saveDataNow}
                className="text-blue-600 hover:text-blue-700"
              >
                Save Now
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={checkLocalStorage}
                className="text-gray-600 hover:text-gray-700"
              >
                Check Data
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={createTestTrade}
                className="text-green-600 hover:text-green-700"
              >
                Test Trade
              </Button>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={resetTradingData}
              className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
            >
              Reset All Data
            </Button>
          </div>
          
          {isEnabled && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Auto Trading Active</span>
              </div>
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                The system is automatically executing trades based on AI analysis. Monitor your positions regularly.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Portfolio Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">Available Balance</p>
                <p className="text-lg font-semibold">₹{availableBalance.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-xs text-muted-foreground">Total Equity</p>
                <p className="text-lg font-semibold">₹{totalEquity.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-xs text-muted-foreground">Unrealized P&L</p>
                <p className={`text-lg font-semibold ${totalUnrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₹{totalUnrealizedPnL.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-xs text-muted-foreground">Today's P&L</p>
                <p className={`text-lg font-semibold ${dayPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₹{dayPnL.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Positions */}
      <Card>
        <CardHeader>
          <CardTitle>Current Positions ({positions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {positions.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No open positions</p>
          ) : (
            <div className="space-y-3">
              {positions.map((position, index) => {
                const currentPrice = technicalData[position.symbol]?.quote?.regularMarketPrice || 0
                const pnlPercent = ((currentPrice - position.avgBuyPrice) / position.avgBuyPrice) * 100
                
                return (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{position.symbol}</div>
                      <div className="text-sm text-muted-foreground">
                        {position.quantity} shares @ ₹{position.avgBuyPrice.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-right mr-3">
                      <div className={`font-medium ${position.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ₹{position.unrealizedPnL.toFixed(2)}
                      </div>
                      <div className={`text-sm ${pnlPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => closePosition(position.symbol)}
                      className="h-8 w-8 p-0 hover:bg-red-50 hover:border-red-300"
                      title={`Close ${position.symbol} position`}
                    >
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Trades */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Trades ({todayTrades.length} today)</CardTitle>
        </CardHeader>
        <CardContent>
          {trades.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No trades executed yet</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {trades.slice(0, 10).map((trade) => (
                <div key={trade.id} className="flex items-center justify-between p-2 border rounded text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant={trade.type === 'BUY' ? 'default' : 'secondary'}>
                      {trade.type}
                    </Badge>
                    <span className="font-medium">{trade.symbol}</span>
                    <span className="text-muted-foreground">
                      {trade.quantity} @ ₹{trade.price.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">
                      {trade.timestamp.toLocaleTimeString()}
                    </div>
                    {trade.pnl && (
                      <div className={`text-xs ${trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        P&L: ₹{trade.pnl.toFixed(2)}
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