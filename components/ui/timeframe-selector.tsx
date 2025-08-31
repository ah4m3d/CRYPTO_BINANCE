"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, Zap, TrendingUp } from "lucide-react"
import { TIMEFRAMES, type TimeframeOption } from "@/lib/technical-analysis"

interface TimeframeSelectorProps {
  selectedTimeframe: string
  onTimeframeChange: (timeframe: TimeframeOption) => void
  disabled?: boolean
}

const getTimeframeColor = (value: string) => {
  if (['3s', '5s', '10s'].includes(value)) return 'bg-red-500 text-white'
  if (['30s', '1m', '5m'].includes(value)) return 'bg-orange-500 text-white'
  if (['15m', '1h', '4h'].includes(value)) return 'bg-blue-500 text-white'
  return 'bg-green-500 text-white'
}

const getTimeframeDescription = (value: string) => {
  if (['3s', '5s', '10s'].includes(value)) return 'Scalping'
  if (['30s', '1m', '5m'].includes(value)) return 'Day Trading'
  if (['15m', '1h', '4h'].includes(value)) return 'Swing Trading'
  return 'Position Trading'
}

export function TimeframeSelector({ selectedTimeframe, onTimeframeChange, disabled = false }: TimeframeSelectorProps) {
  const [showAll, setShowAll] = useState(false)
  
  const quickTimeframes = TIMEFRAMES.slice(0, 6) // Show first 6 by default
  const displayTimeframes = showAll ? TIMEFRAMES : quickTimeframes

  return (
    <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-blue-900">Analysis Timeframe</span>
          <Badge variant="outline" className="text-xs">
            <Zap className="w-3 h-3 mr-1" />
            Real-time updates
          </Badge>
        </div>
        
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-3">
          {displayTimeframes.map((timeframe) => (
            <Button
              key={timeframe.value}
              variant={selectedTimeframe === timeframe.value ? "default" : "outline"}
              size="sm"
              onClick={() => onTimeframeChange(timeframe)}
              disabled={disabled}
              className={`relative ${
                selectedTimeframe === timeframe.value 
                  ? getTimeframeColor(timeframe.value)
                  : 'hover:bg-blue-100'
              }`}
            >
              <div className="text-center">
                <div className="font-semibold">{timeframe.label}</div>
                <div className="text-xs opacity-75">
                  {getTimeframeDescription(timeframe.value)}
                </div>
              </div>
              {selectedTimeframe === timeframe.value && (
                <div className="absolute -top-1 -right-1">
                  <TrendingUp className="w-3 h-3" />
                </div>
              )}
            </Button>
          ))}
        </div>
        
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="text-blue-600 hover:text-blue-800"
          >
            {showAll ? "Show Less" : "Show All Timeframes"}
          </Button>
          
          <div className="text-xs text-muted-foreground">
            Update rate: {TIMEFRAMES.find(t => t.value === selectedTimeframe)?.refreshRate || 30}s
          </div>
        </div>
        
        {selectedTimeframe && ['3s', '5s', '10s'].includes(selectedTimeframe) && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            ⚡ Ultra-fast updates - Perfect for scalping and high-frequency trading
          </div>
        )}
      </CardContent>
    </Card>
  )
}
