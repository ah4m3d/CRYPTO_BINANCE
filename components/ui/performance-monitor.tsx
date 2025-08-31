import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { Badge } from './badge'
import { Activity, Clock, Zap, TrendingUp } from 'lucide-react'

interface PerformanceStats {
  totalRequests: number
  cacheHits: number
  averageResponseTime: number
  rateLimitSkips: number
  lastRefresh: Date | null
}

interface PerformanceMonitorProps {
  stats: PerformanceStats
  timeframeName: string
  isActive: boolean
}

export function PerformanceMonitor({ stats, timeframeName, isActive }: PerformanceMonitorProps) {
  const cacheHitRate = stats.totalRequests > 0 ? (stats.cacheHits / stats.totalRequests * 100) : 0
  const efficiency = stats.totalRequests > 0 ? ((stats.cacheHits + stats.rateLimitSkips) / stats.totalRequests * 100) : 0

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Performance Monitor
          <Badge variant={isActive ? "default" : "secondary"} className="ml-auto">
            {isActive ? "Active" : "Paused"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Timeframe:</span>
          <Badge variant="outline">{timeframeName}</Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-blue-500" />
              <span className="text-muted-foreground">Requests:</span>
            </div>
            <div className="font-mono font-medium">{stats.totalRequests}</div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-green-500" />
              <span className="text-muted-foreground">Cache Hits:</span>
            </div>
            <div className="font-mono font-medium text-green-600">{stats.cacheHits}</div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-orange-500" />
              <span className="text-muted-foreground">Avg Response:</span>
            </div>
            <div className="font-mono font-medium">{stats.averageResponseTime}ms</div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-purple-500" />
              <span className="text-muted-foreground">Rate Limits:</span>
            </div>
            <div className="font-mono font-medium text-orange-600">{stats.rateLimitSkips}</div>
          </div>
        </div>

        <div className="pt-2 border-t space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Cache Hit Rate:</span>
            <span className={`font-medium ${cacheHitRate > 60 ? 'text-green-600' : cacheHitRate > 30 ? 'text-yellow-600' : 'text-red-600'}`}>
              {cacheHitRate.toFixed(1)}%
            </span>
          </div>
          
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Efficiency:</span>
            <span className={`font-medium ${efficiency > 70 ? 'text-green-600' : efficiency > 40 ? 'text-yellow-600' : 'text-red-600'}`}>
              {efficiency.toFixed(1)}%
            </span>
          </div>
          
          {stats.lastRefresh && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Last Refresh:</span>
              <span className="font-mono font-medium">
                {new Date(stats.lastRefresh).toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
