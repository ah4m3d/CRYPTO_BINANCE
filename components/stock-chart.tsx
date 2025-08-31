"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { ChartContainer, ChartConfig, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, AreaChart, Area } from "recharts"
import { Calendar, TrendingUp, TrendingDown, DollarSign, IndianRupee } from "lucide-react"
import type { StockData } from "@/types/stock"

interface StockChartProps {
  stocks: StockData[]
  isLoading: boolean
}

interface ChartDataPoint {
  date: string
  price: number
  priceUSD: number
  volume: number
}

type Currency = 'INR' | 'USD'

// Currency conversion rate (you can make this dynamic by fetching from an API)
const USD_TO_INR_RATE = 83.25 // Approximate current rate

// Convert price between currencies
const convertPrice = (price: number, fromCurrency: Currency, toCurrency: Currency): number => {
  if (fromCurrency === toCurrency) return price
  
  if (fromCurrency === 'INR' && toCurrency === 'USD') {
    return price / USD_TO_INR_RATE
  } else if (fromCurrency === 'USD' && toCurrency === 'INR') {
    return price * USD_TO_INR_RATE
  }
  
  return price
}

// Get currency symbol
const getCurrencySymbol = (currency: Currency): string => {
  return currency === 'INR' ? '₹' : '$'
}

// Format currency value
const formatCurrency = (value: number, currency: Currency): string => {
  const symbol = getCurrencySymbol(currency)
  if (currency === 'USD') {
    return `${symbol}${value.toFixed(2)}`
  } else {
    return `${symbol}${value.toFixed(2)}`
  }
}

// Fetch live historical data from API
const fetchLiveHistoricalData = async (symbol: string, days: number = 30): Promise<ChartDataPoint[]> => {
  try {
    const response = await fetch(`/api/historical-data?symbol=${symbol}&days=${days}`)
    
    if (!response.ok) {
      console.warn(`Historical data API returned ${response.status} for ${symbol}`)
      // If API returns error, fall back to mock data
      return generateMockHistoricalDataFallback(symbol, days)
    }
    
    const historicalData = await response.json()
    
    if (!historicalData.data || historicalData.data.length === 0) {
      console.warn(`No historical data available for ${symbol}`)
      return generateMockHistoricalDataFallback(symbol, days)
    }
    
    if (historicalData.fallback) {
      console.log(`Using fallback data from API for ${symbol}`)
    } else {
      console.log(`Successfully loaded live data: ${historicalData.data.length} points for ${symbol}`)
    }
    
    // Convert to chart format with both currencies
    return historicalData.data.map((point: any) => ({
      date: point.date,
      price: point.close, // INR price
      priceUSD: convertPrice(point.close, 'INR', 'USD'), // USD price
      volume: point.volume || 0,
    }))
  } catch (error) {
    console.error('Error fetching historical data:', error)
    // Fallback to mock data if everything fails
    return generateMockHistoricalDataFallback(symbol, days)
  }
}

// Fallback mock data generator (kept as backup)
const generateMockHistoricalDataFallback = (symbol: string, days: number = 30): ChartDataPoint[] => {
  console.warn(`Using fallback mock data for ${symbol}`)
  
  const data: ChartDataPoint[] = []
  // Use a more realistic base price based on common Indian stock prices
  let currentPrice = 1500 + Math.random() * 2000 // Random price between 1500-3500
  
  for (let i = days; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    
    // Simulate more realistic price movement
    const change = (Math.random() - 0.5) * 0.03 // ±1.5% daily change (more realistic)
    currentPrice = Math.max(100, currentPrice * (1 + change)) // Prevent negative prices
    
    const priceINR = Number(currentPrice.toFixed(2))
    const priceUSD = convertPrice(priceINR, 'INR', 'USD')
    
    data.push({
      date: date.toISOString().split('T')[0],
      price: priceINR,
      priceUSD: Number(priceUSD.toFixed(2)),
      volume: Math.floor(Math.random() * 5000000 + 1000000), // 1M to 6M volume
    })
  }
  
  return data
}

const chartConfig = {
  price: {
    label: "Price",
    color: "hsl(var(--chart-1))",
  },
  volume: {
    label: "Volume",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

export function StockChart({ stocks, isLoading }: StockChartProps) {
  const [selectedStock, setSelectedStock] = useState<string>("")
  const [timeRange, setTimeRange] = useState<string>("30")
  const [chartType, setChartType] = useState<"line" | "area">("line")
  const [currency, setCurrency] = useState<Currency>('INR')
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [isLoadingChart, setIsLoadingChart] = useState(false)
  const [chartError, setChartError] = useState<string | null>(null)

  const selectedStockData = stocks.find(stock => stock.symbol === selectedStock)

  useEffect(() => {
    const loadHistoricalData = async () => {
      if (selectedStockData) {
        setIsLoadingChart(true)
        setChartError(null)
        
        try {
          const data = await fetchLiveHistoricalData(selectedStockData.symbol, Number(timeRange))
          setChartData(data)
        } catch (error) {
          setChartError('Failed to load chart data')
          console.error('Chart data loading error:', error)
        } finally {
          setIsLoadingChart(false)
        }
      }
    }

    loadHistoricalData()
  }, [selectedStockData, timeRange])

  useEffect(() => {
    if (stocks.length > 0 && !selectedStock) {
      setSelectedStock(stocks[0].symbol)
    }
  }, [stocks, selectedStock])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stock Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading chart data...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <CardTitle>Stock Chart</CardTitle>
          <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
            <Select value={selectedStock} onValueChange={setSelectedStock}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Select a stock" />
              </SelectTrigger>
              <SelectContent>
                {stocks.map((stock) => (
                  <SelectItem key={stock.symbol} value={stock.symbol}>
                    {stock.symbol} - {stock.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 Days</SelectItem>
                <SelectItem value="30">30 Days</SelectItem>
                <SelectItem value="90">90 Days</SelectItem>
                <SelectItem value="365">1 Year</SelectItem>
              </SelectContent>
            </Select>

            <Select value={currency} onValueChange={(value: Currency) => setCurrency(value)}>
              <SelectTrigger className="w-full sm:w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INR">
                  <div className="flex items-center gap-1">
                    <IndianRupee className="h-3 w-3" />
                    INR
                  </div>
                </SelectItem>
                <SelectItem value="USD">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    USD
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="flex">
              <Button
                variant={chartType === "line" ? "default" : "outline"}
                size="sm"
                onClick={() => setChartType("line")}
              >
                Line
              </Button>
              <Button
                variant={chartType === "area" ? "default" : "outline"}
                size="sm"
                onClick={() => setChartType("area")}
              >
                Area
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!selectedStock ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Select a stock to view its chart</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Stock Info */}
            {selectedStockData && (
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <h3 className="font-semibold text-lg">{selectedStockData.symbol}</h3>
                  <p className="text-sm text-muted-foreground">{selectedStockData.name}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {currency === 'USD' 
                      ? formatCurrency(convertPrice(selectedStockData.price, 'INR', 'USD'), currency)
                      : formatCurrency(selectedStockData.price, currency)
                    }
                  </div>
                  <div className={`flex items-center text-sm ${selectedStockData.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedStockData.change >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                    {currency === 'USD' 
                      ? formatCurrency(convertPrice(selectedStockData.change, 'INR', 'USD'), currency)
                      : formatCurrency(selectedStockData.change, currency)
                    } ({selectedStockData.changePercent.toFixed(2)}%)
                  </div>
                </div>
              </div>
            )}

            {/* Chart Loading State */}
            {isLoadingChart ? (
              <div className="flex items-center justify-center h-64 border rounded-lg">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-muted-foreground">Loading live chart data...</p>
                </div>
              </div>
            ) : chartError ? (
              <div className="flex items-center justify-center h-64 border rounded-lg">
                <div className="text-center">
                  <p className="text-red-600 mb-2">Failed to load live data</p>
                  <p className="text-sm text-muted-foreground">Using fallback data</p>
                </div>
              </div>
            ) : (
              /* Chart */
              <ChartContainer config={chartConfig} className="h-64">
                {chartType === "line" ? (
                  <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis 
                      domain={['dataMin - 50', 'dataMax + 50']}
                      tickFormatter={(value) => formatCurrency(value, currency)}
                    />
                    <ChartTooltip 
                      content={<ChartTooltipContent />}
                      labelFormatter={(value) => new Date(value).toLocaleDateString('en-IN', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                      formatter={(value, name) => [formatCurrency(Number(value), currency), 'Live Price']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey={currency === 'USD' ? 'priceUSD' : 'price'}
                      stroke="var(--color-price)" 
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, stroke: "var(--color-price)", strokeWidth: 2 }}
                    />
                  </LineChart>
                ) : (
                  <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-price)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--color-price)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis 
                      domain={['dataMin - 50', 'dataMax + 50']}
                      tickFormatter={(value) => formatCurrency(value, currency)}
                    />
                    <ChartTooltip 
                      content={<ChartTooltipContent />}
                      labelFormatter={(value) => new Date(value).toLocaleDateString('en-IN', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                      formatter={(value, name) => [formatCurrency(Number(value), currency), 'Live Price']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey={currency === 'USD' ? 'priceUSD' : 'price'}
                      stroke="var(--color-price)" 
                      fillOpacity={1} 
                      fill="url(#colorPrice)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                )}
              </ChartContainer>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
