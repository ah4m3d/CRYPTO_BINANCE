"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RefreshCw, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Trade {
  id: string
  symbol: string
  type: "BUY" | "SELL"
  quantity: number
  price: number
  total: number
  status: "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED"
  executedAt?: string
  createdAt: string
  brokerOrderId?: string
}

export function TradingHistory() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchTrades = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/trades')
      if (!response.ok) {
        throw new Error('Failed to fetch trades')
      }
      
      const data = await response.json()
      setTrades(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTrades()
  }, [])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trading History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Trading History</CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchTrades}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-8 text-red-500">
              Error: {error}
            </div>
          ) : trades.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No trading history available. Start trading to see your transactions here.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date/Time</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Order ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trades.map((trade) => (
                  <TableRow key={trade.id}>
                    <TableCell className="font-mono text-sm">
                      {new Date(trade.executedAt || trade.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-medium">{trade.symbol}</TableCell>
                    <TableCell>
                      <Badge variant={trade.type === "BUY" ? "default" : "secondary"}>
                        {trade.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{trade.quantity}</TableCell>
                    <TableCell>₹{trade.price.toFixed(2)}</TableCell>
                    <TableCell>₹{trade.total.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          trade.status === "COMPLETED"
                            ? "default"
                            : trade.status === "PENDING"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {trade.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {trade.brokerOrderId || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
