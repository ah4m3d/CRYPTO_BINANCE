import type { StockData } from "@/types/stock"
import { generateTradingSignals, type TechnicalData, type TechnicalIndicators } from './technical-analysis'

// Yahoo Finance API configuration
const YAHOO_FINANCE_BASE = "https://query1.finance.yahoo.com/v8/finance/chart"

export interface HistoricalDataPoint {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface HistoricalData {
  symbol: string
  data: HistoricalDataPoint[]
}

class YahooFinanceAPI {
  private baseURL = '/api/stocks'

  async getQuote(symbol: string) {
    try {
      const response = await fetch(`${this.baseURL}?symbols=${encodeURIComponent(symbol)}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (!data || data.length === 0) {
        throw new Error('No data found')
      }

      const stockData = data[0]
      
      return {
        symbol: stockData.symbol,
        name: stockData.name || stockData.symbol,
        price: stockData.price || stockData.currentPrice,
        change: stockData.change,
        changePercent: stockData.changePercent,
        volume: stockData.volume,
        previousClose: stockData.previousClose,
        marketCap: stockData.marketCap,
        currency: stockData.currency || 'INR'
      }
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error)
      throw error
    }
  }

  async getHistoricalData(symbol: string, days: number = 30) {
    try {
      const response = await fetch(
        `${this.baseURL}?action=historical&symbols=${encodeURIComponent(symbol)}&days=${days}`
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (!data || data.length === 0) {
        throw new Error('No historical data found')
      }

      return data[0] // Return the first (and only) result
    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error)
      throw error
    }
  }

  async getTechnicalAnalysis(symbol: string, timeframe: string = '1d', days: number = 30): Promise<TechnicalIndicators> {
    try {
      const historicalResponse = await this.getHistoricalData(symbol, days)
      const technicalData: TechnicalData[] = historicalResponse.data.map((point: HistoricalDataPoint) => ({
        date: point.date,
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.close,
        volume: point.volume
      }))

      return generateTradingSignals(technicalData, timeframe)
    } catch (error) {
      console.error(`Error calculating technical analysis for ${symbol}:`, error)
      // Return default values on error
      return {
        vwap: 0,
        rsi: 50,
        buyPrice: 0,
        sellPrice: 0,
        signal: 'HOLD',
        confidence: 0,
        timeframe,
        lastUpdated: new Date().toISOString()
      }
    }
  }

  // Request caching and rate limiting
const requestCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 2000 // 2 seconds cache duration
const pendingRequests = new Map<string, Promise<any>>()

export async function getBatchQuotes(symbols: string[], timeframe?: string): Promise<any[]> {
  if (!symbols || symbols.length === 0) {
    return []
  }

  try {
    // Create cache key for this request
    const cacheKey = `batch-${symbols.sort().join(',')}-${timeframe || 'default'}`
    const now = Date.now()
    
    // Check cache first
    const cached = requestCache.get(cacheKey)
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      console.log(`Cache hit for ${symbols.length} symbols`)
      return cached.data
    }

    // Check if request is already pending
    if (pendingRequests.has(cacheKey)) {
      console.log(`Request already pending for ${symbols.length} symbols`)
      return await pendingRequests.get(cacheKey)!
    }

    // Make the actual request
    const requestPromise = (async () => {
      console.log(`Making API request for ${symbols.length} symbols:`, symbols)
      
      const response = await fetch('/api/stocks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbols,
          timeframe: timeframe || '1d'
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (!Array.isArray(data)) {
        throw new Error('Expected array response from API')
      }

      // Process and validate the data
      const processedData = data.map((quote: any) => {
        try {
          return {
            symbol: quote.symbol || '',
            regularMarketPrice: Number(quote.regularMarketPrice) || 0,
            regularMarketChange: Number(quote.regularMarketChange) || 0,
            regularMarketChangePercent: Number(quote.regularMarketChangePercent) || 0,
            regularMarketVolume: Number(quote.regularMarketVolume) || 0,
            regularMarketTime: quote.regularMarketTime || new Date().toISOString(),
            currency: quote.currency || 'INR',
            marketState: quote.marketState || 'REGULAR',
            // Add fallback data for technical analysis
            regularMarketOpen: Number(quote.regularMarketOpen) || Number(quote.regularMarketPrice) || 0,
            regularMarketHigh: Number(quote.regularMarketHigh) || Number(quote.regularMarketPrice) || 0,
            regularMarketLow: Number(quote.regularMarketLow) || Number(quote.regularMarketPrice) || 0,
            regularMarketPreviousClose: Number(quote.regularMarketPreviousClose) || Number(quote.regularMarketPrice) || 0
          }
        } catch (error) {
          console.error(`Error processing quote for ${quote.symbol}:`, error)
          return {
            symbol: quote.symbol || '',
            regularMarketPrice: 0,
            regularMarketChange: 0,
            regularMarketChangePercent: 0,
            regularMarketVolume: 0,
            regularMarketTime: new Date().toISOString(),
            currency: 'INR',
            marketState: 'CLOSED',
            regularMarketOpen: 0,
            regularMarketHigh: 0,
            regularMarketLow: 0,
            regularMarketPreviousClose: 0
          }
        }
      })

      // Cache the result
      requestCache.set(cacheKey, { data: processedData, timestamp: now })
      
      // Clean up old cache entries
      for (const [key, value] of requestCache.entries()) {
        if (now - value.timestamp > CACHE_DURATION * 2) {
          requestCache.delete(key)
        }
      }

      return processedData
    })()

    // Store the pending request
    pendingRequests.set(cacheKey, requestPromise)

    try {
      const result = await requestPromise
      return result
    } finally {
      // Clean up the pending request
      pendingRequests.delete(cacheKey)
    }

  } catch (error) {
    console.error('Error in getBatchQuotes:', error)
    
    // Return fallback data to prevent crashes
    return symbols.map(symbol => ({
      symbol,
      regularMarketPrice: 0,
      regularMarketChange: 0,
      regularMarketChangePercent: 0,
      regularMarketVolume: 0,
      regularMarketTime: new Date().toISOString(),
      currency: 'INR',
      marketState: 'CLOSED',
      regularMarketOpen: 0,
      regularMarketHigh: 0,
      regularMarketLow: 0,
      regularMarketPreviousClose: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }))
  }
}

  async getBatchTechnicalAnalysis(symbols: string[], timeframe: string = '1d', days: number = 30): Promise<Map<string, TechnicalIndicators>> {
    const results = await Promise.allSettled(
      symbols.map(symbol => this.getTechnicalAnalysis(symbol, timeframe, days))
    )

    const technicalMap = new Map<string, TechnicalIndicators>()
    
    results.forEach((result, index) => {
      const symbol = symbols[index]
      if (result.status === 'fulfilled') {
        technicalMap.set(symbol, result.value)
      } else {
        console.error(`Failed to get technical analysis for ${symbol}:`, result.reason)
        technicalMap.set(symbol, {
          vwap: 0,
          rsi: 50,
          buyPrice: 0,
          sellPrice: 0,
          signal: 'HOLD',
          confidence: 0,
          timeframe,
          lastUpdated: new Date().toISOString()
        })
      }
    })

    return technicalMap
  }
}

export const yahooFinanceAPI = new YahooFinanceAPI()
