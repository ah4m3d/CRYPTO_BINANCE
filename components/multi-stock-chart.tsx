"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChartContainer, ChartConfig, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts"
import type { StockData } from "@/types/stock"

interface MultiStockChartProps {
  stocks: StockData[]
  isLoading: boolean
}

const colors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

export function MultiStockChart({ stocks, isLoading }: MultiStockChartProps) {
  const [selectedStocks, setSelectedStocks] = useState<string[]>([])
  const [timeRange, setTimeRange] = useState<string>("30")
  const [chartData, setChartData] = useState<any[]>([])
  const [isLoadingChart, setIsLoadingChart] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleStockToggle = (symbol: string) => {
    setSelectedStocks(prev => 
      prev.includes(symbol) 
        ? prev.filter(s => s !== symbol)
        : [...prev, symbol]
    )
  }

  // Fetch live combined data for selected stocks
  const fetchCombinedLiveData = async () => {
    if (selectedStocks.length === 0) {
      setChartData([])
      setError(null)
      return
    }

    setIsLoadingChart(true)
    setError(null)
    
    try {
      console.log(`Fetching data for ${selectedStocks.length} stocks:`, selectedStocks)
      
      // Fetch historical data for all selected stocks
      const promises = selectedStocks.map(async (symbol) => {
        try {
          const response = await fetch(`/api/historical-data?symbol=${symbol}&days=${timeRange}`)
          if (response.ok) {
            const data = await response.json()
            console.log(`Data for ${symbol}:`, data.data?.length || 0, 'points')
            return { symbol, data: data.data || [] }
          } else {
            console.warn(`Failed to fetch data for ${symbol}: ${response.status}`)
            return { symbol, data: [] }
          }
        } catch (error) {
          console.error(`Error fetching data for ${symbol}:`, error)
          return { symbol, data: [] }
        }
      })

      const results = await Promise.all(promises)
      const validData = results.filter(result => result.data.length > 0)
      
      console.log(`Successfully fetched data for ${validData.length}/${selectedStocks.length} stocks`)

      if (validData.length === 0) {
        setError('No historical data available for selected stocks')
        setChartData([])
        return
      }

      // Combine data by date
      const dateMap = new Map<string, any>()

      // Initialize date map with all dates from all stocks
      validData.forEach(({ symbol, data }) => {
        data.forEach((point: any) => {
          if (!dateMap.has(point.date)) {
            dateMap.set(point.date, { date: point.date })
          }
          // Use closing price for comparison
          dateMap.get(point.date)[symbol] = point.close || point.price || 0
        })
      })

      // Convert to array and sort by date
      const combinedData = Array.from(dateMap.values()).sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      )
      
      console.log(`Combined data points: ${combinedData.length}`)
      setChartData(combinedData)
      
    } catch (error) {
      console.error('Error fetching combined live data:', error)
      setError('Failed to load comparison data')
      setChartData([])
    } finally {
      setIsLoadingChart(false)
    }
  }

  useEffect(() => {
    fetchCombinedLiveData()
  }, [selectedStocks, timeRange])

  const chartConfig: ChartConfig = {}
  selectedStocks.forEach((symbol, index) => {
    chartConfig[symbol] = {
      label: symbol,
      color: colors[index % colors.length],
    }
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Compare Stocks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading comparison data...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <CardTitle>Compare Stocks</CardTitle>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 Days</SelectItem>
              <SelectItem value="30">30 Days</SelectItem>
              <SelectItem value="90">90 Days</SelectItem>
              <SelectItem value="365">1 Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Stock Selection */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {stocks.map((stock) => (
              <div key={stock.symbol} className="flex items-center space-x-2">
                <Checkbox
                  id={stock.symbol}
                  checked={selectedStocks.includes(stock.symbol)}
                  onCheckedChange={() => handleStockToggle(stock.symbol)}
                />
                <div className="flex items-center space-x-2">
                  {selectedStocks.includes(stock.symbol) && (
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: colors[selectedStocks.indexOf(stock.symbol) % colors.length] }}
                    />
                  )}
                  <label htmlFor={stock.symbol} className="text-sm font-medium cursor-pointer">
                    {stock.symbol}
                  </label>
                </div>
              </div>
            ))}
          </div>

          {/* Selected Stocks Info */}
          {selectedStocks.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedStocks.map((symbol, index) => {
                const stock = stocks.find(s => s.symbol === symbol)
                if (!stock) return null
                
                return (
                  <div key={symbol} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: colors[index % colors.length] }}
                        />
                        <span className="font-medium">{stock.symbol}</span>
                      </div>
                      <span className="text-sm">₹{stock.price.toFixed(2)}</span>
                    </div>
                    <div className={`text-sm ${stock.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {stock.change >= 0 ? '+' : ''}₹{stock.change.toFixed(2)} ({stock.changePercent.toFixed(2)}%)
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Chart */}
          {selectedStocks.length === 0 ? (
            <div className="flex items-center justify-center h-64 border-2 border-dashed border-muted-foreground/25 rounded-lg">
              <div className="text-center">
                <p className="text-muted-foreground">Select stocks to compare their performance</p>
                <p className="text-sm text-muted-foreground mt-2">Choose up to 5 stocks for comparison</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64 border rounded-lg">
              <div className="text-center">
                <p className="text-red-600 mb-2">{error}</p>
                <p className="text-sm text-muted-foreground">Try selecting different stocks or time range</p>
              </div>
            </div>
          ) : isLoadingChart ? (
            <div className="flex items-center justify-center h-64 border rounded-lg">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-muted-foreground">Loading live comparison data...</p>
              </div>
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex items-center justify-center h-64 border rounded-lg">
              <div className="text-center">
                <p className="text-muted-foreground">No data available for selected stocks</p>
                <p className="text-sm text-muted-foreground mt-2">Try selecting different stocks or time range</p>
              </div>
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-64">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                />
                <YAxis tickFormatter={(value) => `₹${value}`} />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  labelFormatter={(value) => new Date(value).toLocaleDateString('en-IN', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                  formatter={(value, name) => [`₹${Number(value).toFixed(2)}`, `${name} (Live)`]}
                />
                {selectedStocks.map((symbol, index) => (
                  <Line
                    key={symbol}
                    type="monotone"
                    dataKey={symbol}
                    stroke={colors[index % colors.length]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, stroke: colors[index % colors.length], strokeWidth: 2 }}
                  />
                ))}
              </LineChart>
            </ChartContainer>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
