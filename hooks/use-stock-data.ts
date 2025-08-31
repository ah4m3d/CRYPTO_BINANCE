"use client"

import { useState, useEffect } from "react"
import type { StockData } from "@/types/stock"

export function useStockData() {
  const [stocks, setStocks] = useState<StockData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>(['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK'])

  const fetchStockData = async (symbols: string[] = watchlistSymbols) => {
    try {
      setIsLoading(true)
      setError(null)

      // Remove duplicates and normalize symbols
      const uniqueSymbols = [...new Set(symbols.map(s => s.trim().toUpperCase().replace('.NS', '')))]
      
      // Call the real API with symbols
      const symbolsParam = uniqueSymbols.join(',')
      const response = await fetch(`/api/stocks?symbols=${symbolsParam}`)
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      // Remove any duplicates from the response as well
      const uniqueStocks = data.reduce((acc: StockData[], stock: StockData) => {
        const exists = acc.find(s => s.symbol === stock.symbol)
        if (!exists) {
          acc.push(stock)
        }
        return acc
      }, [])

      setStocks(uniqueStocks)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch stock data")
      console.error("Stock data fetch error:", err)
      
      // Fallback to empty array or mock data
      setStocks([])
    } finally {
      setIsLoading(false)
    }
  }

  const addStock = async (symbol: string, buyPrice?: number, sellPrice?: number, quantity?: number) => {
    try {
      // Normalize symbol
      const normalizedSymbol = symbol.trim().toUpperCase().replace('.NS', '')
      
      // Check if stock already exists
      if (watchlistSymbols.includes(normalizedSymbol)) {
        throw new Error("Stock already exists in watchlist")
      }

      setIsLoading(true)
      setError(null)

      // Fetch data for the new stock
      const response = await fetch(`/api/stocks?symbols=${normalizedSymbol}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch data for ${normalizedSymbol}`)
      }

      const newStockData = await response.json()
      if (newStockData.length === 0) {
        throw new Error(`No data found for ${normalizedSymbol}`)
      }

      const stockToAdd = newStockData[0]
      
      // Update with user-provided values
      if (buyPrice) stockToAdd.buyPrice = buyPrice
      if (sellPrice) stockToAdd.sellPrice = sellPrice
      if (quantity) stockToAdd.quantity = quantity

      // Update watchlist
      const newSymbols = [...watchlistSymbols, normalizedSymbol]
      setWatchlistSymbols(newSymbols)
      
      // Add to current stocks (check for duplicates)
      setStocks(prev => {
        const exists = prev.find(s => s.symbol === stockToAdd.symbol)
        if (exists) {
          return prev.map(s => s.symbol === stockToAdd.symbol ? stockToAdd : s)
        }
        return [...prev, stockToAdd]
      })

      // Save to localStorage for persistence
      localStorage.setItem('stockWatchlist', JSON.stringify(newSymbols))

      return stockToAdd
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add stock"
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const removeStock = (symbol: string) => {
    const normalizedSymbol = symbol.trim().toUpperCase().replace('.NS', '')
    const newSymbols = watchlistSymbols.filter(s => s !== normalizedSymbol)
    setWatchlistSymbols(newSymbols)
    setStocks(prev => prev.filter(stock => stock.symbol !== normalizedSymbol))
    
    // Save to localStorage
    localStorage.setItem('stockWatchlist', JSON.stringify(newSymbols))
  }

  const refreshData = () => {
    fetchStockData(watchlistSymbols)
  }

  useEffect(() => {
    // Load watchlist from localStorage on initial load
    const savedWatchlist = localStorage.getItem('stockWatchlist')
    if (savedWatchlist) {
      try {
        const symbols = JSON.parse(savedWatchlist)
        setWatchlistSymbols(symbols)
        fetchStockData(symbols)
      } catch (error) {
        console.error("Failed to load saved watchlist:", error)
        fetchStockData()
      }
    } else {
      fetchStockData()
    }
  }, [])

  useEffect(() => {
    // Set up periodic refresh every 30 seconds
    const interval = setInterval(() => fetchStockData(watchlistSymbols), 30000)
    return () => clearInterval(interval)
  }, [watchlistSymbols])

  return {
    stocks,
    isLoading,
    error,
    refreshData,
    addStock,
    removeStock,
  }
}
