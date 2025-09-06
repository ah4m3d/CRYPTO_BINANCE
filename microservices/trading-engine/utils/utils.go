package utils

import (
	"context"
	"fmt"
	"math"
	"strconv"
	"time"
)

// ParseFloat safely parses a string to float64 with error handling
func ParseFloat(s string) (float64, error) {
	if s == "" {
		return 0, nil
	}
	return strconv.ParseFloat(s, 64)
}

// ParseInt safely parses a string to int64 with error handling
func ParseInt(s string) (int64, error) {
	if s == "" {
		return 0, nil
	}
	return strconv.ParseInt(s, 10, 64)
}

// SafeDivide performs division with zero check
func SafeDivide(numerator, denominator float64) float64 {
	if denominator == 0 {
		return 0
	}
	return numerator / denominator
}

// RoundToDecimals rounds a float64 to specified decimal places
func RoundToDecimals(value float64, decimals int) float64 {
	multiplier := math.Pow(10, float64(decimals))
	return math.Round(value*multiplier) / multiplier
}

// CalculatePercentageChange calculates percentage change between two values
func CalculatePercentageChange(oldValue, newValue float64) float64 {
	if oldValue == 0 {
		return 0
	}
	return ((newValue - oldValue) / oldValue) * 100
}

// MinFloat64 returns the minimum of two float64 values
func MinFloat64(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}

// MaxFloat64 returns the maximum of two float64 values
func MaxFloat64(a, b float64) float64 {
	if a > b {
		return a
	}
	return b
}

// ClampFloat64 clamps a value between min and max
func ClampFloat64(value, min, max float64) float64 {
	if value < min {
		return min
	}
	if value > max {
		return max
	}
	return value
}

// IsValidSymbol checks if a trading symbol is valid
func IsValidSymbol(symbol string) bool {
	if len(symbol) < 3 || len(symbol) > 20 {
		return false
	}

	// Check if symbol contains only alphanumeric characters
	for _, char := range symbol {
		if !((char >= 'A' && char <= 'Z') || (char >= '0' && char <= '9')) {
			return false
		}
	}
	return true
}

// GenerateTradeID generates a unique trade ID
func GenerateTradeID(symbol string) string {
	return fmt.Sprintf("%s_%d", symbol, time.Now().UnixNano())
}

// TimeoutContext creates a context with timeout
func TimeoutContext(timeout time.Duration) (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), timeout)
}

// RetryWithBackoff executes a function with exponential backoff retry
func RetryWithBackoff(ctx context.Context, maxRetries int, baseDelay time.Duration, fn func() error) error {
	var err error
	for i := 0; i < maxRetries; i++ {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		err = fn()
		if err == nil {
			return nil
		}

		if i == maxRetries-1 {
			break
		}

		// Exponential backoff with jitter
		delay := time.Duration(float64(baseDelay) * math.Pow(2, float64(i)))
		jitter := time.Duration(float64(delay) * 0.1 * float64(2*time.Now().UnixNano()%2-1))

		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(delay + jitter):
		}
	}
	return err
}

// ValidatePositionSize validates if position size is within limits
func ValidatePositionSize(size, maxSize, availableBalance float64) error {
	if size <= 0 {
		return fmt.Errorf("position size must be positive")
	}
	if size > maxSize {
		return fmt.Errorf("position size %.2f exceeds maximum allowed size %.2f", size, maxSize)
	}
	if size > availableBalance {
		return fmt.Errorf("position size %.2f exceeds available balance %.2f", size, availableBalance)
	}
	return nil
}

// ValidateRiskParameters validates trading risk parameters
func ValidateRiskParameters(riskPct, stopLossPct, takeProfitPct float64) error {
	if riskPct <= 0 || riskPct > 100 {
		return fmt.Errorf("risk percentage must be between 0 and 100")
	}
	if stopLossPct <= 0 || stopLossPct > 50 {
		return fmt.Errorf("stop loss percentage must be between 0 and 50")
	}
	if takeProfitPct <= 0 || takeProfitPct > 100 {
		return fmt.Errorf("take profit percentage must be between 0 and 100")
	}
	if takeProfitPct <= stopLossPct {
		return fmt.Errorf("take profit (%.2f%%) must be greater than stop loss (%.2f%%)", takeProfitPct, stopLossPct)
	}
	return nil
}

// CalculatePositionSize calculates optimal position size based on risk
func CalculatePositionSize(balance, riskPct, stopLossPct float64) float64 {
	riskAmount := balance * (riskPct / 100)
	return riskAmount / (stopLossPct / 100)
}

// CalculateStopLoss calculates stop loss price
func CalculateStopLoss(entryPrice, stopLossPct float64, isLong bool) float64 {
	if isLong {
		return entryPrice * (1 - stopLossPct/100)
	}
	return entryPrice * (1 + stopLossPct/100)
}

// CalculateTakeProfit calculates take profit price
func CalculateTakeProfit(entryPrice, takeProfitPct float64, isLong bool) float64 {
	if isLong {
		return entryPrice * (1 + takeProfitPct/100)
	}
	return entryPrice * (1 - takeProfitPct/100)
}

// CalculatePnL calculates profit and loss for a position
func CalculatePnL(entryPrice, currentPrice, quantity float64, isLong bool) float64 {
	if isLong {
		return (currentPrice - entryPrice) * quantity
	}
	return (entryPrice - currentPrice) * quantity
}

// IsMarketOpen checks if the market is currently open (crypto is 24/7)
func IsMarketOpen() bool {
	return true // Crypto markets are always open
}

// GetTradingSession returns the current trading session
func GetTradingSession() string {
	now := time.Now().UTC()
	hour := now.Hour()

	switch {
	case hour >= 0 && hour < 8:
		return "ASIA"
	case hour >= 8 && hour < 16:
		return "EUROPE"
	case hour >= 16 && hour < 24:
		return "US"
	default:
		return "OVERLAP"
	}
}

// FormatCurrency formats a float64 as currency string
func FormatCurrency(amount float64) string {
	return fmt.Sprintf("$%.2f", amount)
}

// FormatPercentage formats a float64 as percentage string
func FormatPercentage(pct float64) string {
	sign := ""
	if pct > 0 {
		sign = "+"
	}
	return fmt.Sprintf("%s%.2f%%", sign, pct)
}

// IsWeekend checks if current time is weekend (not relevant for crypto but useful for logging)
func IsWeekend() bool {
	weekday := time.Now().Weekday()
	return weekday == time.Saturday || weekday == time.Sunday
}

// TruncateString truncates a string to specified length
func TruncateString(s string, length int) string {
	if len(s) <= length {
		return s
	}
	return s[:length] + "..."
}

// Contains checks if a slice contains a specific string
func Contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

// RemoveFromSlice removes an item from a slice
func RemoveFromSlice(slice []string, item string) []string {
	for i, s := range slice {
		if s == item {
			return append(slice[:i], slice[i+1:]...)
		}
	}
	return slice
}

// CalculateVolatility calculates simple volatility from price data
func CalculateVolatility(prices []float64) float64 {
	if len(prices) < 2 {
		return 0
	}

	// Calculate returns
	returns := make([]float64, len(prices)-1)
	for i := 1; i < len(prices); i++ {
		returns[i-1] = (prices[i] - prices[i-1]) / prices[i-1]
	}

	// Calculate mean
	var sum float64
	for _, ret := range returns {
		sum += ret
	}
	mean := sum / float64(len(returns))

	// Calculate variance
	var variance float64
	for _, ret := range returns {
		variance += math.Pow(ret-mean, 2)
	}
	variance /= float64(len(returns))

	// Return standard deviation (volatility)
	return math.Sqrt(variance)
}
