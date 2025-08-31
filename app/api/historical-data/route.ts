import { NextRequest, NextResponse } from "next/server"
import { yahooFinanceAPI } from "@/lib/stock-api"

// Generate fallback historical data when API fails
function generateFallbackData(symbol: string, days: number) {
  const data = []
  let currentPrice = 1500 + Math.random() * 2000 // Random base price
  
  for (let i = days; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    
    // Simulate realistic price movement
    const change = (Math.random() - 0.5) * 0.03 // ±1.5% daily change
    currentPrice = Math.max(100, currentPrice * (1 + change))
    
    data.push({
      date: date.toISOString().split('T')[0],
      open: currentPrice,
      high: currentPrice * (1 + Math.random() * 0.02),
      low: currentPrice * (1 - Math.random() * 0.02),
      close: currentPrice,
      volume: Math.floor(Math.random() * 5000000 + 1000000)
    })
  }
  
  return data
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')
    const days = searchParams.get('days') || '30'

    if (!symbol) {
      return NextResponse.json(
        { error: "Symbol parameter is required" },
        { status: 400 }
      )
    }

    console.log(`Fetching historical data for ${symbol} (${days} days) via Yahoo Finance`)

    try {
      const historicalData = await yahooFinanceAPI.getHistoricalData(symbol, parseInt(days))

      if (historicalData && historicalData.data && historicalData.data.length > 0) {
        console.log(`Successfully fetched ${historicalData.data.length} data points for ${symbol}`)
        return NextResponse.json(historicalData)
      }
    } catch (apiError) {
      console.warn(`Yahoo Finance API failed for ${symbol}:`, apiError)
    }

    // If Yahoo Finance fails or returns no data, generate fallback data
    console.log(`Generating fallback historical data for ${symbol}`)
    const fallbackData = generateFallbackData(symbol, parseInt(days))
    
    return NextResponse.json({
      data: fallbackData,
      symbol: symbol,
      fallback: true
    })
    
  } catch (error) {
    console.error("Historical data API error:", error)
    
    // Even if everything fails, return fallback data instead of error
    const symbol = new URL(request.url).searchParams.get('symbol') || 'UNKNOWN'
    const days = parseInt(new URL(request.url).searchParams.get('days') || '30')
    
    const fallbackData = generateFallbackData(symbol, days)
    return NextResponse.json({
      data: fallbackData,
      symbol: symbol,
      fallback: true
    })
  }
}
