import { NextResponse } from "next/server"
import { yahooFinanceAPI } from "@/lib/stock-api"

// Helper function for retrying API calls with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      if (attempt === maxRetries) {
        throw lastError
      }
      
      const delay = initialDelay * Math.pow(2, attempt)
      console.log(`API call failed, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries + 1})`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError!
}

// Yahoo Finance API integration for cryptocurrencies
async function fetchYahooFinanceQuote(symbol: string) {
  try {
    // Use the symbol as-is for crypto pairs (e.g., BTC-USD, ETH-USD)
    const yahooSymbol = symbol
    
    const result = await retryWithBackoff(async () => {
      // Fetch current quote data with timeout and retry
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout
      
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1d`,
        {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
          },
        }
      )
      
      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return response.json()
    })

    const chartResult = result?.chart?.result?.[0]
    
    if (!chartResult) {
      throw new Error('No data found')
    }

    const meta = chartResult.meta
    const quote = chartResult.indicators?.quote?.[0]
    
    if (!quote || !meta) {
      throw new Error('Invalid data structure')
    }

    // Get the most recent data point
    const timestamps = chartResult.timestamp || []
    const lastIndex = timestamps.length - 1
    
    if (lastIndex < 0) {
      throw new Error('No timestamp data')
    }

    const currentPrice = quote.close[lastIndex] || meta.regularMarketPrice || 0
    const previousClose = meta.previousClose || meta.chartPreviousClose || currentPrice
    const change = currentPrice - previousClose
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0
    
    return {
      symbol: symbol.replace('.NS', ''), // Remove .NS suffix for display
      name: meta.longName || meta.shortName || symbol,
      price: Number(currentPrice.toFixed(2)),
      change: Number(change.toFixed(2)),
      changePercent: Number(changePercent.toFixed(2)),
      volume: quote.volume[lastIndex] || 0,
      previousClose: previousClose,
      marketCap: meta.marketCap || 0,
      currency: meta.currency || 'USD',
      lastUpdated: new Date().toISOString(),
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    if (errorMessage.includes('AbortError') || errorMessage.includes('timeout')) {
      console.error(`Yahoo Finance timeout for ${symbol}: ${errorMessage}`)
    } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      console.error(`Yahoo Finance network error for ${symbol}: ${errorMessage}`)
    } else {
      console.error(`Yahoo Finance failed for ${symbol}: ${errorMessage}`)
    }
    return null
  }
}

async function fetchYahooFinanceHistorical(symbol: string, days: number = 30) {
  try {
    // Use the symbol as-is for crypto pairs (e.g., BTC-USD, ETH-USD)
    const yahooSymbol = symbol
    
    const result = await retryWithBackoff(async () => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout
      
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=${days}d`,
        {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
          },
        }
      )
      
      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return response.json()
    })

    const chartResult = result?.chart?.result?.[0]
    
    if (!chartResult) {
      throw new Error('No data found')
    }

    const timestamps = chartResult.timestamp || []
    const historicalQuote = chartResult.indicators?.quote?.[0]
    
    if (!historicalQuote || timestamps.length === 0) {
      throw new Error('No historical data available')
    }
    const quote = result.indicators?.quote?.[0]
    
    if (!quote || timestamps.length === 0) {
      throw new Error('No historical data available')
    }

    const historicalData = timestamps.map((timestamp: number, index: number) => ({
      date: new Date(timestamp * 1000).toISOString().split('T')[0],
      open: historicalQuote.open[index] || 0,
      high: historicalQuote.high[index] || 0,
      low: historicalQuote.low[index] || 0,
      close: historicalQuote.close[index] || 0,
      volume: historicalQuote.volume[index] || 0,
    })).filter((item: any) => item.close > 0) // Filter out invalid data

    return {
      symbol: symbol.replace('.NS', ''),
      data: historicalData
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    if (errorMessage.includes('AbortError') || errorMessage.includes('timeout')) {
      console.error(`Yahoo Finance historical timeout for ${symbol}: ${errorMessage}`)
    } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      console.error(`Yahoo Finance historical network error for ${symbol}: ${errorMessage}`)
    } else {
      console.error(`Yahoo Finance historical failed for ${symbol}: ${errorMessage}`)
    }
    return null
  }
}

// Enhanced fallback data generator
function generateFallbackData(symbol: string) {
  // Different price ranges for different crypto types
  let basePrice = 1000
  if (symbol === 'BTC-USD') basePrice = 45000 + Math.random() * 20000
  else if (symbol === 'ETH-USD') basePrice = 2500 + Math.random() * 1500
  else if (symbol.includes('USD')) basePrice = 0.1 + Math.random() * 500 // Other cryptos
  
  const change = (Math.random() - 0.5) * (basePrice * 0.1) // ±10% daily volatility for crypto
  const changePercent = (change / basePrice) * 100
  
  return {
    symbol: symbol,
    name: symbol.replace('-USD', ''),
    price: Number(basePrice.toFixed(2)),
    change: Number(change.toFixed(2)),
    changePercent: Number(changePercent.toFixed(2)),
    volume: Math.floor(Math.random() * 1000000000), // Higher volume for crypto
    previousClose: Number((basePrice - change).toFixed(2)),
    marketCap: Math.floor(Math.random() * 100000000000), // Lower market cap range
    currency: 'USD',
    high: Number((basePrice * 1.08).toFixed(2)),
    low: Number((basePrice * 0.92).toFixed(2)),
    lastUpdated: new Date().toISOString(),
    status: "monitoring",
    error: "Using fallback data - Yahoo Finance API unavailable"
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const symbols = searchParams.get('symbols')?.split(',') || ['BTC-USD', 'ETH-USD', 'BNB-USD', 'XRP-USD', 'ADA-USD']
    const action = searchParams.get('action') || 'quote'
    const days = parseInt(searchParams.get('days') || '30')

    // Remove duplicates and normalize symbols
    const uniqueSymbols = [...new Set(symbols.map(s => s.trim().toUpperCase().replace('.NS', '')))]

    console.log(`Fetching Yahoo Finance data for: ${uniqueSymbols.join(', ')} (action: ${action})`)

    if (action === 'historical') {
      // Fetch historical data for technical analysis
      const historicalData = await Promise.all(
        uniqueSymbols.map(async (symbol) => {
          let data = await fetchYahooFinanceHistorical(symbol, days)
          
          if (!data) {
            // Generate fallback historical data
            console.warn(`Yahoo Finance historical failed for ${symbol}, using fallback data`)
            data = generateFallbackHistoricalData(symbol, days)
          }

          return data
        })
      )

      return NextResponse.json(historicalData.filter(data => data !== null))
    }

    // Default: fetch current quotes
    const stockData = await Promise.all(
      uniqueSymbols.map(async (symbol) => {
        // Use Yahoo Finance API
        let data = await fetchYahooFinanceQuote(symbol)
        
        if (!data) {
          // Use enhanced fallback data if Yahoo Finance fails
          console.warn(`Yahoo Finance failed for ${symbol}, using fallback data`)
          data = generateFallbackData(symbol)
        } else {
          console.log(`Successfully fetched Yahoo Finance data for ${symbol}`)
        }

        return {
          ...data,
          symbol: symbol, // Ensure consistent symbol format
          status: "monitoring",
          id: symbol,
          currentPrice: data.price,
          buyPrice: Number((data.price * 0.98).toFixed(2)), // 2% below current price
          sellPrice: Number((data.price * 1.02).toFixed(2)), // 2% above current price
          quantity: 0,
        }
      })
    )

    // Filter out any null results
    const validStockData = stockData.filter(stock => stock !== null)

    console.log(`Returning data for ${validStockData.length} stocks`)
    return NextResponse.json(validStockData)
    
  } catch (error) {
    console.error("Stock API error:", error)
    return NextResponse.json({ error: "Failed to fetch stock data" }, { status: 500 })
  }
}

// Generate fallback historical data for testing
function generateFallbackHistoricalData(symbol: string, days: number) {
  const data = []
  const basePrice = 1000 + Math.random() * 2000
  let currentPrice = basePrice

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    
    const volatility = 0.02 // 2% daily volatility
    const change = (Math.random() - 0.5) * volatility * currentPrice
    const open = currentPrice
    const close = currentPrice + change
    const high = Math.max(open, close) * (1 + Math.random() * 0.01)
    const low = Math.min(open, close) * (1 - Math.random() * 0.01)
    const volume = Math.floor(Math.random() * 10000000 + 1000000)

    data.push({
      date: date.toISOString().split('T')[0],
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume
    })

    currentPrice = close
  }

  return {
    symbol,
    data
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { symbols = [], timeframe = '1d', period = '1y', interval = '1d' } = body

    if (!symbols || symbols.length === 0) {
      return NextResponse.json({ error: "No symbols provided" }, { status: 400 })
    }

    // Remove duplicates and normalize symbols
    const uniqueSymbols = [...new Set(symbols.map((s: string) => s.trim().toUpperCase().replace('.NS', '')))] as string[]

    console.log(`POST request: Fetching advanced technical analysis for ${uniqueSymbols.length} symbols with timeframe ${timeframe}`)

    const results: { [key: string]: any } = {}

    for (const symbol of uniqueSymbols) {
      try {
        // Get current quote data
        let quoteData = await fetchYahooFinanceQuote(symbol)
        
        if (!quoteData) {
          console.warn(`Yahoo Finance failed for ${symbol}, using fallback data`)
          quoteData = generateFallbackData(symbol)
        }

        // Get advanced technical analysis
        const technicalAnalysis = await yahooFinanceAPI.getAdvancedTechnicalAnalysis(symbol, timeframe, period)

        results[symbol] = {
          quote: {
            symbol: symbol,
            shortName: quoteData.name,
            regularMarketPrice: quoteData.price,
            regularMarketChange: quoteData.change,
            regularMarketChangePercent: quoteData.changePercent,
            regularMarketVolume: quoteData.volume,
            regularMarketTime: quoteData.lastUpdated,
            currency: quoteData.currency,
            marketState: 'REGULAR',
            regularMarketOpen: quoteData.price * (1 + (Math.random() - 0.5) * 0.01),
            regularMarketHigh: quoteData.price * (1 + Math.random() * 0.02),
            regularMarketLow: quoteData.price * (1 - Math.random() * 0.02),
            regularMarketPreviousClose: quoteData.previousClose
          },
          technicalAnalysis: technicalAnalysis
        }

        console.log(`Successfully processed ${symbol} with advanced technical analysis`)
      } catch (error) {
        console.error(`Failed to process ${symbol}:`, error)
        
        // Fallback data for this symbol
        const fallbackQuote = generateFallbackData(symbol)
        results[symbol] = {
          quote: {
            symbol: symbol,
            shortName: fallbackQuote.name,
            regularMarketPrice: fallbackQuote.price,
            regularMarketChange: fallbackQuote.change,
            regularMarketChangePercent: fallbackQuote.changePercent,
            regularMarketVolume: fallbackQuote.volume,
            regularMarketTime: fallbackQuote.lastUpdated,
            currency: fallbackQuote.currency,
            marketState: 'REGULAR',
            regularMarketOpen: fallbackQuote.price * 0.99,
            regularMarketHigh: fallbackQuote.price * 1.02,
            regularMarketLow: fallbackQuote.price * 0.98,
            regularMarketPreviousClose: fallbackQuote.previousClose
          },
          technicalAnalysis: null,
          error: 'Failed to fetch technical analysis'
        }
      }
    }

    console.log(`POST: Returning advanced technical analysis for ${Object.keys(results).length} symbols`)
    console.log(`POST: Response data structure:`, JSON.stringify(results, null, 2))
    return NextResponse.json({ results })
    
  } catch (error) {
    console.error("Stock API POST error:", error)
    return NextResponse.json({ error: "Failed to fetch stock data" }, { status: 500 })
  }
}
