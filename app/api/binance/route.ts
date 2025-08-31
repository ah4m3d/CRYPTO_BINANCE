import { NextRequest, NextResponse } from 'next/server'

// Example: fetch price and simple technicals from Binance public API
async function fetchBinanceKlines(symbol: string, interval: string, limit: number = 100) {
  // Convert symbol from e.g. BTC-USD to BTCUSDT
  const binanceSymbol = symbol.replace('-USD', 'USDT').replace('-USDT', 'USDT')
  const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Binance API error')
  const klines = await res.json()
  return klines.map((k: any) => ({
    openTime: k[0],
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
    closeTime: k[6],
  }))
}


function calculateEMA(prices: number[], period: number) {
  if (prices.length < period) return undefined;
  const k = 2 / (period + 1)
  let ema = prices[0]
  for (let i = 1; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k)
  }
  return ema
}

function calculateMA(prices: number[], period: number) {
  if (prices.length < period) return undefined;
  const slice = prices.slice(-period)
  return slice.reduce((a, b) => a + b, 0) / slice.length
}

function calculateVWAP(klines: any[]) {
  let cumulativeTPV = 0;
  let cumulativeVolume = 0;
  for (const k of klines) {
    const typicalPrice = (k.high + k.low + k.close) / 3;
    cumulativeTPV += typicalPrice * k.volume;
    cumulativeVolume += k.volume;
  }
  return cumulativeVolume === 0 ? undefined : cumulativeTPV / cumulativeVolume;
}

function calculateRSI(prices: number[], period: number) {
  let gains = 0, losses = 0
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1]
    if (diff >= 0) gains += diff
    else losses -= diff
  }
  if (losses === 0) return 100
  const rs = gains / losses
  return 100 - 100 / (1 + rs)
}

export async function POST(req: NextRequest) {
  try {
    const { symbols, interval = '1m', period = '1d', timeframe = '1m' } = await req.json()
    if (!symbols || !Array.isArray(symbols)) {
      return NextResponse.json({ error: 'Missing symbols' }, { status: 400 })
    }
    const results: any = {}
    for (const symbol of symbols) {
      try {
  const klines = await fetchBinanceKlines(symbol, interval, 250)
        const closes = klines.map((k: any) => k.close)
        const last = klines[klines.length - 1]
        // Simple backend signal logic
        const ema9 = calculateEMA(closes.slice(-9), 9)
        const ema21 = calculateEMA(closes.slice(-21), 21)
        const ema50 = calculateEMA(closes.slice(-50), 50)
        const ema200 = calculateEMA(closes.slice(-200), 200)
        const ma50 = calculateMA(closes, 50)
        const ma200 = calculateMA(closes, 200)
        const vwap = calculateVWAP(klines)
        const rsi = calculateRSI(closes.slice(-15), 14)
        let signal = 'HOLD'
        let confidence = 0
        if (ema9 && ema21 && rsi) {
          const emaDiff = Math.abs(ema9 - ema21)
          if (ema9 > ema21 && rsi < 70 && rsi > 35) {
            signal = 'BUY'
            confidence = Math.min(100, Math.round(emaDiff * 100 + (70 - Math.abs(50 - rsi))))
          } else if (ema9 < ema21 && rsi > 30 && rsi < 65) {
            signal = 'SELL'
            confidence = Math.min(100, Math.round(emaDiff * 100 + (65 - Math.abs(50 - rsi))))
          }
        }
        results[symbol] = {
          quote: {
            regularMarketPrice: last.close,
            regularMarketChange: last.close - klines[klines.length - 2].close,
            regularMarketChangePercent: ((last.close - klines[klines.length - 2].close) / klines[klines.length - 2].close) * 100,
            symbol,
            shortName: symbol
          },
          technicalAnalysis: {
            ema9,
            ema21,
            ema50,
            ema200,
            ma50,
            ma200,
            vwap,
            rsi,
            volume: last.volume,
            avgVolume: klines.reduce((a: number, k: { volume: number }) => a + k.volume, 0) / klines.length,
            signal,
            confidence
          }
        }
      } catch (e) {
        results[symbol] = { error: 'Failed to fetch from Binance' }
      }
    }
    return NextResponse.json({ results })
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
