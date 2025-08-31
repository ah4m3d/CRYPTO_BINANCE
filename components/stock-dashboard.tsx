"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StockWatchlist } from "./stock-watchlist"
import { EnhancedStockWatchlist } from "./enhanced-stock-watchlist"
import { StockChart } from "./stock-chart"
import { MultiStockChart } from "./multi-stock-chart"
import { StockTrader } from "./stock-trader"
import { StockPortfolio } from "./stock-portfolio"
import { TradingRules } from "./trading-rules"
import { TradingHistory } from "./trading-history"
import { useStockData } from "@/hooks/use-stock-data"

export function StockDashboard() {
  const { stocks, isLoading, error, refreshData, addStock, removeStock } = useStockData()
  const [isTrading, setIsTrading] = useState(false)
  const [lastTrade, setLastTrade] = useState<any>(null)

  const handleTrade = (trade: any) => {
    setLastTrade(trade)
    // Refresh data to show updated trading history
    refreshData()
  }

  return (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trading Status</CardTitle>
            <Badge variant={isTrading ? "default" : "secondary"}>{isTrading ? "Active" : "Inactive"}</Badge>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => setIsTrading(!isTrading)}
                variant={isTrading ? "destructive" : "default"}
                size="sm"
              >
                {isTrading ? "Stop Trading" : "Start Trading"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Watchlist Stocks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stocks.length}</div>
            <p className="text-xs text-muted-foreground">
              {stocks.filter((s) => s.status === "monitoring").length} monitoring
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Trade</CardTitle>
          </CardHeader>
          <CardContent>
            {lastTrade ? (
              <div>
                <div className="text-lg font-bold">{lastTrade.symbol}</div>
                <p className="text-xs text-muted-foreground">
                  {lastTrade.type} {lastTrade.quantity} @ ₹{lastTrade.price}
                </p>
              </div>
            ) : (
              <div>
                <div className="text-2xl font-bold">-</div>
                <p className="text-xs text-muted-foreground">No trades yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="ai-watchlist" className="space-y-4">
        <TabsList>
          <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
          <TabsTrigger value="ai-watchlist">AI Watchlist</TabsTrigger>
          <TabsTrigger value="trading">Live Trading</TabsTrigger>
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="rules">Trading Rules</TabsTrigger>
          <TabsTrigger value="history">Trading History</TabsTrigger>
        </TabsList>

        <TabsContent value="watchlist">
          <StockWatchlist 
            stocks={stocks} 
            isLoading={isLoading} 
            error={error} 
            onRefresh={refreshData}
            onAddStock={addStock}
            onRemoveStock={removeStock}
          />
        </TabsContent>

        <TabsContent value="ai-watchlist">
          <EnhancedStockWatchlist />
        </TabsContent>

        <TabsContent value="trading">
          <div className="flex justify-center">
            <StockTrader stocks={stocks} onTrade={handleTrade} />
          </div>
        </TabsContent>

        <TabsContent value="portfolio">
          <StockPortfolio />
        </TabsContent>

        <TabsContent value="charts">
          <div className="space-y-6">
            <StockChart stocks={stocks} isLoading={isLoading} />
            <MultiStockChart stocks={stocks} isLoading={isLoading} />
          </div>
        </TabsContent>

        <TabsContent value="rules">
          <TradingRules />
        </TabsContent>

        <TabsContent value="history">
          <TradingHistory />
        </TabsContent>
      </Tabs>
    </div>
  )
}
