package models

import (
	"time"
)

// Trade represents a trading transaction
type Trade struct {
	ID         string    `json:"id" db:"id"`
	Symbol     string    `json:"symbol" db:"symbol"`
	Type       string    `json:"type" db:"type"`
	Price      float64   `json:"price" db:"price"`
	Quantity   float64   `json:"quantity" db:"quantity"`
	Timestamp  time.Time `json:"timestamp" db:"timestamp"`
	Signal     string    `json:"signal" db:"signal"`
	Confidence int       `json:"confidence" db:"confidence"`
	PnL        *float64  `json:"pnl,omitempty" db:"pnl"`
	ExitPrice  *float64  `json:"exitPrice,omitempty" db:"exit_price"`
	HoldTime   *int      `json:"holdTime,omitempty" db:"hold_time"`
}

// Position represents an active trading position
type Position struct {
	ID            string    `json:"id" db:"id"`
	Symbol        string    `json:"symbol" db:"symbol"`
	Quantity      float64   `json:"quantity" db:"quantity"`
	AvgBuyPrice   float64   `json:"avgBuyPrice" db:"avg_buy_price"`
	CurrentValue  float64   `json:"currentValue" db:"current_value"`
	UnrealizedPnL float64   `json:"unrealizedPnL" db:"unrealized_pnl"`
	EntryTime     time.Time `json:"entryTime" db:"entry_time"`
	TargetPrice   *float64  `json:"targetPrice,omitempty" db:"target_price"`
	StopLossPrice *float64  `json:"stopLossPrice,omitempty" db:"stop_loss_price"`
}

// TradingSettings holds trading configuration
type TradingSettings struct {
	MinConfidence     int     `json:"minConfidence" db:"min_confidence"`
	MaxPositionSize   float64 `json:"maxPositionSize" db:"max_position_size"`
	RiskPerTrade      float64 `json:"riskPerTrade" db:"risk_per_trade"`
	MaxDailyLoss      float64 `json:"maxDailyLoss" db:"max_daily_loss"`
	MaxPositions      int     `json:"maxPositions" db:"max_positions"`
	StopLossPercent   float64 `json:"stopLossPercent" db:"stop_loss_percent"`
	TakeProfitPercent float64 `json:"takeProfitPercent" db:"take_profit_percent"`
	MaxHoldTime       int     `json:"maxHoldTime" db:"max_hold_time"`
	ScalingFactor     int     `json:"scalingFactor" db:"scaling_factor"`
	IsEnabled         bool    `json:"isEnabled" db:"is_enabled"`
}

// WatchlistItem represents a symbol being monitored
type WatchlistItem struct {
	Symbol        string             `json:"symbol" db:"symbol"`
	Name          string             `json:"name" db:"name"`
	Price         float64            `json:"price" db:"price"`
	Change        float64            `json:"change" db:"change"`
	ChangePercent float64            `json:"changePercent" db:"change_percent"`
	Volume        float64            `json:"volume" db:"volume"`
	MarketCap     float64            `json:"marketCap" db:"market_cap"`
	Technical     *TechnicalAnalysis `json:"technical,omitempty"`
	LastUpdate    time.Time          `json:"lastUpdate" db:"last_update"`
	IsActive      bool               `json:"isActive" db:"is_active"`
}

// TechnicalAnalysis holds technical indicators
type TechnicalAnalysis struct {
	EMA9       float64 `json:"ema9" db:"ema9"`
	EMA21      float64 `json:"ema21" db:"ema21"`
	EMA50      float64 `json:"ema50" db:"ema50"`
	EMA200     float64 `json:"ema200" db:"ema200"`
	RSI        float64 `json:"rsi" db:"rsi"`
	MACD       float64 `json:"macd" db:"macd"`
	VWAP       float64 `json:"vwap" db:"vwap"`
	MA50       float64 `json:"ma50" db:"ma50"`
	Signal     string  `json:"signal" db:"signal"`
	Confidence int     `json:"confidence" db:"confidence"`
}

// TradingState represents the current state of the trading system
type TradingState struct {
	Trades           []Trade         `json:"trades"`
	Positions        []Position      `json:"positions"`
	TotalPnL         float64         `json:"totalPnL"`
	DayPnL           float64         `json:"dayPnL"`
	TradingBalance   float64         `json:"tradingBalance"`
	AvailableBalance float64         `json:"availableBalance"`
	Settings         TradingSettings `json:"settings"`
	Watchlist        []WatchlistItem `json:"watchlist"`
}

// Candle represents OHLCV data
type Candle struct {
	Open      float64   `json:"open" db:"open"`
	High      float64   `json:"high" db:"high"`
	Low       float64   `json:"low" db:"low"`
	Close     float64   `json:"close" db:"close"`
	Volume    float64   `json:"volume" db:"volume"`
	Time      int64     `json:"time" db:"time"`
	Timestamp time.Time `json:"timestamp" db:"timestamp"`
	Symbol    string    `json:"symbol" db:"symbol"`
}

// TechnicalData represents technical analysis data
type TechnicalData struct {
	EMA9       *float64 `json:"ema9,omitempty"`
	EMA21      *float64 `json:"ema21,omitempty"`
	EMA50      *float64 `json:"ema50,omitempty"`
	EMA200     *float64 `json:"ema200,omitempty"`
	MA50       *float64 `json:"ma50,omitempty"`
	MA200      *float64 `json:"ma200,omitempty"`
	RSI        *float64 `json:"rsi,omitempty"`
	VWAP       *float64 `json:"vwap,omitempty"`
	MACD       *float64 `json:"macd,omitempty"`
	MACDSignal *float64 `json:"macdSignal,omitempty"`
	MACDHist   *float64 `json:"macdHist,omitempty"`
	AvgVolume  *float64 `json:"avgVolume,omitempty"`
	Signal     string   `json:"signal,omitempty"`
	Confidence int      `json:"confidence,omitempty"`
}

// LiveTicker represents real-time price data
type LiveTicker struct {
	Type          string         `json:"type"`
	Symbol        string         `json:"symbol"`
	Price         string         `json:"price"`
	Volume        string         `json:"volume"`
	Change        string         `json:"change"`
	TechnicalData *TechnicalData `json:"technicalData,omitempty"`
}

// BinanceTickerResponse represents Binance 24hr ticker response
type BinanceTickerResponse struct {
	Symbol             string `json:"symbol"`
	PriceChange        string `json:"priceChange"`
	PriceChangePercent string `json:"priceChangePercent"`
	WeightedAvgPrice   string `json:"weightedAvgPrice"`
	PrevClosePrice     string `json:"prevClosePrice"`
	LastPrice          string `json:"lastPrice"`
	LastQty            string `json:"lastQty"`
	BidPrice           string `json:"bidPrice"`
	BidQty             string `json:"bidQty"`
	AskPrice           string `json:"askPrice"`
	AskQty             string `json:"askQty"`
	OpenPrice          string `json:"openPrice"`
	HighPrice          string `json:"highPrice"`
	LowPrice           string `json:"lowPrice"`
	Volume             string `json:"volume"`
	QuoteVolume        string `json:"quoteVolume"`
	OpenTime           int64  `json:"openTime"`
	CloseTime          int64  `json:"closeTime"`
	Count              int    `json:"count"`
}

// BinanceStreamTickerData represents streaming ticker data
type BinanceStreamTickerData struct {
	Stream string `json:"stream"`
	Data   struct {
		E string `json:"E"` // Event time
		S string `json:"s"` // Symbol
		C string `json:"c"` // Close price
		O string `json:"o"` // Open price
		H string `json:"h"` // High price
		L string `json:"l"` // Low price
		V string `json:"v"` // Volume
		P string `json:"P"` // Price change percent
	} `json:"data"`
}

// BinancePriceData represents processed price data from Binance
type BinancePriceData struct {
	LastPrice          float64
	PriceChange        float64
	PriceChangePercent float64
	Volume             float64
}

// APIResponse represents a standard API response
type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
	Message string      `json:"message,omitempty"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Details string `json:"details,omitempty"`
}
