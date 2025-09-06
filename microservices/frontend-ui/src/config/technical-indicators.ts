// Technical Indicators Display Configuration
export interface TechnicalIndicatorConfig {
  key: string;
  label: string;
  color: string;
  format: 'price' | 'percentage' | 'number';
  decimals: number;
  enabled: boolean;
  description: string;
  category: 'moving_average' | 'oscillator' | 'volume' | 'momentum';
  thresholds?: {
    bullish?: number;
    bearish?: number;
    overbought?: number;
    oversold?: number;
  };
}

export interface TechnicalDisplayConfig {
  indicators: TechnicalIndicatorConfig[];
  layout: {
    columnsPerRow: number;
    showCategory: boolean;
    showDescription: boolean;
  };
  colorScheme: {
    bullish: string;
    bearish: string;
    neutral: string;
    overbought: string;
    oversold: string;
  };
}

// Default Technical Indicators Configuration
export const defaultTechnicalConfig: TechnicalDisplayConfig = {
  indicators: [
    // Moving Averages
    {
      key: 'ema9',
      label: 'EMA9',
      color: 'text-purple-600',
      format: 'price',
      decimals: 2,
      enabled: true,
      description: '9-period Exponential Moving Average',
      category: 'moving_average'
    },
    {
      key: 'ema21',
      label: 'EMA21',
      color: 'text-indigo-600',
      format: 'price',
      decimals: 2,
      enabled: true,
      description: '21-period Exponential Moving Average',
      category: 'moving_average'
    },
    {
      key: 'ema50',
      label: 'EMA50',
      color: 'text-blue-600',
      format: 'price',
      decimals: 2,
      enabled: true,
      description: '50-period Exponential Moving Average',
      category: 'moving_average'
    },
    {
      key: 'ma50',
      label: 'MA50',
      color: 'text-teal-600',
      format: 'price',
      decimals: 2,
      enabled: true,
      description: '50-period Simple Moving Average',
      category: 'moving_average'
    },
    {
      key: 'ema200',
      label: 'EMA200',
      color: 'text-gray-600',
      format: 'price',
      decimals: 2,
      enabled: true,
      description: '200-period Exponential Moving Average',
      category: 'moving_average'
    },
    
    // Oscillators
    {
      key: 'rsi',
      label: 'RSI',
      color: 'text-blue-600',
      format: 'number',
      decimals: 1,
      enabled: true,
      description: 'Relative Strength Index (0-100)',
      category: 'oscillator',
      thresholds: {
        overbought: 70,
        oversold: 30
      }
    },
    {
      key: 'macd',
      label: 'MACD',
      color: 'text-green-600',
      format: 'number',
      decimals: 2,
      enabled: true,
      description: 'Moving Average Convergence Divergence',
      category: 'momentum',
      thresholds: {
        bullish: 0,
        bearish: 0
      }
    },
    
    // Volume
    {
      key: 'vwap',
      label: 'VWAP',
      color: 'text-orange-600',
      format: 'price',
      decimals: 2,
      enabled: false, // Disabled by default since it's often 0
      description: 'Volume Weighted Average Price',
      category: 'volume'
    }
  ],
  
  layout: {
    columnsPerRow: 2,
    showCategory: false,
    showDescription: false
  },
  
  colorScheme: {
    bullish: 'text-green-600',
    bearish: 'text-red-600',
    neutral: 'text-blue-600',
    overbought: 'text-red-600',
    oversold: 'text-green-600'
  }
};

// Utility functions for technical indicators
export const getTechnicalIndicatorValue = (technical: any, indicator: TechnicalIndicatorConfig): number | null => {
  const value = technical?.[indicator.key];
  return value !== undefined && value !== null && value !== 0 ? value : null;
};

export const formatTechnicalValue = (value: number, indicator: TechnicalIndicatorConfig): string => {
  switch (indicator.format) {
    case 'price':
      return `$${value.toFixed(indicator.decimals)}`;
    case 'percentage':
      return `${value.toFixed(indicator.decimals)}%`;
    case 'number':
    default:
      return value.toFixed(indicator.decimals);
  }
};

export const getTechnicalColor = (value: number, indicator: TechnicalIndicatorConfig, colorScheme: any): string => {
  const thresholds = indicator.thresholds;
  
  if (!thresholds) {
    return indicator.color;
  }
  
  // RSI specific coloring
  if (indicator.key === 'rsi') {
    if (value > thresholds.overbought!) return colorScheme.overbought;
    if (value < thresholds.oversold!) return colorScheme.oversold;
    return colorScheme.neutral;
  }
  
  // MACD specific coloring
  if (indicator.key === 'macd') {
    return value > 0 ? colorScheme.bullish : colorScheme.bearish;
  }
  
  return indicator.color;
};

export const getTechnicalStatus = (value: number, indicator: TechnicalIndicatorConfig): string | null => {
  const thresholds = indicator.thresholds;
  
  if (!thresholds) return null;
  
  if (indicator.key === 'rsi') {
    if (value > thresholds.overbought!) return 'Overbought';
    if (value < thresholds.oversold!) return 'Oversold';
    return 'Neutral';
  }
  
  if (indicator.key === 'macd') {
    return value > 0 ? 'Bullish' : 'Bearish';
  }
  
  return null;
};
