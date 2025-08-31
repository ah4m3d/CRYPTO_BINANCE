// Technical Analysis Utilities for Stock Trading
// VWAP (Volume Weighted Average Price) and RSI (Relative Strength Index)

export interface TechnicalData {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface TechnicalIndicators {
  vwap: number
  rsi: number
  buyPrice: number
  sellPrice: number
  signal: 'BUY' | 'SELL' | 'HOLD'
  confidence: number
  timeframe: string
  lastUpdated: string
}

export interface TimeframeOption {
  label: string
  value: string
  interval: string
  period: string
  refreshRate: number // in seconds
}

/**
 * Get timeframe multiplier for volatility adjustment
 * Shorter timeframes have higher volatility multipliers
 */
function getTimeframeMultiplier(timeframe: string): number {
  const lowerTimeframe = timeframe.toLowerCase()
  
  // Shorter timeframes = higher volatility multiplier
  if (lowerTimeframe.includes('3s')) return 2.0
  if (lowerTimeframe.includes('5s')) return 1.8
  if (lowerTimeframe.includes('10s')) return 1.6
  if (lowerTimeframe.includes('30s')) return 1.4
  if (lowerTimeframe.includes('1m')) return 1.2
  if (lowerTimeframe.includes('5m')) return 1.0
  if (lowerTimeframe.includes('15m')) return 0.8
  if (lowerTimeframe.includes('30m')) return 0.6
  if (lowerTimeframe.includes('1h')) return 0.4
  if (lowerTimeframe.includes('4h')) return 0.3
  if (lowerTimeframe.includes('1d')) return 0.2
  if (lowerTimeframe.includes('1w')) return 0.1
  if (lowerTimeframe.includes('1m')) return 0.05 // Monthly
  
  return 1.0 // Default
}

/**
 * Calculate VWAP (Volume Weighted Average Price)
 * VWAP = Σ(Price × Volume) / Σ(Volume)
 */
export function calculateVWAP(data: TechnicalData[]): number {
  if (data.length === 0) return 0

  let totalVolumePrice = 0
  let totalVolume = 0

  data.forEach(point => {
    const typicalPrice = (point.high + point.low + point.close) / 3
    const volumePrice = typicalPrice * point.volume
    
    totalVolumePrice += volumePrice
    totalVolume += point.volume
  })

  return totalVolume > 0 ? totalVolumePrice / totalVolume : 0
}

/**
 * Calculate RSI (Relative Strength Index)
 * RSI = 100 - (100 / (1 + RS))
 * RS = Average Gain / Average Loss
 */
export function calculateRSI(data: TechnicalData[], period: number = 14): number {
  if (data.length < period + 1) return 50 // Default neutral RSI

  const changes: number[] = []
  
  // Calculate price changes
  for (let i = 1; i < data.length; i++) {
    changes.push(data[i].close - data[i - 1].close)
  }

  // Take only the most recent period
  const recentChanges = changes.slice(-period)
  
  const gains = recentChanges.filter(change => change > 0)
  const losses = recentChanges.filter(change => change < 0).map(loss => Math.abs(loss))

  const averageGain = gains.length > 0 ? gains.reduce((sum, gain) => sum + gain, 0) / period : 0
  const averageLoss = losses.length > 0 ? losses.reduce((sum, loss) => sum + loss, 0) / period : 0

  if (averageLoss === 0) return 100 // No losses, maximum RSI
  
  const rs = averageGain / averageLoss
  const rsi = 100 - (100 / (1 + rs))

  return rsi
}

/**
 * Calculate Support and Resistance levels
 */
export function calculateSupportResistance(data: TechnicalData[]): { support: number, resistance: number } {
  if (data.length === 0) return { support: 0, resistance: 0 }

  const prices = data.map(d => d.close)
  const highs = data.map(d => d.high)
  const lows = data.map(d => d.low)

  // Simple support/resistance calculation
  const support = Math.min(...lows)
  const resistance = Math.max(...highs)

  return { support, resistance }
}

// Available timeframes for analysis
export const TIMEFRAMES: TimeframeOption[] = [
  {
    label: '3s',
    value: '3s',
    interval: '1m',
    period: '1d',
    refreshRate: 3
  },
  {
    label: '5s',
    value: '5s',
    interval: '1m',
    period: '1d',
    refreshRate: 5
  },
  {
    label: '10s',
    value: '10s',
    interval: '1m',
    period: '1d',
    refreshRate: 10
  },
  {
    label: '30s',
    value: '30s',
    interval: '1m',
    period: '1d',
    refreshRate: 30
  },
  {
    label: '1m',
    value: '1m',
    interval: '1m',
    period: '1d',
    refreshRate: 60
  },
  {
    label: '5m',
    value: '5m',
    interval: '5m',
    period: '1d',
    refreshRate: 300
  },
  {
    label: '15m',
    value: '15m',
    interval: '15m',
    period: '1d',
    refreshRate: 900
  },
  {
    label: '1H',
    value: '1h',
    interval: '1h',
    period: '5d',
    refreshRate: 3600
  },
  {
    label: '4H',
    value: '4h',
    interval: '1h',
    period: '10d',
    refreshRate: 14400
  },
  {
    label: '1D',
    value: '1d',
    interval: '1d',
    period: '30d',
    refreshRate: 86400
  },
  {
    label: '1W',
    value: '1w',
    interval: '1d',
    period: '3mo',
    refreshRate: 604800
  },
  {
    label: '1M',
    value: '1mo',
    interval: '1d',
    period: '6mo',
    refreshRate: 2592000
  }
]

/**
 * Generate trading signals based on VWAP and RSI
 */
export function generateTradingSignals(data: TechnicalData[], timeframe: string = '1D'): TechnicalIndicators {
  if (data.length < 2) {
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

  const vwap = calculateVWAP(data)
  const rsi = calculateRSI(data)
  const currentPrice = data[data.length - 1].close

  // Calculate support and resistance levels
  const { support, resistance } = calculateSupportResistance(data)
  
  // Generate trading signals based on VWAP and RSI
  let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD'
  let confidence = 40 // Base confidence
  
  // RSI-based signals
  const isOversold = rsi < 30
  const isOverbought = rsi > 70
  const isNeutral = rsi >= 40 && rsi <= 60
  
  // VWAP-based signals
  const isPriceAboveVWAP = currentPrice > vwap
  const isPriceBelowVWAP = currentPrice < vwap
  const vwapDeviation = Math.abs(currentPrice - vwap) / vwap
  
  // Enhanced signal generation with dynamic confidence
  if (isOversold && isPriceBelowVWAP) {
    signal = 'BUY'
    // Strong buy signal: oversold + below VWAP
    const oversoldIntensity = Math.max(0, 30 - rsi) // 0-30 scale
    const vwapDeviationBonus = Math.min(20, vwapDeviation * 150) // Max 20 bonus
    confidence = 70 + oversoldIntensity * 0.8 + vwapDeviationBonus
  } else if (isOverbought && isPriceAboveVWAP) {
    signal = 'SELL'
    // Strong sell signal: overbought + above VWAP
    const overboughtIntensity = Math.max(0, rsi - 70) // 0-30 scale
    const vwapDeviationBonus = Math.min(20, vwapDeviation * 150) // Max 20 bonus
    confidence = 70 + overboughtIntensity * 0.8 + vwapDeviationBonus
  } else if (isPriceBelowVWAP && rsi < 45) {
    signal = 'BUY'
    // Moderate buy signal: below VWAP + weak RSI
    const rsiStrength = (45 - rsi) / 15 * 100 // Normalize to 0-100
    const vwapDeviation = (vwap - currentPrice) / vwap * 100
    confidence = 50 + rsiStrength * 0.3 + Math.min(15, vwapDeviation * 2)
  } else if (isPriceAboveVWAP && rsi > 55) {
    signal = 'SELL'
    // Moderate sell signal: above VWAP + strong RSI
    const rsiStrength = (rsi - 55) / 15 * 100 // Normalize to 0-100
    const vwapDeviation = (currentPrice - vwap) / vwap * 100
    confidence = 50 + rsiStrength * 0.3 + Math.min(15, vwapDeviation * 2)
  } else if (isNeutral && Math.abs(vwapDeviation) < 0.02) {
    signal = 'HOLD'
    // Strong hold signal: neutral RSI + close to VWAP
    confidence = 60 + (60 - Math.abs(rsi - 50)) * 0.5 // Higher confidence closer to RSI 50
  } else {
    signal = 'HOLD'
    // Default hold with variable confidence based on neutrality
    const rsiNeutrality = Math.max(0, 20 - Math.abs(rsi - 50)) // 0-20 scale
    const vwapNeutrality = Math.max(0, 10 - vwapDeviation * 500) // 0-10 scale
    confidence = 45 + rsiNeutrality + vwapNeutrality
  }
  
  // Clamp confidence between 40 and 85
  confidence = Math.min(85, Math.max(40, confidence))
  
  // Calculate dynamic buy and sell prices based on RSI and VWAP with timeframe sensitivity
  const timeframeMultiplier = getTimeframeMultiplier(timeframe)
  const volatilityFactor = Math.abs(currentPrice - vwap) / vwap
  
  // Base price adjustments around VWAP with RSI influence
  let buyPriceAdjustment = 0.02 // 2% default
  let sellPriceAdjustment = 0.02 // 2% default
  
  // RSI-based dynamic adjustments
  if (isOversold) {
    // Strong buy signal - more aggressive buy price, conservative sell price
    buyPriceAdjustment = 0.015 + (volatilityFactor * 0.5) // 1.5% + volatility
    sellPriceAdjustment = 0.03 + (30 - rsi) * 0.001 // 3% + oversold intensity
  } else if (isOverbought) {
    // Strong sell signal - conservative buy price, more aggressive sell price
    buyPriceAdjustment = 0.03 + (rsi - 70) * 0.001 // 3% + overbought intensity
    sellPriceAdjustment = 0.015 + (volatilityFactor * 0.5) // 1.5% + volatility
  } else {
    // Neutral RSI - adjust based on VWAP deviation
    const vwapDeviationFactor = Math.abs(currentPrice - vwap) / vwap
    buyPriceAdjustment = 0.02 + vwapDeviationFactor * 0.5
    sellPriceAdjustment = 0.02 + vwapDeviationFactor * 0.5
  }
  
  // Apply timeframe multiplier for short-term vs long-term strategies
  buyPriceAdjustment *= timeframeMultiplier
  sellPriceAdjustment *= timeframeMultiplier
  
  // Calculate prices using VWAP as anchor point
  let buyPrice = vwap * (1 - buyPriceAdjustment)
  let sellPrice = vwap * (1 + sellPriceAdjustment)
  
  // Additional RSI-based fine-tuning
  if (isOversold) {
    // For oversold conditions, buy closer to current price, sell higher
    buyPrice = Math.min(buyPrice, currentPrice * 0.995) // Max 0.5% below current
    sellPrice = Math.max(sellPrice, currentPrice * 1.04) // Min 4% above current
  } else if (isOverbought) {
    // For overbought conditions, buy lower, sell closer to current price
    buyPrice = Math.min(buyPrice, currentPrice * 0.96) // Max 4% below current
    sellPrice = Math.max(sellPrice, currentPrice * 1.005) // Min 0.5% above current
  }
  
  // Support/Resistance considerations
  if (support > 0) {
    buyPrice = Math.max(buyPrice, support * 1.002) // Stay slightly above support
  }
  if (resistance > 0) {
    sellPrice = Math.min(sellPrice, resistance * 0.998) // Stay slightly below resistance
  }
  
  // Final safety bounds (wider range for volatile markets)
  const maxBuyDiscount = isOversold ? 0.08 : 0.05 // 8% for oversold, 5% otherwise
  const maxSellPremium = isOverbought ? 0.08 : 0.05 // 8% for overbought, 5% otherwise
  
  buyPrice = Math.max(buyPrice, currentPrice * (1 - maxBuyDiscount))
  sellPrice = Math.min(sellPrice, currentPrice * (1 + maxSellPremium))
  
  return {
    vwap: Number(vwap.toFixed(2)),
    rsi: Number(rsi.toFixed(2)),
    buyPrice: Number(buyPrice.toFixed(2)),
    sellPrice: Number(sellPrice.toFixed(2)),
    signal,
    confidence: Number(confidence.toFixed(0)),
    timeframe,
    lastUpdated: new Date().toISOString()
  }
}

/**
 * Format technical analysis data for display
 */
export function formatTechnicalAnalysis(indicators: TechnicalIndicators): string {
  const { vwap, rsi, buyPrice, sellPrice, signal, confidence } = indicators
  
  return `
📊 Technical Analysis:
• VWAP: ₹${vwap}
• RSI: ${rsi} ${rsi < 30 ? '(Oversold)' : rsi > 70 ? '(Overbought)' : '(Neutral)'}
• Signal: ${signal} (${confidence}% confidence)
• Buy Target: ₹${buyPrice}
• Sell Target: ₹${sellPrice}
  `.trim()
}
