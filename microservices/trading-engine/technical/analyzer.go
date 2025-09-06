package technical

import (
	"context"
	"fmt"
	"sync"
	"time"

	"trading-engine/models"
	"trading-engine/utils"
)

// Analyzer performs technical analysis calculations
type Analyzer struct {
	mu     sync.RWMutex
	cache  map[string]*AnalysisResult
	config *Config
}

// Config holds technical analysis configuration
type Config struct {
	RSIPeriod     int           `json:"rsi_period"`
	EMA9Period    int           `json:"ema9_period"`
	EMA21Period   int           `json:"ema21_period"`
	EMA50Period   int           `json:"ema50_period"`
	EMA200Period  int           `json:"ema200_period"`
	VWAPPeriod    int           `json:"vwap_period"`
	MinConfidence int           `json:"min_confidence"`
	CacheDuration time.Duration `json:"cache_duration"`
}

// AnalysisResult holds the result of technical analysis
type AnalysisResult struct {
	Symbol         string        `json:"symbol"`
	Timestamp      time.Time     `json:"timestamp"`
	Price          float64       `json:"price"`
	Indicators     *Indicators   `json:"indicators"`
	Signals        *Signals      `json:"signals"`
	Confidence     int           `json:"confidence"`
	TrendDirection string        `json:"trend_direction"`
	SwingLevels    *SwingLevels  `json:"swing_levels"`
	PriceTargets   *PriceTargets `json:"price_targets"`
}

// Indicators holds all technical indicators
type Indicators struct {
	RSI        float64 `json:"rsi"`
	EMA9       float64 `json:"ema9"`
	EMA21      float64 `json:"ema21"`
	EMA50      float64 `json:"ema50"`
	EMA200     float64 `json:"ema200"`
	VWAP       float64 `json:"vwap"`
	MACD       float64 `json:"macd"`
	MACDSignal float64 `json:"macd_signal"`
	Volume     float64 `json:"volume"`
	AvgVolume  float64 `json:"avg_volume"`
}

// Signals holds trading signals
type Signals struct {
	Overall string `json:"overall"`
	RSI     string `json:"rsi"`
	EMA     string `json:"ema"`
	VWAP    string `json:"vwap"`
	Volume  string `json:"volume"`
	Trend   string `json:"trend"`
}

// SwingLevels holds swing high and low levels
type SwingLevels struct {
	SwingHigh float64 `json:"swing_high"`
	SwingLow  float64 `json:"swing_low"`
}

// PriceTargets holds calculated price targets
type PriceTargets struct {
	StopLoss   float64 `json:"stop_loss"`
	TakeProfit float64 `json:"take_profit"`
	RiskReward float64 `json:"risk_reward"`
}

// NewAnalyzer creates a new technical analyzer
func NewAnalyzer(config *Config) *Analyzer {
	if config == nil {
		config = &Config{
			RSIPeriod:     14,
			EMA9Period:    9,
			EMA21Period:   21,
			EMA50Period:   50,
			EMA200Period:  200,
			VWAPPeriod:    24,
			MinConfidence: 60,
			CacheDuration: 30 * time.Second,
		}
	}

	return &Analyzer{
		cache:  make(map[string]*AnalysisResult),
		config: config,
	}
}

// Analyze performs technical analysis on candlestick data
func (a *Analyzer) Analyze(ctx context.Context, symbol string, candles []models.Candle) (*AnalysisResult, error) {
	if len(candles) == 0 {
		return nil, fmt.Errorf("no candlestick data provided")
	}

	// Check cache first
	a.mu.RLock()
	if cached, exists := a.cache[symbol]; exists {
		if time.Since(cached.Timestamp) < a.config.CacheDuration {
			a.mu.RUnlock()
			return cached, nil
		}
	}
	a.mu.RUnlock()

	// Perform analysis
	result, err := a.performAnalysis(ctx, symbol, candles)
	if err != nil {
		return nil, err
	}

	// Cache result
	a.mu.Lock()
	a.cache[symbol] = result
	a.mu.Unlock()

	return result, nil
}

// performAnalysis performs the actual technical analysis
func (a *Analyzer) performAnalysis(ctx context.Context, symbol string, candles []models.Candle) (*AnalysisResult, error) {
	if len(candles) < a.config.EMA200Period {
		return nil, fmt.Errorf("insufficient data for analysis: need at least %d candles, got %d", a.config.EMA200Period, len(candles))
	}

	currentCandle := candles[len(candles)-1]
	closePrices := extractClosePrices(candles)
	highPrices := extractHighPrices(candles)
	lowPrices := extractLowPrices(candles)
	volumes := extractVolumes(candles)

	// Calculate indicators
	indicators := &Indicators{
		RSI:       a.calculateRSI(closePrices, a.config.RSIPeriod),
		EMA9:      a.calculateEMA(closePrices, a.config.EMA9Period),
		EMA21:     a.calculateEMA(closePrices, a.config.EMA21Period),
		EMA50:     a.calculateEMA(closePrices, a.config.EMA50Period),
		EMA200:    a.calculateEMA(closePrices, a.config.EMA200Period),
		VWAP:      a.calculateVWAP(candles, a.config.VWAPPeriod),
		Volume:    currentCandle.Volume,
		AvgVolume: a.calculateAverage(volumes, 20),
	}

	// Calculate MACD
	indicators.MACD, indicators.MACDSignal = a.calculateMACD(closePrices, 12, 26, 9)

	// Calculate swing levels
	swingLevels := a.calculateSwingLevels(highPrices, lowPrices, 20)

	// Generate signals
	signals := a.generateSignals(currentCandle.Close, indicators, swingLevels)

	// Calculate overall confidence
	confidence := a.calculateConfidence(signals, indicators)

	// Determine trend direction
	trendDirection := a.determineTrend(indicators, currentCandle.Close)

	// Calculate price targets
	priceTargets := a.calculatePriceTargets(currentCandle.Close, signals.Overall, swingLevels, indicators)

	return &AnalysisResult{
		Symbol:         symbol,
		Timestamp:      time.Now(),
		Price:          currentCandle.Close,
		Indicators:     indicators,
		Signals:        signals,
		Confidence:     confidence,
		TrendDirection: trendDirection,
		SwingLevels:    swingLevels,
		PriceTargets:   priceTargets,
	}, nil
}

// calculateRSI calculates the Relative Strength Index
func (a *Analyzer) calculateRSI(prices []float64, period int) float64 {
	if len(prices) < period+1 {
		return 50.0 // Neutral RSI
	}

	gains := make([]float64, 0, len(prices)-1)
	losses := make([]float64, 0, len(prices)-1)

	for i := 1; i < len(prices); i++ {
		change := prices[i] - prices[i-1]
		if change > 0 {
			gains = append(gains, change)
			losses = append(losses, 0)
		} else {
			gains = append(gains, 0)
			losses = append(losses, -change)
		}
	}

	if len(gains) < period {
		return 50.0
	}

	avgGain := a.calculateAverage(gains[len(gains)-period:], period)
	avgLoss := a.calculateAverage(losses[len(losses)-period:], period)

	if avgLoss == 0 {
		return 100.0
	}

	rs := avgGain / avgLoss
	return 100 - (100 / (1 + rs))
}

// calculateEMA calculates the Exponential Moving Average
func (a *Analyzer) calculateEMA(prices []float64, period int) float64 {
	if len(prices) < period {
		return a.calculateAverage(prices, len(prices))
	}

	multiplier := 2.0 / (float64(period) + 1.0)
	ema := a.calculateAverage(prices[:period], period) // Start with SMA

	for i := period; i < len(prices); i++ {
		ema = (prices[i] * multiplier) + (ema * (1 - multiplier))
	}

	return ema
}

// calculateVWAP calculates the Volume Weighted Average Price
func (a *Analyzer) calculateVWAP(candles []models.Candle, period int) float64 {
	if len(candles) == 0 {
		return 0
	}

	start := utils.MaxFloat64(0, float64(len(candles)-period))
	relevantCandles := candles[int(start):]

	var totalVolumePrice, totalVolume float64
	for _, candle := range relevantCandles {
		typicalPrice := (candle.High + candle.Low + candle.Close) / 3.0
		volumePrice := typicalPrice * candle.Volume
		totalVolumePrice += volumePrice
		totalVolume += candle.Volume
	}

	if totalVolume == 0 {
		return 0
	}

	return totalVolumePrice / totalVolume
}

// calculateMACD calculates the MACD indicator
func (a *Analyzer) calculateMACD(prices []float64, fastPeriod, slowPeriod, signalPeriod int) (float64, float64) {
	if len(prices) < slowPeriod {
		return 0, 0
	}

	fastEMA := a.calculateEMA(prices, fastPeriod)
	slowEMA := a.calculateEMA(prices, slowPeriod)
	macd := fastEMA - slowEMA

	// For MACD signal, we need more sophisticated calculation
	// This is a simplified version
	macdSignal := macd * 0.9 // Simplified signal line

	return macd, macdSignal
}

// calculateSwingLevels calculates swing high and low levels
func (a *Analyzer) calculateSwingLevels(highs, lows []float64, lookback int) *SwingLevels {
	if len(highs) < lookback || len(lows) < lookback {
		return &SwingLevels{SwingHigh: 0, SwingLow: 0}
	}

	start := len(highs) - lookback
	recentHighs := highs[start:]
	recentLows := lows[start:]

	swingHigh := recentHighs[0]
	swingLow := recentLows[0]

	for i := 1; i < len(recentHighs)-1; i++ {
		// Swing high: higher than previous and next
		if recentHighs[i] > recentHighs[i-1] && recentHighs[i] > recentHighs[i+1] && recentHighs[i] > swingHigh {
			swingHigh = recentHighs[i]
		}
		// Swing low: lower than previous and next
		if recentLows[i] < recentLows[i-1] && recentLows[i] < recentLows[i+1] && recentLows[i] < swingLow {
			swingLow = recentLows[i]
		}
	}

	return &SwingLevels{
		SwingHigh: utils.RoundToDecimals(swingHigh, 2),
		SwingLow:  utils.RoundToDecimals(swingLow, 2),
	}
}

// generateSignals generates trading signals based on indicators
func (a *Analyzer) generateSignals(currentPrice float64, indicators *Indicators, swingLevels *SwingLevels) *Signals {
	signals := &Signals{}

	// RSI signals
	if indicators.RSI < 30 {
		signals.RSI = "OVERSOLD"
	} else if indicators.RSI > 70 {
		signals.RSI = "OVERBOUGHT"
	} else if indicators.RSI >= 30 && indicators.RSI <= 50 {
		signals.RSI = "BULLISH"
	} else if indicators.RSI >= 50 && indicators.RSI <= 70 {
		signals.RSI = "BEARISH"
	} else {
		signals.RSI = "NEUTRAL"
	}

	// EMA signals
	if indicators.EMA9 > indicators.EMA21 && indicators.EMA50 > indicators.EMA200 {
		signals.EMA = "BULLISH"
	} else if indicators.EMA9 < indicators.EMA21 && indicators.EMA50 < indicators.EMA200 {
		signals.EMA = "BEARISH"
	} else {
		signals.EMA = "NEUTRAL"
	}

	// VWAP signals
	if currentPrice > indicators.VWAP*1.002 {
		signals.VWAP = "ABOVE"
	} else if currentPrice < indicators.VWAP*0.998 {
		signals.VWAP = "BELOW"
	} else {
		signals.VWAP = "NEUTRAL"
	}

	// Volume signals
	volumeRatio := utils.SafeDivide(indicators.Volume, indicators.AvgVolume)
	if volumeRatio > 1.5 {
		signals.Volume = "HIGH"
	} else if volumeRatio < 0.7 {
		signals.Volume = "LOW"
	} else {
		signals.Volume = "NORMAL"
	}

	// Trend signals
	if currentPrice > indicators.EMA50 && indicators.EMA50 > indicators.EMA200 {
		signals.Trend = "UPTREND"
	} else if currentPrice < indicators.EMA50 && indicators.EMA50 < indicators.EMA200 {
		signals.Trend = "DOWNTREND"
	} else {
		signals.Trend = "SIDEWAYS"
	}

	// Overall signal
	signals.Overall = a.calculateOverallSignal(signals, indicators, currentPrice)

	return signals
}

// calculateOverallSignal determines the overall trading signal
func (a *Analyzer) calculateOverallSignal(signals *Signals, indicators *Indicators, currentPrice float64) string {
	bullishCount := 0
	bearishCount := 0

	// Count bullish signals
	if signals.RSI == "OVERSOLD" || signals.RSI == "BULLISH" {
		bullishCount++
	}
	if signals.EMA == "BULLISH" {
		bullishCount += 2 // EMA signals are weighted more
	}
	if signals.VWAP == "BELOW" {
		bullishCount++
	}
	if signals.Trend == "UPTREND" {
		bullishCount += 2
	}
	if signals.Volume == "HIGH" {
		bullishCount++
	}

	// Count bearish signals
	if signals.RSI == "OVERBOUGHT" || signals.RSI == "BEARISH" {
		bearishCount++
	}
	if signals.EMA == "BEARISH" {
		bearishCount += 2
	}
	if signals.VWAP == "ABOVE" {
		bearishCount++
	}
	if signals.Trend == "DOWNTREND" {
		bearishCount += 2
	}
	if signals.Volume == "HIGH" {
		bearishCount++
	}

	// Determine overall signal
	if bullishCount >= 4 {
		return "STRONG_BUY"
	} else if bullishCount >= 2 {
		return "BUY"
	} else if bearishCount >= 4 {
		return "STRONG_SELL"
	} else if bearishCount >= 2 {
		return "SELL"
	}

	return "HOLD"
}

// calculateConfidence calculates confidence score for the signal
func (a *Analyzer) calculateConfidence(signals *Signals, indicators *Indicators) int {
	confidence := 50 // Base confidence

	// Adjust based on signal strength
	switch signals.Overall {
	case "STRONG_BUY", "STRONG_SELL":
		confidence += 25
	case "BUY", "SELL":
		confidence += 15
	}

	// Adjust based on RSI
	if indicators.RSI < 25 || indicators.RSI > 75 {
		confidence += 10
	}

	// Adjust based on volume
	volumeRatio := utils.SafeDivide(indicators.Volume, indicators.AvgVolume)
	if volumeRatio > 1.5 {
		confidence += 10
	} else if volumeRatio < 0.7 {
		confidence -= 10
	}

	// Adjust based on trend alignment
	if signals.EMA == signals.Trend {
		confidence += 5
	}

	return int(utils.ClampFloat64(float64(confidence), 0, 95))
}

// determineTrend determines the overall trend direction
func (a *Analyzer) determineTrend(indicators *Indicators, currentPrice float64) string {
	if currentPrice > indicators.EMA50 && indicators.EMA50 > indicators.EMA200 {
		return "UPTREND"
	} else if currentPrice < indicators.EMA50 && indicators.EMA50 < indicators.EMA200 {
		return "DOWNTREND"
	}
	return "SIDEWAYS"
}

// calculatePriceTargets calculates stop loss and take profit levels
func (a *Analyzer) calculatePriceTargets(currentPrice float64, signal string, swingLevels *SwingLevels, indicators *Indicators) *PriceTargets {
	var stopLoss, takeProfit float64
	var riskReward float64 = 1.5

	switch signal {
	case "STRONG_BUY", "BUY":
		// For long positions
		stopLoss = utils.MinFloat64(swingLevels.SwingLow*0.995, currentPrice*0.98)
		risk := currentPrice - stopLoss
		takeProfit = currentPrice + (risk * riskReward)

	case "STRONG_SELL", "SELL":
		// For short positions
		stopLoss = utils.MaxFloat64(swingLevels.SwingHigh*1.005, currentPrice*1.02)
		risk := stopLoss - currentPrice
		takeProfit = currentPrice - (risk * riskReward)

	default:
		// Neutral
		stopLoss = currentPrice * 0.99
		takeProfit = currentPrice * 1.01
	}

	return &PriceTargets{
		StopLoss:   utils.RoundToDecimals(stopLoss, 2),
		TakeProfit: utils.RoundToDecimals(takeProfit, 2),
		RiskReward: riskReward,
	}
}

// Helper functions
func (a *Analyzer) calculateAverage(values []float64, period int) float64 {
	if len(values) == 0 {
		return 0
	}

	n := utils.MinFloat64(float64(len(values)), float64(period))
	start := utils.MaxFloat64(0, float64(len(values))-n)

	var sum float64
	for i := int(start); i < len(values); i++ {
		sum += values[i]
	}

	return sum / n
}

func extractClosePrices(candles []models.Candle) []float64 {
	prices := make([]float64, len(candles))
	for i, candle := range candles {
		prices[i] = candle.Close
	}
	return prices
}

func extractHighPrices(candles []models.Candle) []float64 {
	prices := make([]float64, len(candles))
	for i, candle := range candles {
		prices[i] = candle.High
	}
	return prices
}

func extractLowPrices(candles []models.Candle) []float64 {
	prices := make([]float64, len(candles))
	for i, candle := range candles {
		prices[i] = candle.Low
	}
	return prices
}

func extractVolumes(candles []models.Candle) []float64 {
	volumes := make([]float64, len(candles))
	for i, candle := range candles {
		volumes[i] = candle.Volume
	}
	return volumes
}

// ClearCache clears the analysis cache
func (a *Analyzer) ClearCache() {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.cache = make(map[string]*AnalysisResult)
}

// GetCachedAnalysis returns cached analysis if available
func (a *Analyzer) GetCachedAnalysis(symbol string) (*AnalysisResult, bool) {
	a.mu.RLock()
	defer a.mu.RUnlock()

	result, exists := a.cache[symbol]
	if !exists {
		return nil, false
	}

	if time.Since(result.Timestamp) > a.config.CacheDuration {
		return nil, false
	}

	return result, true
}
