export interface StockData {
  id?: string
  symbol: string
  name: string
  price: number
  currentPrice?: number
  buyPrice?: number
  sellPrice?: number
  quantity?: number
  change: number
  changePercent: number
  volume: number
  previousClose?: number
  marketCap?: number
  currency?: string
  status: "monitoring" | "buying" | "selling" | "owned" | "bought" | "sold"
  lastUpdated: string
  error?: string
}

export interface TradingRule {
  id: string
  symbol: string
  type: "buy" | "sell"
  condition: "price_below" | "price_above" | "percent_change"
  value: number
  isActive: boolean
  createdAt: string
}

export interface Trade {
  id: string
  symbol: string
  type: "buy" | "sell"
  quantity: number
  price: number
  total: number
  timestamp: string
  status: "completed" | "pending" | "failed"
}
