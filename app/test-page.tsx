"use client"

import { useState } from "react"
import { StockDashboard } from "@/components/stock-dashboard"
import AIWatchlistAnalyzer from "@/components/ai-watchlist-analyzer"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, BarChart3 } from "lucide-react"

export default function Home() {
  const [activeTab, setActiveTab] = useState("ai-watchlist")

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Stock Trading Platform</h1>
          <p className="text-muted-foreground">Professional trading with real-time data and advanced technical analysis</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Trading Dashboard
              <Badge variant="outline" className="ml-1">
                Real-time
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="ai-watchlist" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              AI Watchlist Analyzer
              <Badge variant="outline" className="ml-1">
                RSI • VWAP • MA
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-semibold mb-2">Professional Trading Dashboard</h2>
              <p className="text-muted-foreground">
                Real-time stock monitoring, broker integration, and trading rules management
              </p>
            </div>
            <StockDashboard />
          </TabsContent>

          <TabsContent value="ai-watchlist" className="space-y-6">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-semibold mb-2">AI-Powered Technical Analysis</h2>
              <p className="text-muted-foreground">
                Advanced technical indicators including RSI, VWAP, Moving Averages (50 & 200) with intelligent buy/sell signals
              </p>
            </div>
            <AIWatchlistAnalyzer />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
