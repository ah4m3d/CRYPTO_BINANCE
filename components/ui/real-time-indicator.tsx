"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Loader2, Wifi, WifiOff } from "lucide-react"

interface RealTimeIndicatorProps {
  refreshRate: number // in seconds
  isActive: boolean
  lastUpdate?: string
}

export function RealTimeIndicator({ refreshRate, isActive, lastUpdate }: RealTimeIndicatorProps) {
  const [countdown, setCountdown] = useState(refreshRate)
  const [isConnected, setIsConnected] = useState(true)

  useEffect(() => {
    if (!isActive) return

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          return refreshRate // Reset countdown
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [refreshRate, isActive])

  useEffect(() => {
    setCountdown(refreshRate)
  }, [refreshRate])

  const getStatusColor = () => {
    if (!isActive) return "bg-gray-500"
    if (refreshRate <= 10) return "bg-red-500" // Ultra-fast
    if (refreshRate <= 60) return "bg-orange-500" // Fast
    if (refreshRate <= 3600) return "bg-blue-500" // Medium
    return "bg-green-500" // Slow
  }

  const getStatusText = () => {
    if (!isActive) return "Paused"
    if (refreshRate <= 10) return "Ultra-Fast"
    if (refreshRate <= 60) return "Real-Time"
    if (refreshRate <= 3600) return "Live"
    return "Scheduled"
  }

  return (
    <div className="flex items-center gap-2">
      <Badge className={`text-white ${getStatusColor()}`}>
        {isConnected ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
        {getStatusText()}
      </Badge>
      
      {isActive && (
        <Badge variant="outline" className="animate-pulse">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          Next update: {countdown}s
        </Badge>
      )}
      
      {lastUpdate && (
        <span className="text-xs text-muted-foreground">
          Last: {new Date(lastUpdate).toLocaleTimeString()}
        </span>
      )}
    </div>
  )
}
