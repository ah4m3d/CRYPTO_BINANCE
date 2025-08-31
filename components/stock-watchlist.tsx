"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { StockAutocomplete } from "@/components/ui/stock-autocomplete"
import type { StockData } from "@/types/stock"

interface StockWatchlistProps {
  stocks: StockData[]
  isLoading: boolean
  error: string | null
  onRefresh: () => void
  onAddStock: (symbol: string, buyPrice?: number, sellPrice?: number, quantity?: number) => Promise<StockData>
  onRemoveStock: (symbol: string) => void
}

export function StockWatchlist({ stocks, isLoading, error, onRefresh, onAddStock, onRemoveStock }: StockWatchlistProps) {
  const [newStock, setNewStock] = useState({
    symbol: "",
    buyPrice: "",
    sellPrice: "",
    quantity: "",
  })
  const [isAdding, setIsAdding] = useState(false)
  const { toast } = useToast()

  const handleAddStock = async () => {
    if (!newStock.symbol.trim()) {
      toast({
        title: "Error",
        description: "Please enter a stock symbol",
        variant: "destructive",
      })
      return
    }

    try {
      setIsAdding(true)
      await onAddStock(
        newStock.symbol.trim(),
        newStock.buyPrice ? parseFloat(newStock.buyPrice) : undefined,
        newStock.sellPrice ? parseFloat(newStock.sellPrice) : undefined,
        newStock.quantity ? parseInt(newStock.quantity) : undefined
      )
      
      // Reset form
      setNewStock({ symbol: "", buyPrice: "", sellPrice: "", quantity: "" })
      
      toast({
        title: "Success",
        description: `${newStock.symbol.toUpperCase()} added to watchlist`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add stock",
        variant: "destructive",
      })
    } finally {
      setIsAdding(false)
    }
  }

  const handleRemoveStock = (symbol: string) => {
    onRemoveStock(symbol)
    toast({
      title: "Success",
      description: `${symbol} removed from watchlist`,
    })
  }

  return (
    <div className="space-y-4">
      {/* Add New Stock Form */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Stock</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <StockAutocomplete
              placeholder="Search stocks (e.g., RELIANCE, TCS)"
              value={newStock.symbol}
              onChange={(value) => setNewStock({ ...newStock, symbol: value })}
            />
            <Input
              type="number"
              placeholder="Buy Price"
              value={newStock.buyPrice}
              onChange={(e) => setNewStock({ ...newStock, buyPrice: e.target.value })}
            />
            <Input
              type="number"
              placeholder="Sell Price"
              value={newStock.sellPrice}
              onChange={(e) => setNewStock({ ...newStock, sellPrice: e.target.value })}
            />
            <Input
              type="number"
              placeholder="Quantity"
              value={newStock.quantity}
              onChange={(e) => setNewStock({ ...newStock, quantity: e.target.value })}
            />
            <Button onClick={handleAddStock} className="w-full" disabled={isAdding || isLoading}>
              <Plus className="w-4 h-4 mr-2" />
              {isAdding ? "Adding..." : "Add Stock"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stock List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Stock Watchlist</CardTitle>
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {error && <div className="text-red-500 text-sm mb-4 p-3 bg-red-50 rounded-md">Error: {error}</div>}

          {stocks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No stocks in watchlist. Add some stocks to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Current Price</TableHead>
                  <TableHead>Buy Price</TableHead>
                  <TableHead>Sell Price</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stocks.map((stock, index) => (
                  <TableRow key={`${stock.symbol}-${index}`}>
                    <TableCell className="font-medium">{stock.symbol}</TableCell>
                    <TableCell>₹{(stock.currentPrice || stock.price || 0).toFixed(2)}</TableCell>
                    <TableCell>₹{(stock.buyPrice || 0).toFixed(2)}</TableCell>
                    <TableCell>₹{(stock.sellPrice || 0).toFixed(2)}</TableCell>
                    <TableCell>{stock.quantity || 0}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          stock.status === "bought" ? "default" : stock.status === "sold" ? "secondary" : "outline"
                        }
                      >
                        {stock.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => handleRemoveStock(stock.symbol)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
