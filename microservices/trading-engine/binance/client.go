package binance

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"

	"trading-engine/config"
	"trading-engine/logger"
	"trading-engine/models"
	"trading-engine/utils"
)

// Client represents a Binance API client
type Client struct {
	config      *config.BinanceConfig
	httpClient  *http.Client
	logger      *logger.Logger
	rateLimiter *RateLimiter
	mu          sync.RWMutex
}

// RateLimiter implements token bucket rate limiting
type RateLimiter struct {
	tokens     int
	maxTokens  int
	refillRate time.Duration
	lastRefill time.Time
	mu         sync.Mutex
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(maxTokens int, refillRate time.Duration) *RateLimiter {
	return &RateLimiter{
		tokens:     maxTokens,
		maxTokens:  maxTokens,
		refillRate: refillRate,
		lastRefill: time.Now(),
	}
}

// Allow checks if a request is allowed
func (rl *RateLimiter) Allow() bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	elapsed := now.Sub(rl.lastRefill)

	// Refill tokens based on elapsed time
	tokensToAdd := int(elapsed / rl.refillRate)
	if tokensToAdd > 0 {
		rl.tokens = int(utils.MinFloat64(float64(rl.tokens+tokensToAdd), float64(rl.maxTokens)))
		rl.lastRefill = now
	}

	if rl.tokens > 0 {
		rl.tokens--
		return true
	}
	return false
}

// NewClient creates a new Binance client
func NewClient(cfg *config.BinanceConfig, log *logger.Logger) *Client {
	httpClient := &http.Client{
		Timeout: 30 * time.Second,
		Transport: &http.Transport{
			MaxIdleConns:        100,
			MaxIdleConnsPerHost: 10,
			IdleConnTimeout:     90 * time.Second,
		},
	}

	rateLimiter := NewRateLimiter(cfg.RateLimit, time.Minute)

	return &Client{
		config:      cfg,
		httpClient:  httpClient,
		logger:      log,
		rateLimiter: rateLimiter,
	}
}

// FetchPrices fetches current prices for multiple symbols
func (c *Client) FetchPrices(ctx context.Context, symbols []string) (map[string]models.BinancePriceData, error) {
	if !c.rateLimiter.Allow() {
		return nil, fmt.Errorf("rate limit exceeded")
	}

	url := c.config.APIBaseURL + "/api/v3/ticker/24hr"

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch prices: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error: status=%d, body=%s", resp.StatusCode, string(body))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	var tickers []models.BinanceTickerResponse
	if err := json.Unmarshal(body, &tickers); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	// Create symbol set for faster lookup
	symbolSet := make(map[string]bool)
	for _, symbol := range symbols {
		symbolSet[symbol] = true
	}

	prices := make(map[string]models.BinancePriceData)
	for _, ticker := range tickers {
		if symbolSet[ticker.Symbol] {
			lastPrice, _ := utils.ParseFloat(ticker.LastPrice)
			priceChange, _ := utils.ParseFloat(ticker.PriceChange)
			priceChangePercent, _ := utils.ParseFloat(ticker.PriceChangePercent)
			volume, _ := utils.ParseFloat(ticker.Volume)

			prices[ticker.Symbol] = models.BinancePriceData{
				LastPrice:          lastPrice,
				PriceChange:        priceChange,
				PriceChangePercent: priceChangePercent,
				Volume:             volume,
			}
		}
	}

	c.logger.WithFields(map[string]interface{}{
		"symbols_requested": len(symbols),
		"symbols_found":     len(prices),
	}).Info("Successfully fetched prices from Binance")

	return prices, nil
}

// FetchHistoricalKlines fetches historical candlestick data
func (c *Client) FetchHistoricalKlines(ctx context.Context, symbol, interval string, limit int) ([]models.Candle, error) {
	if !c.rateLimiter.Allow() {
		return nil, fmt.Errorf("rate limit exceeded")
	}

	url := fmt.Sprintf("%s/api/v3/klines?symbol=%s&interval=%s&limit=%d",
		c.config.APIBaseURL, symbol, interval, limit)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch klines: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error: status=%d, body=%s", resp.StatusCode, string(body))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	var klineData [][]interface{}
	if err := json.Unmarshal(body, &klineData); err != nil {
		return nil, fmt.Errorf("failed to parse klines response: %w", err)
	}

	candles := make([]models.Candle, 0, len(klineData))
	for _, kline := range klineData {
		if len(kline) >= 6 {
			open, _ := utils.ParseFloat(kline[1].(string))
			high, _ := utils.ParseFloat(kline[2].(string))
			low, _ := utils.ParseFloat(kline[3].(string))
			closePrice, _ := utils.ParseFloat(kline[4].(string))
			volume, _ := utils.ParseFloat(kline[5].(string))
			timestamp, _ := utils.ParseInt(fmt.Sprintf("%.0f", kline[0].(float64)))

			candles = append(candles, models.Candle{
				Open:      open,
				High:      high,
				Low:       low,
				Close:     closePrice,
				Volume:    volume,
				Time:      timestamp / 1000, // Convert to seconds
				Timestamp: time.Unix(timestamp/1000, 0),
				Symbol:    symbol,
			})
		}
	}

	c.logger.WithFields(map[string]interface{}{
		"symbol":   symbol,
		"interval": interval,
		"candles":  len(candles),
	}).Info("Successfully fetched historical klines")

	return candles, nil
}

// WebSocketClient represents a WebSocket connection to Binance
type WebSocketClient struct {
	config      *config.BinanceConfig
	logger      *logger.Logger
	connections map[string]*websocket.Conn
	subscribers map[string][]chan models.LiveTicker
	mu          sync.RWMutex
}

// NewWebSocketClient creates a new WebSocket client
func NewWebSocketClient(cfg *config.BinanceConfig, log *logger.Logger) *WebSocketClient {
	return &WebSocketClient{
		config:      cfg,
		logger:      log,
		connections: make(map[string]*websocket.Conn),
		subscribers: make(map[string][]chan models.LiveTicker),
	}
}

// Subscribe subscribes to a symbol's ticker stream
func (wsc *WebSocketClient) Subscribe(symbol string) error {
	wsc.mu.Lock()
	defer wsc.mu.Unlock()

	// Check if already connected
	if _, exists := wsc.connections[symbol]; exists {
		wsc.logger.WithFields(map[string]interface{}{
			"symbol": symbol,
		}).Info("Already subscribed to symbol")
		return nil
	}

	wsURL := fmt.Sprintf("%s/%s@ticker", wsc.config.WSURL, strings.ToLower(symbol))

	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		return fmt.Errorf("failed to connect to WebSocket for %s: %w", symbol, err)
	}

	wsc.connections[symbol] = conn

	// Start listening for messages
	go wsc.handleMessages(symbol, conn)

	wsc.logger.WithFields(map[string]interface{}{
		"symbol": symbol,
		"url":    wsURL,
	}).Info("Successfully subscribed to WebSocket stream")

	return nil
}

// Unsubscribe unsubscribes from a symbol's ticker stream
func (wsc *WebSocketClient) Unsubscribe(symbol string) error {
	wsc.mu.Lock()
	defer wsc.mu.Unlock()

	conn, exists := wsc.connections[symbol]
	if !exists {
		return nil
	}

	conn.Close()
	delete(wsc.connections, symbol)
	delete(wsc.subscribers, symbol)

	wsc.logger.WithFields(map[string]interface{}{
		"symbol": symbol,
	}).Info("Unsubscribed from WebSocket stream")

	return nil
}

// AddSubscriber adds a subscriber channel for a symbol
func (wsc *WebSocketClient) AddSubscriber(symbol string, ch chan models.LiveTicker) {
	wsc.mu.Lock()
	defer wsc.mu.Unlock()

	if wsc.subscribers[symbol] == nil {
		wsc.subscribers[symbol] = make([]chan models.LiveTicker, 0)
	}
	wsc.subscribers[symbol] = append(wsc.subscribers[symbol], ch)
}

// RemoveSubscriber removes a subscriber channel for a symbol
func (wsc *WebSocketClient) RemoveSubscriber(symbol string, ch chan models.LiveTicker) {
	wsc.mu.Lock()
	defer wsc.mu.Unlock()

	subscribers := wsc.subscribers[symbol]
	for i, subscriber := range subscribers {
		if subscriber == ch {
			wsc.subscribers[symbol] = append(subscribers[:i], subscribers[i+1:]...)
			break
		}
	}
}

// handleMessages handles incoming WebSocket messages
func (wsc *WebSocketClient) handleMessages(symbol string, conn *websocket.Conn) {
	defer func() {
		wsc.mu.Lock()
		delete(wsc.connections, symbol)
		delete(wsc.subscribers, symbol)
		wsc.mu.Unlock()
		conn.Close()
	}()

	for {
		var tickerData models.BinanceStreamTickerData
		err := conn.ReadJSON(&tickerData)
		if err != nil {
			wsc.logger.WithFields(map[string]interface{}{
				"symbol": symbol,
				"error":  err.Error(),
			}).Error("WebSocket read error")
			break
		}

		// Create live ticker
		ticker := models.LiveTicker{
			Type:   "ticker",
			Symbol: symbol,
			Price:  tickerData.Data.C,
			Volume: tickerData.Data.V,
			Change: tickerData.Data.P,
		}

		// Notify subscribers
		wsc.mu.RLock()
		subscribers := wsc.subscribers[symbol]
		for _, ch := range subscribers {
			select {
			case ch <- ticker:
			default:
				// Channel is full, skip
			}
		}
		wsc.mu.RUnlock()
	}
}

// Close closes all WebSocket connections
func (wsc *WebSocketClient) Close() error {
	wsc.mu.Lock()
	defer wsc.mu.Unlock()

	for symbol, conn := range wsc.connections {
		conn.Close()
		wsc.logger.WithFields(map[string]interface{}{
			"symbol": symbol,
		}).Info("Closed WebSocket connection")
	}

	wsc.connections = make(map[string]*websocket.Conn)
	wsc.subscribers = make(map[string][]chan models.LiveTicker)

	return nil
}

// HealthCheck performs a health check on the Binance API
func (c *Client) HealthCheck(ctx context.Context) error {
	if !c.rateLimiter.Allow() {
		return fmt.Errorf("rate limit exceeded")
	}

	url := c.config.APIBaseURL + "/api/v3/ping"

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return fmt.Errorf("failed to create health check request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("health check failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("health check failed: status=%d", resp.StatusCode)
	}

	return nil
}
