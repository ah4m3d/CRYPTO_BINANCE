package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"trading-engine/logger"
	"trading-engine/models"

	"github.com/go-redis/redis/v8"
)

// Client wraps redis client with trading-specific methods
type Client struct {
	rdb    *redis.Client
	logger *logger.Logger
}

// Config holds cache configuration
type Config struct {
	Host     string
	Port     int
	Password string
	DB       int
}

// NewClient creates a new cache client
func NewClient(config *Config, log *logger.Logger) (*Client, error) {
	rdb := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%d", config.Host, config.Port),
		Password: config.Password,
		DB:       config.DB,
	})

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := rdb.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	log.Info("Connected to Redis cache")

	return &Client{
		rdb:    rdb,
		logger: log,
	}, nil
}

// Close closes the Redis connection
func (c *Client) Close() error {
	return c.rdb.Close()
}

// SetPrice caches a price for a symbol
func (c *Client) SetPrice(ctx context.Context, symbol string, price float64) error {
	key := fmt.Sprintf("price:%s", symbol)

	data := map[string]interface{}{
		"price":     price,
		"timestamp": time.Now().Unix(),
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal price data: %w", err)
	}

	err = c.rdb.Set(ctx, key, jsonData, 30*time.Second).Err()
	if err != nil {
		c.logger.Error("Failed to cache price for %s: %v", symbol, err)
		return err
	}

	return nil
}

// GetPrice retrieves a cached price for a symbol
func (c *Client) GetPrice(ctx context.Context, symbol string) (float64, bool, error) {
	key := fmt.Sprintf("price:%s", symbol)

	val, err := c.rdb.Get(ctx, key).Result()
	if err == redis.Nil {
		return 0, false, nil
	}
	if err != nil {
		c.logger.Error("Failed to get cached price for %s: %v", symbol, err)
		return 0, false, err
	}

	var data map[string]interface{}
	if err := json.Unmarshal([]byte(val), &data); err != nil {
		return 0, false, fmt.Errorf("failed to unmarshal price data: %w", err)
	}

	price, ok := data["price"].(float64)
	if !ok {
		return 0, false, fmt.Errorf("invalid price data format")
	}

	return price, true, nil
}

// SetTechnicalAnalysis caches technical analysis for a symbol
func (c *Client) SetTechnicalAnalysis(ctx context.Context, symbol string, analysis *models.TechnicalAnalysis) error {
	key := fmt.Sprintf("technical:%s", symbol)

	data := map[string]interface{}{
		"analysis":  analysis,
		"timestamp": time.Now().Unix(),
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal technical analysis: %w", err)
	}

	err = c.rdb.Set(ctx, key, jsonData, 60*time.Second).Err()
	if err != nil {
		c.logger.Error("Failed to cache technical analysis for %s: %v", symbol, err)
		return err
	}

	return nil
}

// GetTechnicalAnalysis retrieves cached technical analysis for a symbol
func (c *Client) GetTechnicalAnalysis(ctx context.Context, symbol string) (*models.TechnicalAnalysis, bool, error) {
	key := fmt.Sprintf("technical:%s", symbol)

	val, err := c.rdb.Get(ctx, key).Result()
	if err == redis.Nil {
		return nil, false, nil
	}
	if err != nil {
		c.logger.Error("Failed to get cached technical analysis for %s: %v", symbol, err)
		return nil, false, err
	}

	var data map[string]interface{}
	if err := json.Unmarshal([]byte(val), &data); err != nil {
		return nil, false, fmt.Errorf("failed to unmarshal technical analysis: %w", err)
	}

	analysisBytes, err := json.Marshal(data["analysis"])
	if err != nil {
		return nil, false, fmt.Errorf("failed to marshal analysis field: %w", err)
	}

	var analysis models.TechnicalAnalysis
	if err := json.Unmarshal(analysisBytes, &analysis); err != nil {
		return nil, false, fmt.Errorf("failed to unmarshal technical analysis: %w", err)
	}

	return &analysis, true, nil
}

// SetCandles caches historical candles for a symbol
func (c *Client) SetCandles(ctx context.Context, symbol string, candles []models.Candle) error {
	key := fmt.Sprintf("candles:%s", symbol)

	data := map[string]interface{}{
		"candles":   candles,
		"timestamp": time.Now().Unix(),
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal candles: %w", err)
	}

	// Cache for 5 minutes
	err = c.rdb.Set(ctx, key, jsonData, 5*time.Minute).Err()
	if err != nil {
		c.logger.Error("Failed to cache candles for %s: %v", symbol, err)
		return err
	}

	return nil
}

// GetCandles retrieves cached candles for a symbol
func (c *Client) GetCandles(ctx context.Context, symbol string) ([]models.Candle, bool, error) {
	key := fmt.Sprintf("candles:%s", symbol)

	val, err := c.rdb.Get(ctx, key).Result()
	if err == redis.Nil {
		return nil, false, nil
	}
	if err != nil {
		c.logger.Error("Failed to get cached candles for %s: %v", symbol, err)
		return nil, false, err
	}

	var data map[string]interface{}
	if err := json.Unmarshal([]byte(val), &data); err != nil {
		return nil, false, fmt.Errorf("failed to unmarshal candles data: %w", err)
	}

	candlesBytes, err := json.Marshal(data["candles"])
	if err != nil {
		return nil, false, fmt.Errorf("failed to marshal candles field: %w", err)
	}

	var candles []models.Candle
	if err := json.Unmarshal(candlesBytes, &candles); err != nil {
		return nil, false, fmt.Errorf("failed to unmarshal candles: %w", err)
	}

	return candles, true, nil
}

// SetTradingState caches the current trading state
func (c *Client) SetTradingState(ctx context.Context, state *models.TradingState) error {
	key := "trading:state"

	data := map[string]interface{}{
		"state":     state,
		"timestamp": time.Now().Unix(),
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal trading state: %w", err)
	}

	err = c.rdb.Set(ctx, key, jsonData, 10*time.Second).Err()
	if err != nil {
		c.logger.Error("Failed to cache trading state: %v", err)
		return err
	}

	return nil
}

// GetTradingState retrieves cached trading state
func (c *Client) GetTradingState(ctx context.Context) (*models.TradingState, bool, error) {
	key := "trading:state"

	val, err := c.rdb.Get(ctx, key).Result()
	if err == redis.Nil {
		return nil, false, nil
	}
	if err != nil {
		c.logger.Error("Failed to get cached trading state: %v", err)
		return nil, false, err
	}

	var data map[string]interface{}
	if err := json.Unmarshal([]byte(val), &data); err != nil {
		return nil, false, fmt.Errorf("failed to unmarshal trading state data: %w", err)
	}

	stateBytes, err := json.Marshal(data["state"])
	if err != nil {
		return nil, false, fmt.Errorf("failed to marshal state field: %w", err)
	}

	var state models.TradingState
	if err := json.Unmarshal(stateBytes, &state); err != nil {
		return nil, false, fmt.Errorf("failed to unmarshal trading state: %w", err)
	}

	return &state, true, nil
}

// IncrementCounter increments a counter (useful for rate limiting)
func (c *Client) IncrementCounter(ctx context.Context, key string, expiration time.Duration) (int64, error) {
	pipe := c.rdb.TxPipeline()

	// Increment the counter
	incr := pipe.Incr(ctx, key)

	// Set expiration on first increment
	pipe.Expire(ctx, key, expiration)

	_, err := pipe.Exec(ctx)
	if err != nil {
		return 0, err
	}

	return incr.Val(), nil
}

// GetCounter gets the current value of a counter
func (c *Client) GetCounter(ctx context.Context, key string) (int64, error) {
	val, err := c.rdb.Get(ctx, key).Int64()
	if err == redis.Nil {
		return 0, nil
	}
	return val, err
}

// SetRateLimit sets a rate limit counter
func (c *Client) SetRateLimit(ctx context.Context, key string, limit int64, window time.Duration) error {
	current, err := c.IncrementCounter(ctx, key, window)
	if err != nil {
		return err
	}

	if current > limit {
		return fmt.Errorf("rate limit exceeded: %d/%d", current, limit)
	}

	return nil
}

// CheckRateLimit checks if a rate limit is exceeded
func (c *Client) CheckRateLimit(ctx context.Context, key string, limit int64) (bool, int64, error) {
	current, err := c.GetCounter(ctx, key)
	if err != nil {
		return false, 0, err
	}

	exceeded := current >= limit
	remaining := limit - current
	if remaining < 0 {
		remaining = 0
	}

	return exceeded, remaining, nil
}

// SetSystemMetrics caches system performance metrics
func (c *Client) SetSystemMetrics(ctx context.Context, metrics map[string]interface{}) error {
	key := "system:metrics"

	data := map[string]interface{}{
		"metrics":   metrics,
		"timestamp": time.Now().Unix(),
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal system metrics: %w", err)
	}

	err = c.rdb.Set(ctx, key, jsonData, 60*time.Second).Err()
	if err != nil {
		c.logger.Error("Failed to cache system metrics: %v", err)
		return err
	}

	return nil
}

// GetSystemMetrics retrieves cached system metrics
func (c *Client) GetSystemMetrics(ctx context.Context) (map[string]interface{}, bool, error) {
	key := "system:metrics"

	val, err := c.rdb.Get(ctx, key).Result()
	if err == redis.Nil {
		return nil, false, nil
	}
	if err != nil {
		c.logger.Error("Failed to get cached system metrics: %v", err)
		return nil, false, err
	}

	var data map[string]interface{}
	if err := json.Unmarshal([]byte(val), &data); err != nil {
		return nil, false, fmt.Errorf("failed to unmarshal system metrics: %w", err)
	}

	metrics, ok := data["metrics"].(map[string]interface{})
	if !ok {
		return nil, false, fmt.Errorf("invalid metrics data format")
	}

	return metrics, true, nil
}

// InvalidatePattern removes all keys matching a pattern
func (c *Client) InvalidatePattern(ctx context.Context, pattern string) error {
	keys, err := c.rdb.Keys(ctx, pattern).Result()
	if err != nil {
		return err
	}

	if len(keys) == 0 {
		return nil
	}

	err = c.rdb.Del(ctx, keys...).Err()
	if err != nil {
		c.logger.Error("Failed to delete keys matching pattern %s: %v", pattern, err)
		return err
	}

	c.logger.Debug("Invalidated %d keys matching pattern: %s", len(keys), pattern)
	return nil
}

// FlushAll removes all cached data (use with caution)
func (c *Client) FlushAll(ctx context.Context) error {
	err := c.rdb.FlushAll(ctx).Err()
	if err != nil {
		c.logger.Error("Failed to flush all cache data: %v", err)
		return err
	}

	c.logger.Info("All cache data flushed")
	return nil
}

// GetStats returns cache statistics
func (c *Client) GetStats(ctx context.Context) (map[string]interface{}, error) {
	info, err := c.rdb.Info(ctx).Result()
	if err != nil {
		return nil, err
	}

	stats := make(map[string]interface{})
	stats["info"] = info
	stats["timestamp"] = time.Now().Unix()

	return stats, nil
}
