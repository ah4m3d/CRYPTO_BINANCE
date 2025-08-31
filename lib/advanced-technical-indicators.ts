// Advanced Technical Indicators Module
// RSI, VWAP, Moving Averages (50 & 200), and comprehensive analysis

export interface TechnicalData {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  timestamp?: number
}

export interface AdvancedTechnicalIndicators {
  rsi: number
  vwap: number
  ma50: number
  ma200: number
  ema50: number
  ema200: number
  volume: number
  avgVolume: number
  signal: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL'
  confidence: number
  analysis: {
    rsiSignal: 'OVERSOLD' | 'OVERBOUGHT' | 'NEUTRAL' | 'STRENGTH' | 'WEAKNESS'
    vwapSignal: 'ABOVE' | 'BELOW' | 'AT_LEVEL'
    maSignal: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
    emaSignal: 'BULLISH_CROSS' | 'BEARISH_CROSS' | 'PULLBACK_LONG' | 'PULLBACK_SHORT' | 'NEUTRAL'
    volumeSignal: 'HIGH' | 'NORMAL' | 'LOW'
    trendDirection: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS'
    scalpingSetup: 'LONG_ENTRY' | 'SHORT_ENTRY' | 'PULLBACK_LONG' | 'PULLBACK_SHORT' | 'NO_SETUP'
    swingLevels: {
      lastSwingHigh: number
      lastSwingLow: number
    }
  }
  priceTargets: {
    buyPrice: number
    sellPrice: number
    stopLoss: number
    takeProfit: number
    riskRewardRatio: number
  }
  timeframe: string
  lastUpdated: string
}

export interface MovingAverageData {
  ma50: number
  ma200: number
  ema50: number
  ema200: number
  goldenCross: boolean // EMA50 crosses above EMA200
  deathCross: boolean  // EMA50 crosses below EMA200
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  pullbackToEMA50: boolean // Price near EMA50 for entry
}

/**
 * Calculate Simple Moving Average (SMA)
 */
export function calculateSMA(data: number[], period: number): number {
  if (data.length < period) return 0
  
  const slice = data.slice(-period)
  const sum = slice.reduce((acc, price) => acc + price, 0)
  return sum / period
}

/**
 * Calculate Exponential Moving Average (EMA)
 */
export function calculateEMA(data: number[], period: number): number {
  if (data.length === 0) return 0
  if (data.length === 1) return data[0]
  
  const multiplier = 2 / (period + 1)
  let ema = data[0]
  
  for (let i = 1; i < data.length; i++) {
    ema = (data[i] * multiplier) + (ema * (1 - multiplier))
  }
  
  return ema
}

/**
 * Calculate swing levels for stop loss placement
 */
export function calculateSwingLevels(data: TechnicalData[]): { lastSwingHigh: number; lastSwingLow: number } {
  if (data.length < 10) return { lastSwingHigh: 0, lastSwingLow: 0 }
  
  const lookback = Math.min(20, data.length) // Look back 20 periods max
  const recentData = data.slice(-lookback)
  
  let swingHigh = recentData[0].high
  let swingLow = recentData[0].low
  
  // Find swing high and low in recent data
  for (let i = 1; i < recentData.length - 1; i++) {
    const current = recentData[i]
    const prev = recentData[i - 1]
    const next = recentData[i + 1]
    
    // Swing high: higher than previous and next
    if (current.high > prev.high && current.high > next.high && current.high > swingHigh) {
      swingHigh = current.high
    }
    
    // Swing low: lower than previous and next
    if (current.low < prev.low && current.low < next.low && current.low < swingLow) {
      swingLow = current.low
    }
  }
  
  return {
    lastSwingHigh: Number(swingHigh.toFixed(2)),
    lastSwingLow: Number(swingLow.toFixed(2))
  }
}

/**
 * Calculate RSI (Relative Strength Index)
 */
export function calculateAdvancedRSI(data: TechnicalData[], period: number = 14): number {
  if (data.length < period + 1) return 50 // Default neutral RSI
  
  const prices = data.map(d => d.close)
  const gains: number[] = []
  const losses: number[] = []
  
  // Calculate price changes
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1]
    gains.push(change > 0 ? change : 0)
    losses.push(change < 0 ? Math.abs(change) : 0)
  }
  
  // Calculate average gains and losses
  const avgGain = gains.slice(-period).reduce((sum, gain) => sum + gain, 0) / period
  const avgLoss = losses.slice(-period).reduce((sum, loss) => sum + loss, 0) / period
  
  if (avgLoss === 0) return 100 // All gains, maximum RSI
  
  const rs = avgGain / avgLoss
  return 100 - (100 / (1 + rs))
}

/**
 * Calculate VWAP (Volume Weighted Average Price)
 */
export function calculateAdvancedVWAP(data: TechnicalData[]): number {
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
 * Calculate Moving Averages (50 & 200) with cross analysis
 */
export function calculateMovingAverages(data: TechnicalData[]): MovingAverageData {
  const closePrices = data.map(d => d.close)
  
  const ma50 = calculateSMA(closePrices, 50)
  const ma200 = calculateSMA(closePrices, 200)
  const ema50 = calculateEMA(closePrices, 50)
  const ema200 = calculateEMA(closePrices, 200)
  
  // Check for golden cross and death cross (EMA 50/200)
  let goldenCross = false
  let deathCross = false
  let pullbackToEMA50 = false
  
  if (data.length >= 201) { // Need at least 201 data points for reliable cross detection
    const prevClosePrices = closePrices.slice(0, -1)
    const prevEMA50 = calculateEMA(prevClosePrices, 50)
    const prevEMA200 = calculateEMA(prevClosePrices, 200)
    
    // Golden Cross: EMA50 crosses above EMA200
    goldenCross = prevEMA50 <= prevEMA200 && ema50 > ema200
    
    // Death Cross: EMA50 crosses below EMA200
    deathCross = prevEMA50 >= prevEMA200 && ema50 < ema200
    
    // Check if price is near EMA50 (within 0.5% for pullback entry)
    const currentPrice = data[data.length - 1].close
    const ema50Distance = Math.abs(currentPrice - ema50) / currentPrice
    pullbackToEMA50 = ema50Distance <= 0.005 // Within 0.5%
  }
  
  // Determine trend based on EMA 50/200
  let trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL'
  if (ema50 > ema200) {
    trend = 'BULLISH'
  } else if (ema50 < ema200) {
    trend = 'BEARISH'
  }
  
  return {
    ma50: Number(ma50.toFixed(2)),
    ma200: Number(ma200.toFixed(2)),
    ema50: Number(ema50.toFixed(2)),
    ema200: Number(ema200.toFixed(2)),
    goldenCross,
    deathCross,
    pullbackToEMA50,
    trend
  }
}

/**
 * Generate comprehensive technical analysis signals
 */
export function generateAdvancedTechnicalSignals(
  data: TechnicalData[], 
  timeframe: string = '5m'
): AdvancedTechnicalIndicators {
  if (data.length === 0) {
    throw new Error('No data provided for technical analysis')
  }
  
  const currentPrice = data[data.length - 1].close
  const currentVolume = data[data.length - 1].volume
  const rsi = calculateAdvancedRSI(data)
  const vwap = calculateAdvancedVWAP(data)
  const maData = calculateMovingAverages(data)
  
  // Calculate EMA 50 and EMA 200 for crypto scalping strategy
  const closePrices = data.map(d => d.close)
  const ema50 = calculateEMA(closePrices, 50)
  const ema200 = calculateEMA(closePrices, 200)
  
  // Calculate average volume (20-period)
  const volumes = data.slice(-20).map(d => d.volume)
  const avgVolume = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length
  
  // Calculate swing levels for stop loss placement
  const swingLevels = calculateSwingLevels(data)
  
  // RSI Analysis for crypto scalping (more flexible zones)
  let rsiSignal: 'OVERSOLD' | 'OVERBOUGHT' | 'NEUTRAL' | 'STRENGTH' | 'WEAKNESS' = 'NEUTRAL'
  if (rsi < 30) rsiSignal = 'OVERSOLD'
  else if (rsi > 70) rsiSignal = 'OVERBOUGHT'
  else if (rsi >= 25 && rsi <= 55) rsiSignal = 'STRENGTH' // Expanded for long entries (was 30-50)
  else if (rsi >= 45 && rsi <= 75) rsiSignal = 'WEAKNESS' // Expanded for short entries (was 50-70)
  
  // VWAP Analysis
  let vwapSignal: 'ABOVE' | 'BELOW' | 'AT_LEVEL' = 'AT_LEVEL'
  const vwapDeviation = Math.abs(currentPrice - vwap) / vwap
  if (vwapDeviation > 0.005) { // 0.5% threshold
    vwapSignal = currentPrice > vwap ? 'ABOVE' : 'BELOW'
  }
  
  // Moving Average Analysis
  const maSignal = maData.trend === 'BULLISH' ? 'BULLISH' : 
                   maData.trend === 'BEARISH' ? 'BEARISH' : 'NEUTRAL'
  
  // Trend Direction Analysis based on EMA 50/200
  let trendDirection: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS' = 'SIDEWAYS'
  const priceAboveEMA50 = currentPrice > ema50
  const priceAboveEMA200 = currentPrice > ema200
  const ema50AboveEMA200 = ema50 > ema200
  
  if (priceAboveEMA50 && priceAboveEMA200 && ema50AboveEMA200) {
    trendDirection = 'UPTREND'
  } else if (!priceAboveEMA50 && !priceAboveEMA200 && !ema50AboveEMA200) {
    trendDirection = 'DOWNTREND'
  }
  
  // EMA Analysis for Crypto Scalping (50/200 crossover strategy)
  let emaSignal: 'BULLISH_CROSS' | 'BEARISH_CROSS' | 'PULLBACK_LONG' | 'PULLBACK_SHORT' | 'NEUTRAL' = 'NEUTRAL'
  
  if (data.length >= 201) {
    // Check for EMA 50/200 crossovers
    if (maData.goldenCross) {
      emaSignal = 'BULLISH_CROSS' // EMA 50 crosses above EMA 200
    } else if (maData.deathCross) {
      emaSignal = 'BEARISH_CROSS' // EMA 50 crosses below EMA 200
    }
    // Check for pullback opportunities near EMA 50
    else if (maData.pullbackToEMA50 && ema50 > ema200) {
      emaSignal = 'PULLBACK_LONG' // Price near EMA 50 in uptrend
    } else if (maData.pullbackToEMA50 && ema50 < ema200) {
      emaSignal = 'PULLBACK_SHORT' // Price near EMA 50 in downtrend
    }
  }
  
  // Volume Analysis (even more flexible for low-volume periods)
  let volumeSignal: 'HIGH' | 'NORMAL' | 'LOW' = 'NORMAL'
  const volumeRatio = currentVolume / avgVolume
  // Further relaxed for Asian hours (was 1.2/0.6, now 1.0/0.4)
  if (volumeRatio > 1.0) volumeSignal = 'HIGH'
  else if (volumeRatio < 0.4) volumeSignal = 'LOW'
  
  // Crypto Scalping Setup Detection
  let scalpingSetup: 'LONG_ENTRY' | 'SHORT_ENTRY' | 'PULLBACK_LONG' | 'PULLBACK_SHORT' | 'NO_SETUP' = 'NO_SETUP'
  
  // Strong Bullish Setup: EMA 50 crosses above EMA 200, RSI 25-55, good volume
  if (emaSignal === 'BULLISH_CROSS' && 
      rsiSignal === 'STRENGTH' && 
      volumeSignal !== 'LOW') { // Changed from HIGH to not LOW
    scalpingSetup = 'LONG_ENTRY'
  }
  
  // Strong Bearish Setup: EMA 50 crosses below EMA 200, RSI 45-75, good volume
  else if (emaSignal === 'BEARISH_CROSS' && 
      rsiSignal === 'WEAKNESS' && 
      volumeSignal !== 'LOW') { // Changed from HIGH to not LOW
    scalpingSetup = 'SHORT_ENTRY'
  }
  
  // Pullback Long Entry: Price near EMA 50 in uptrend, RSI showing strength
  else if (emaSignal === 'PULLBACK_LONG' && 
      rsiSignal === 'STRENGTH' &&
      trendDirection === 'UPTREND') {
    scalpingSetup = 'PULLBACK_LONG'
  }
  
  // Pullback Short Entry: Price near EMA 50 in downtrend, RSI showing weakness
  else if (emaSignal === 'PULLBACK_SHORT' && 
      rsiSignal === 'WEAKNESS' &&
      trendDirection === 'DOWNTREND') {
    scalpingSetup = 'PULLBACK_SHORT'
  }
  
  // Generate overall signal (prioritize crypto scalping setups)
  let signal: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL' = 'HOLD'
  let confidence = 50
  
  // High Priority: EMA Crossover Setups
  if (scalpingSetup === 'LONG_ENTRY') {
    signal = 'STRONG_BUY'
    confidence = 80 + Math.min(10, volumeRatio * 5) // 80-90% confidence
  } else if (scalpingSetup === 'SHORT_ENTRY') {
    signal = 'STRONG_SELL'
    confidence = 80 + Math.min(10, volumeRatio * 5) // 80-90% confidence
  }
  // Medium Priority: Pullback Entries
  else if (scalpingSetup === 'PULLBACK_LONG') {
    signal = 'BUY'
    confidence = 70 + Math.min(10, volumeRatio * 3) // 70-80% confidence
  } else if (scalpingSetup === 'PULLBACK_SHORT') {
    signal = 'SELL'
    confidence = 70 + Math.min(10, volumeRatio * 3) // 70-80% confidence
  }
  // Lower Priority: RSI Momentum Trades (new - for more opportunities)
  else if (rsiSignal === 'STRENGTH' && 
           trendDirection === 'UPTREND' && 
           vwapSignal === 'ABOVE') {
    signal = 'BUY'
    confidence = 55 + Math.min(15, volumeRatio * 5) // 55-70% confidence (lowered from 60)
  }
  else if (rsiSignal === 'WEAKNESS' && 
           trendDirection === 'DOWNTREND' && 
           vwapSignal === 'BELOW') {
    signal = 'SELL'
    confidence = 55 + Math.min(15, volumeRatio * 5) // 55-70% confidence (lowered from 60)
  }
  // Even Lower Priority: Simple Trend Following (new for Asian hours)
  else if (rsiSignal === 'STRENGTH' && 
           ema50 > ema200 && 
           currentPrice > ema50) {
    signal = 'BUY'
    confidence = 50 + Math.min(10, volumeRatio * 3) // 50-60% confidence
  }
  else if (rsiSignal === 'WEAKNESS' && 
           ema50 < ema200 && 
           currentPrice < ema50) {
    signal = 'SELL'
    confidence = 50 + Math.min(10, volumeRatio * 3) // 50-60% confidence
  }
  // Momentum Plays for Strong Movers (new - for high % gainers/losers)
  else if (rsi > 70 && volumeRatio > 1.5) {
    signal = 'SELL' // Overbought with high volume
    confidence = 60 + Math.min(10, (rsi - 70) * 0.3)
  }
  else if (rsi < 30 && volumeRatio > 1.0) {
    signal = 'BUY' // Oversold bounce potential
    confidence = 60 + Math.min(10, (30 - rsi) * 0.3)
  }
  // Basic EMA Trend Following (lowest priority, but generates signals)
  else if (currentPrice > ema50 && ema50 > ema200 && rsi >= 45 && rsi <= 60) {
    signal = 'BUY'
    confidence = 45 + Math.min(10, volumeRatio * 2) // 45-55% confidence
  }
  else if (currentPrice < ema50 && ema50 < ema200 && rsi >= 40 && rsi <= 55) {
    signal = 'SELL'
    confidence = 45 + Math.min(10, volumeRatio * 2) // 45-55% confidence
  }
  // Traditional RSI Setups (Lower Priority)
  else if (rsiSignal === 'OVERSOLD' && vwapSignal === 'BELOW' && maData.goldenCross) {
    signal = 'STRONG_BUY'
    confidence = 70 + Math.min(10, (30 - rsi) * 0.5) // Lowered from 75
  }
  // Strong Sell Conditions (traditional)
  else if (rsiSignal === 'OVERBOUGHT' && vwapSignal === 'ABOVE' && maData.deathCross) {
    signal = 'STRONG_SELL'
    confidence = 70 + Math.min(10, (rsi - 70) * 0.5) // Lowered from 75
  }
  // Buy Conditions
  else if ((rsiSignal === 'OVERSOLD' && vwapSignal === 'BELOW') || 
           (trendDirection === 'UPTREND' && rsi < 50) ||
           (emaSignal === 'BULLISH_CROSS' && volumeSignal === 'HIGH')) {
    signal = 'BUY'
    confidence = 65 + Math.min(15, vwapDeviation * 300)
  }
  // Sell Conditions
  else if ((rsiSignal === 'OVERBOUGHT' && vwapSignal === 'ABOVE') || 
           (trendDirection === 'DOWNTREND' && rsi > 50) ||
           (emaSignal === 'BEARISH_CROSS' && volumeSignal === 'HIGH')) {
    signal = 'SELL'
    confidence = 65 + Math.min(15, vwapDeviation * 300)
  }
  
  // FINAL TIER: Ultra-aggressive catch-all (generate signals no matter what)
  if (signal === 'HOLD' && confidence <= 50) {
    // Any market activity with reasonable parameters gets a signal
    if (rsi >= 30 && rsi <= 70 && volumeRatio >= 0.5) {
      // Use simple price momentum vs VWAP for direction
      if (currentPrice > vwap * 1.001) { // Even 0.1% above VWAP
        signal = 'BUY'
        confidence = Math.max(35, 35 + (volumeRatio * 5))
      } else if (currentPrice < vwap * 0.999) { // Even 0.1% below VWAP
        signal = 'SELL'
        confidence = Math.max(35, 35 + (volumeRatio * 5))
      }
      // Final fallback: use RSI bias
      else if (rsi <= 50) {
        signal = 'BUY'
        confidence = 30 + Math.min(15, volumeRatio * 10)
      } else {
        signal = 'SELL'
        confidence = 30 + Math.min(15, volumeRatio * 10)
      }
    }
  }
  
  // Calculate price targets with swing-based stop loss
  const volatility = calculateVolatility(data)
  const priceTargets = calculatePriceTargets(
    currentPrice, vwap, rsi, maData, volatility, signal, swingLevels
  )
  
  return {
    rsi: Number(rsi.toFixed(2)),
    vwap: Number(vwap.toFixed(2)),
    ma50: maData.ma50,
    ma200: maData.ma200,
    ema50: maData.ema50,
    ema200: maData.ema200,
    volume: currentVolume,
    avgVolume: Number(avgVolume.toFixed(0)),
    signal,
    confidence: Math.min(95, Math.max(40, Math.round(confidence))),
    analysis: {
      rsiSignal,
      vwapSignal,
      maSignal,
      emaSignal,
      volumeSignal,
      trendDirection,
      scalpingSetup,
      swingLevels
    },
    priceTargets,
    timeframe,
    lastUpdated: new Date().toISOString()
  }
}

/**
 * Calculate price volatility
 */
function calculateVolatility(data: TechnicalData[]): number {
  if (data.length < 20) return 0.02 // Default 2% volatility
  
  const prices = data.slice(-20).map(d => d.close)
  const returns = []
  
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1])
  }
  
  const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length
  
  return Math.sqrt(variance) * Math.sqrt(252) // Annualized volatility
}

/**
 * Calculate dynamic price targets
 */
function calculatePriceTargets(
  currentPrice: number,
  vwap: number,
  rsi: number,
  maData: MovingAverageData,
  volatility: number,
  signal: string,
  swingLevels: { lastSwingHigh: number; lastSwingLow: number }
): {
  buyPrice: number
  sellPrice: number
  stopLoss: number
  takeProfit: number
  riskRewardRatio: number
} {
  const volAdjustment = Math.max(0.01, Math.min(0.05, volatility))
  
  let buyPrice = currentPrice
  let sellPrice = currentPrice
  let stopLoss = currentPrice
  let takeProfit = currentPrice
  let riskRewardRatio = 1.5 // Default 1.5:1 risk/reward
  
  switch (signal) {
    case 'STRONG_BUY':
      // Crypto scalping targets with swing-based stop loss
      buyPrice = Math.min(currentPrice * 0.999, vwap * 0.998)
      // Stop loss: 0.5-1% below swing low
      stopLoss = Math.min(
        swingLevels.lastSwingLow * 0.995, // 0.5% below swing low
        currentPrice * 0.99 // Max 1% stop loss
      )
      // Take profit: 1.5x-2x risk for scalping
      const risk = currentPrice - stopLoss
      takeProfit = currentPrice + (risk * 2) // 2:1 risk/reward
      sellPrice = currentPrice * 1.015 // 1.5% take profit
      riskRewardRatio = 2.0
      break
      
    case 'BUY':
      buyPrice = Math.min(currentPrice * 0.9995, vwap * 0.999)
      // Stop loss based on swing low
      stopLoss = Math.min(
        swingLevels.lastSwingLow * 0.9975, // 0.25% below swing low
        currentPrice * 0.995 // Max 0.5% stop loss
      )
      const buyRisk = currentPrice - stopLoss
      takeProfit = currentPrice + (buyRisk * 1.5) // 1.5:1 risk/reward
      sellPrice = currentPrice * 1.01 // 1% take profit
      riskRewardRatio = 1.5
      break
      
    case 'SELL':
      buyPrice = currentPrice * 0.985 // 1.5% below for covering
      sellPrice = Math.max(currentPrice * 1.0005, vwap * 1.001)
      // Stop loss: 0.5% above swing high for shorts
      stopLoss = Math.max(
        swingLevels.lastSwingHigh * 1.005, // 0.5% above swing high
        currentPrice * 1.005 // Max 0.5% stop loss
      )
      const sellRisk = stopLoss - currentPrice
      takeProfit = currentPrice - (sellRisk * 1.5) // 1.5:1 risk/reward for shorts
      riskRewardRatio = 1.5
      break
      
    case 'STRONG_SELL':
      // Crypto scalping short targets with swing-based stop loss
      buyPrice = currentPrice * 0.98 // 2% below for covering
      sellPrice = Math.max(currentPrice * 1.001, vwap * 1.002)
      // Stop loss: 0.5-1% above swing high
      stopLoss = Math.max(
        swingLevels.lastSwingHigh * 1.005, // 0.5% above swing high
        currentPrice * 1.01 // Max 1% stop loss
      )
      const strongSellRisk = stopLoss - currentPrice
      takeProfit = currentPrice - (strongSellRisk * 2) // 2:1 risk/reward
      riskRewardRatio = 2.0
      break
      
    default: // HOLD
      buyPrice = currentPrice * 0.999
      sellPrice = currentPrice * 1.001
      stopLoss = currentPrice * 0.9975
      takeProfit = currentPrice * 1.0025
  }
  
  return {
    buyPrice: Number(buyPrice.toFixed(2)),
    sellPrice: Number(sellPrice.toFixed(2)),
    stopLoss: Number(stopLoss.toFixed(2)),
    takeProfit: Number(takeProfit.toFixed(2)),
    riskRewardRatio: Number(riskRewardRatio.toFixed(1))
  }
}

/**
 * Format advanced technical analysis for display
 */
export function formatAdvancedTechnicalAnalysis(indicators: AdvancedTechnicalIndicators): string {
  const { rsi, vwap, ma50, ma200, ema50, ema200, volume, avgVolume, signal, confidence, analysis, priceTargets } = indicators
  
  return `
📈 Scalping Technical Analysis (EMA + RSI + Volume):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔥 Crypto Scalping Strategy (EMA 50/200 + RSI):
• EMA 50: $${ema50} ${analysis.emaSignal === 'BULLISH_CROSS' ? '📈 Golden Cross' : 
                    analysis.emaSignal === 'BEARISH_CROSS' ? '📉 Death Cross' : 
                    analysis.emaSignal === 'PULLBACK_LONG' ? '🎯 Pullback Long' :
                    analysis.emaSignal === 'PULLBACK_SHORT' ? '🎯 Pullback Short' : '➡️ Neutral'}
• EMA 200: $${ema200}
• RSI (14): ${rsi} ${analysis.rsiSignal === 'OVERSOLD' ? '🔴 Oversold' : 
              analysis.rsiSignal === 'OVERBOUGHT' ? '🟠 Overbought' : 
              analysis.rsiSignal === 'STRENGTH' ? '� Strength (30-50)' :
              analysis.rsiSignal === 'WEAKNESS' ? '⚠️ Weakness (50-70)' : '�🟡 Neutral'}
• Volume: ${volume.toLocaleString()} ${analysis.volumeSignal === 'HIGH' ? '🔥 High' : 
                                      analysis.volumeSignal === 'LOW' ? '❄️ Low' : '📊 Normal'}
• Avg Volume: ${avgVolume.toLocaleString()}

🎯 Crypto Scalping Setup: ${analysis.scalpingSetup === 'LONG_ENTRY' ? '🟢 LONG ENTRY (EMA Cross)' : 
                          analysis.scalpingSetup === 'SHORT_ENTRY' ? '🔴 SHORT ENTRY (EMA Cross)' : 
                          analysis.scalpingSetup === 'PULLBACK_LONG' ? '🎯 PULLBACK LONG' :
                          analysis.scalpingSetup === 'PULLBACK_SHORT' ? '🎯 PULLBACK SHORT' : '⚪ NO SETUP'}

📊 Supporting Indicators:
• VWAP: $${vwap} ${analysis.vwapSignal === 'ABOVE' ? '⬆️ Above' : 
                   analysis.vwapSignal === 'BELOW' ? '⬇️ Below' : '➡️ At Level'}
• MA50: $${ma50} | MA200: $${ma200}
• Swing High: $${analysis.swingLevels.lastSwingHigh} | Swing Low: $${analysis.swingLevels.lastSwingLow}

🎯 Trading Signal: ${signal} (${confidence}% confidence)
📊 Trend: ${analysis.trendDirection} | MA: ${analysis.maSignal}

💰 Crypto Scalping Targets (${priceTargets.riskRewardRatio}:1 R/R):
• Entry: $${priceTargets.buyPrice}
• Take Profit: $${priceTargets.takeProfit}
• Stop Loss: $${priceTargets.stopLoss}
• Take Profit: ₹${priceTargets.takeProfit}
  `.trim()
}
