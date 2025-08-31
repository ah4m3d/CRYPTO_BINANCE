"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Target, Zap, BarChart3, Brain } from "lucide-react"

export function AIWatchlistDemo() {
  return (
    <Card className="mb-6 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-900">
          <Brain className="w-5 h-5" />
          AI-Powered Stock Analysis
          <Badge className="bg-blue-600 text-white">NEW</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
            <div className="p-2 bg-green-100 rounded-full">
              <Target className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">VWAP Analysis</h4>
              <p className="text-xs text-muted-foreground">Volume-weighted average pricing for optimal entry points</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
            <div className="p-2 bg-blue-100 rounded-full">
              <BarChart3 className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">RSI Momentum</h4>
              <p className="text-xs text-muted-foreground">14-period RSI for overbought/oversold detection</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
            <div className="p-2 bg-purple-100 rounded-full">
              <Zap className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Smart Signals</h4>
              <p className="text-xs text-muted-foreground">AI combines indicators for confidence-scored recommendations</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-center gap-4 p-3 bg-white rounded-lg border border-dashed">
          <TrendingUp className="w-4 h-4 text-green-600" />
          <span className="text-sm text-muted-foreground">Choose timeframe (3s to 1M) and add stocks for automated analysis</span>
          <TrendingDown className="w-4 h-4 text-red-600" />
        </div>
      </CardContent>
    </Card>
  )
}
