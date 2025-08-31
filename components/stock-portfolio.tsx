"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, TrendingUp, TrendingDown, RefreshCw } from "lucide-react"

interface Position {
  symbol: string
  quantity: number
  averagePrice: number
  currentPrice: number
  totalValue: number
  pnl: number
  pnlPercent: number
}

export function StockPortfolio() {
  const [positions, setPositions] = useState<Position[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalPnL, setTotalPnL] = useState(0)
  const [totalInvestment, setTotalInvestment] = useState(0)

  const calculatePortfolio = (trades: any[]) => {
    const positionMap = new Map<string, any>()
    
    // Group trades by symbol
    trades.forEach(trade => {
      if (trade.status === 'COMPLETED') {
        const symbol = trade.symbol
        if (!positionMap.has(symbol)) {
          positionMap.set(symbol, {
            symbol,
            totalQuantity: 0,
            totalInvested: 0,
            trades: []
          })
        }
        
        const position = positionMap.get(symbol)
        position.trades.push(trade)
        
        if (trade.type === 'BUY') {
          position.totalQuantity += trade.quantity
          position.totalInvested += trade.total
        } else {
          position.totalQuantity -= trade.quantity
          position.totalInvested -= trade.total
        }
      }
    })

    return Array.from(positionMap.values()).filter(pos => pos.totalQuantity > 0)
  }

  const fetchPortfolio = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/trades')
      const trades = await response.json()
      
      const positions = calculatePortfolio(trades)
      
      // Simulate current prices (in real app, fetch from stock API)
      const positionsWithPrices = positions.map(pos => {
        const averagePrice = pos.totalInvested / pos.totalQuantity
        const currentPrice = averagePrice * (0.98 + Math.random() * 0.04) // Simulate ±2% change
        const totalValue = pos.totalQuantity * currentPrice
        const pnl = totalValue - pos.totalInvested
        const pnlPercent = (pnl / pos.totalInvested) * 100
        
        return {
          symbol: pos.symbol,
          quantity: pos.totalQuantity,
          averagePrice,
          currentPrice,
          totalValue,
          pnl,
          pnlPercent
        }
      })
      
      setPositions(positionsWithPrices)
      
      // Calculate totals
      const investment = positionsWithPrices.reduce((sum, pos) => sum + (pos.quantity * pos.averagePrice), 0)
      const currentValue = positionsWithPrices.reduce((sum, pos) => sum + pos.totalValue, 0)
      setTotalInvestment(investment)
      setTotalPnL(currentValue - investment)
      
    } catch (error) {
      console.error('Error fetching portfolio:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPortfolio()
  }, [])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Investment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalInvestment.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Current Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{(totalInvestment + totalPnL).toFixed(2)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              Total P&L
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={fetchPortfolio}
                className="h-6 w-6 p-0"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalPnL >= 0 ? '+' : ''}₹{totalPnL.toFixed(2)}
            </div>
            <p className={`text-xs ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalPnL >= 0 ? '+' : ''}{totalInvestment > 0 ? ((totalPnL / totalInvestment) * 100).toFixed(2) : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Positions */}
      <Card>
        <CardHeader>
          <CardTitle>Your Positions</CardTitle>
        </CardHeader>
        <CardContent>
          {positions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No positions found. Start trading to see your portfolio here.
            </div>
          ) : (
            <div className="space-y-4">
              {positions.map((position) => (
                <div key={position.symbol} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{position.symbol}</h3>
                      <Badge variant="outline">{position.quantity} shares</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {position.pnl >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                      <span className={`font-semibold ${position.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {position.pnl >= 0 ? '+' : ''}₹{position.pnl.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Avg Price:</span>
                      <div className="font-semibold">₹{position.averagePrice.toFixed(2)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Current Price:</span>
                      <div className="font-semibold">₹{position.currentPrice.toFixed(2)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Value:</span>
                      <div className="font-semibold">₹{position.totalValue.toFixed(2)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">P&L %:</span>
                      <div className={`font-semibold ${position.pnlPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {position.pnlPercent >= 0 ? '+' : ''}{position.pnlPercent.toFixed(2)}%
                      </div>
                    </div>
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
