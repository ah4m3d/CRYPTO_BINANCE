// Intraday Scalping Technical Indicators Configuration
import { TechnicalDisplayConfig } from './technical-indicators';

// Scalping-optimized technical indicators configuration
export const scalpingTechnicalConfig: TechnicalDisplayConfig = {
  indicators: [
    // Fast EMAs for scalping
    {
      key: 'ema9',
      label: 'EMA9',
      color: 'text-green-600',
      format: 'price',
      decimals: 2,
      enabled: true,
      description: '9-period EMA - Primary scalping signal',
      category: 'moving_average'
    },
    {
      key: 'ema21',
      label: 'EMA21',
      color: 'text-blue-600',
      format: 'price',
      decimals: 2,
      enabled: true,
      description: '21-period EMA - Trend confirmation',
      category: 'moving_average'
    },
    
    // RSI for momentum scalping
    {
      key: 'rsi',
      label: 'RSI',
      color: 'text-purple-600',
      format: 'number',
      decimals: 1,
      enabled: true,
      description: 'RSI for overbought/oversold scalping signals',
      category: 'oscillator',
      thresholds: {
        overbought: 80,  // Tighter for scalping
        oversold: 20     // Tighter for scalping
      }
    },
    
    // MACD for momentum
    {
      key: 'macd',
      label: 'MACD',
      color: 'text-orange-600',
      format: 'number',
      decimals: 3,  // More precision for scalping
      enabled: true,
      description: 'MACD for momentum scalping',
      category: 'momentum',
      thresholds: {
        bullish: 0,
        bearish: 0
      }
    },
    
    // VWAP for price reference
    {
      key: 'vwap',
      label: 'VWAP',
      color: 'text-yellow-600',
      format: 'price',
      decimals: 2,
      enabled: true, // Important for scalping
      description: 'Volume Weighted Average Price - key scalping level',
      category: 'volume'
    },
    
    // Disable slower EMAs for scalping focus
    {
      key: 'ema50',
      label: 'EMA50',
      color: 'text-gray-400',
      format: 'price',
      decimals: 2,
      enabled: false, // Not needed for scalping
      description: '50-period EMA - too slow for scalping',
      category: 'moving_average'
    },
    {
      key: 'ema200',
      label: 'EMA200',
      color: 'text-gray-400',
      format: 'price',
      decimals: 2,
      enabled: false, // Not needed for scalping
      description: '200-period EMA - too slow for scalping',
      category: 'moving_average'
    },
    {
      key: 'ma50',
      label: 'MA50',
      color: 'text-gray-400',
      format: 'price',
      decimals: 2,
      enabled: false, // Not needed for scalping
      description: '50-period MA - too slow for scalping',
      category: 'moving_average'
    }
  ],
  
  layout: {
    columnsPerRow: 2, // Compact layout for quick viewing
    showCategory: false,
    showDescription: false
  },
  
  colorScheme: {
    bullish: 'text-green-500',
    bearish: 'text-red-500',
    neutral: 'text-blue-500',
    overbought: 'text-red-600',
    oversold: 'text-green-600'
  }
};

// Scalping-specific trading settings
export const scalpingTradingSettings = {
  minConfidence: 70,        // Higher confidence for scalping
  maxPositionSize: 5000,    // Smaller positions for scalping
  riskPerTrade: 1,          // Lower risk per trade (1%)
  maxDailyLoss: 1000,       // Lower daily loss limit
  maxPositions: 10,         // More positions for scalping
  stopLossPercent: 0.5,     // Tight stop loss (0.5%)
  takeProfitPercent: 1,     // Quick take profit (1%)
  maxHoldTime: 5,           // Very short hold time (5 minutes)
  scalingFactor: 2,         // Higher scaling for quick signals
  isEnabled: true
};

// Scalping watchlist - focus on high-volume, liquid pairs
export const scalpingWatchlist = [
  'BTCUSDT',   // Bitcoin - highest liquidity
  'ETHUSDT',   // Ethereum - second highest
  'BNBUSDT',   // BNB - good for scalping
  'ADAUSDT',   // Cardano - decent volume
  'SOLUSDT',   // Solana - high volatility
  'XRPUSDT'    // XRP - good liquidity
];

// Scalping time frames (in minutes)
export const scalpingTimeframes = {
  primary: 1,    // 1-minute charts for scalping
  secondary: 5,  // 5-minute for trend confirmation
  reference: 15  // 15-minute for overall trend
};

// Scalping signal priorities
export const scalpingSignalConfig = {
  // Prioritize fast signals
  fastSignals: ['ema9', 'rsi', 'macd'],
  
  // Entry conditions for scalping
  entryConditions: {
    bullish: {
      ema9_above_ema21: true,
      rsi_below: 80,
      macd_positive: true,
      price_above_vwap: true
    },
    bearish: {
      ema9_below_ema21: true,
      rsi_above: 20,
      macd_negative: true,
      price_below_vwap: true
    }
  },
  
  // Exit conditions for scalping
  exitConditions: {
    quick_profit: 0.5,  // Exit at 0.5% profit
    stop_loss: 0.3,     // Stop at 0.3% loss
    time_limit: 3       // Exit after 3 minutes regardless
  }
};
