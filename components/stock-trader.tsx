"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, TrendingUp, TrendingDown } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { Stock } from "@/types/stock"

interface StockTraderProps {
  stocks: Stock[]
  onTrade?: (trade: TradeOrder) => void
}

interface TradeOrder {
  symbol: string
  type: 'BUY' | 'SELL'
  quantity: number
  price: number
  total: number
}

export function StockTrader({ stocks, onTrade }: StockTraderProps) {
  const [selectedStock, setSelectedStock] = useState<string>("")
  const [tradeType, setTradeType] = useState<'BUY' | 'SELL'>('BUY')
  const [quantity, setQuantity] = useState<number>(1)
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET')
  const [limitPrice, setLimitPrice] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
  const [demoBalance, setDemoBalance] = useState(100000) // ₹1,00,000 demo balance

  const selectedStockData = stocks.find(stock => stock.symbol === selectedStock)
  const currentPrice = selectedStockData?.price || 0
  const effectivePrice = orderType === 'MARKET' ? currentPrice : limitPrice
  const totalAmount = quantity * effectivePrice

  const handleTrade = async () => {
    if (!selectedStock || !selectedStockData || quantity <= 0) {
      setMessage({type: 'error', text: 'Please select a stock and enter valid quantity'})
      return
    }

    if (tradeType === 'BUY' && totalAmount > demoBalance) {
      setMessage({type: 'error', text: 'Insufficient balance for this trade'})
      return
    }

    setIsLoading(true)
    setMessage(null)

    try {
      const tradeOrder: TradeOrder = {
        symbol: selectedStock,
        type: tradeType,
        quantity,
        price: effectivePrice,
        total: totalAmount
      }

      // Call API to execute trade
      const response = await fetch('/api/trades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: selectedStock,
          type: tradeType.toLowerCase(),
          quantity,
          price: effectivePrice,
          broker: 'demo' // Use demo mode
        }),
      })

      const result = await response.json()

      if (response.ok) {
        // Update demo balance
        const balanceChange = tradeType === 'BUY' ? -totalAmount : totalAmount
        setDemoBalance(prev => prev + balanceChange)

        setMessage({
          type: 'success', 
          text: `${tradeType} order for ${quantity} shares of ${selectedStock} placed successfully!`
        })

        // Reset form
        setQuantity(1)
        setLimitPrice(0)
        
        // Callback to parent component
        onTrade?.(tradeOrder)
      } else {
        setMessage({type: 'error', text: result.error || 'Trade execution failed'})
      }
    } catch (error) {
      setMessage({type: 'error', text: 'Network error. Please try again.'})
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {tradeType === 'BUY' ? (
            <TrendingUp className="h-5 w-5 text-green-600" />
          ) : (
            <TrendingDown className="h-5 w-5 text-red-600" />
          )}
          Live Stock Trading
        </CardTitle>
        <div className="flex items-center justify-between">
          <Badge variant="outline">Demo Mode</Badge>
          <div className="text-sm text-muted-foreground">
            Balance: <span className="font-semibold text-green-600">₹{demoBalance.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stock Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="stock">Select Stock</Label>
            <Select value={selectedStock} onValueChange={setSelectedStock}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a stock" />
              </SelectTrigger>
              <SelectContent>
                {stocks.map((stock) => (
                  <SelectItem key={stock.symbol} value={stock.symbol}>
                    <div className="flex items-center justify-between w-full">
                      <span>{stock.symbol}</span>
                      <span className="ml-2 text-sm text-muted-foreground">
                        ₹{stock.price.toFixed(2)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="trade-type">Trade Type</Label>
            <Select value={tradeType} onValueChange={(value) => setTradeType(value as 'BUY' | 'SELL')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BUY">
                  <span className="text-green-600">BUY</span>
                </SelectItem>
                <SelectItem value="SELL">
                  <span className="text-red-600">SELL</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Current Stock Info */}
        {selectedStockData && (
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Current Price</Label>
                  <div className="font-semibold">₹{selectedStockData.price.toFixed(2)}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Change</Label>
                  <div className={`font-semibold ${selectedStockData.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedStockData.change >= 0 ? '+' : ''}₹{selectedStockData.change.toFixed(2)}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Change %</Label>
                  <div className={`font-semibold ${selectedStockData.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedStockData.changePercent >= 0 ? '+' : ''}{selectedStockData.changePercent.toFixed(2)}%
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Volume</Label>
                  <div className="font-semibold">{selectedStockData.volume.toLocaleString()}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="order-type">Order Type</Label>
            <Select value={orderType} onValueChange={(value) => setOrderType(value as 'MARKET' | 'LIMIT')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MARKET">Market Order</SelectItem>
                <SelectItem value="LIMIT">Limit Order</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              placeholder="Enter quantity"
            />
          </div>

          {orderType === 'LIMIT' && (
            <div className="space-y-2">
              <Label htmlFor="limit-price">Limit Price (₹)</Label>
              <Input
                id="limit-price"
                type="number"
                step="0.01"
                min="0"
                value={limitPrice}
                onChange={(e) => setLimitPrice(Number(e.target.value))}
                placeholder="Enter limit price"
              />
            </div>
          )}
        </div>

        {/* Order Summary */}
        {selectedStock && quantity > 0 && (
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Stock:</span>
                  <span className="font-semibold">{selectedStock}</span>
                </div>
                <div className="flex justify-between">
                  <span>Quantity:</span>
                  <span className="font-semibold">{quantity} shares</span>
                </div>
                <div className="flex justify-between">
                  <span>Price per share:</span>
                  <span className="font-semibold">₹{effectivePrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold">Total Amount:</span>
                  <span className="font-bold text-lg">₹{totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Messages */}
        {message && (
          <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className={message.type === 'error' ? 'text-red-800' : 'text-green-800'}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        {/* Trade Button */}
        <Button
          onClick={handleTrade}
          disabled={!selectedStock || quantity <= 0 || isLoading || (orderType === 'LIMIT' && limitPrice <= 0)}
          className={`w-full ${tradeType === 'BUY' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
          size="lg"
        >
          {isLoading ? 'Processing...' : `${tradeType} ${quantity} ${selectedStock} ${quantity === 1 ? 'Share' : 'Shares'}`}
        </Button>
      </CardContent>
    </Card>
  )
}
