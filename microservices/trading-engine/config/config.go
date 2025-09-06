package config

import (
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

// Config holds all application configuration
type Config struct {
	Server   ServerConfig   `json:"server"`
	Binance  BinanceConfig  `json:"binance"`
	Trading  TradingConfig  `json:"trading"`
	Database DatabaseConfig `json:"database"`
	Redis    RedisConfig    `json:"redis"`
}

type ServerConfig struct {
	Port            string        `json:"port"`
	ReadTimeout     time.Duration `json:"read_timeout"`
	WriteTimeout    time.Duration `json:"write_timeout"`
	ShutdownTimeout time.Duration `json:"shutdown_timeout"`
	Environment     string        `json:"environment"`
}

type BinanceConfig struct {
	APIKey        string        `json:"api_key"`
	SecretKey     string        `json:"secret_key"`
	IsTestnet     bool          `json:"is_testnet"`
	WSURL         string        `json:"ws_url"`
	APIBaseURL    string        `json:"api_base_url"`
	RateLimit     int           `json:"rate_limit"`
	RetryAttempts int           `json:"retry_attempts"`
	RetryDelay    time.Duration `json:"retry_delay"`
}

type TradingConfig struct {
	MaxPositions     int     `json:"max_positions"`
	DefaultRiskPct   float64 `json:"default_risk_pct"`
	MaxDailyLoss     float64 `json:"max_daily_loss"`
	PositionTimeout  int     `json:"position_timeout_minutes"`
	SignalBufferSize int     `json:"signal_buffer_size"`
	PriceBufferSize  int     `json:"price_buffer_size"`
	TechnicalPeriods struct {
		RSI    int `json:"rsi"`
		EMA9   int `json:"ema9"`
		EMA21  int `json:"ema21"`
		EMA50  int `json:"ema50"`
		EMA200 int `json:"ema200"`
	} `json:"technical_periods"`
}

type DatabaseConfig struct {
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Name     string `json:"name"`
	User     string `json:"user"`
	Password string `json:"password"`
	SSLMode  string `json:"ssl_mode"`
}

type RedisConfig struct {
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Password string `json:"password"`
	DB       int    `json:"db"`
}

// LoadConfig loads configuration from environment variables and .env file
func LoadConfig() (*Config, error) {
	// Load .env file if it exists
	if err := godotenv.Load("../../.env"); err != nil {
		log.Printf("Warning: .env file not found, using environment variables")
	}

	config := &Config{}

	// Server configuration
	config.Server = ServerConfig{
		Port:            getEnvOrDefault("PORT", "8080"),
		ReadTimeout:     getEnvDurationOrDefault("READ_TIMEOUT", 10*time.Second),
		WriteTimeout:    getEnvDurationOrDefault("WRITE_TIMEOUT", 10*time.Second),
		ShutdownTimeout: getEnvDurationOrDefault("SHUTDOWN_TIMEOUT", 30*time.Second),
		Environment:     getEnvOrDefault("ENVIRONMENT", "development"),
	}

	// Binance configuration
	isTestnet := strings.ToLower(os.Getenv("BINANCE_TESTNET")) == "true"
	config.Binance = BinanceConfig{
		APIKey:        os.Getenv("BINANCE_API_KEY"),
		SecretKey:     os.Getenv("BINANCE_SECRET_KEY"),
		IsTestnet:     isTestnet,
		RateLimit:     getEnvIntOrDefault("BINANCE_RATE_LIMIT", 1200),
		RetryAttempts: getEnvIntOrDefault("BINANCE_RETRY_ATTEMPTS", 3),
		RetryDelay:    getEnvDurationOrDefault("BINANCE_RETRY_DELAY", 1*time.Second),
	}

	if isTestnet {
		config.Binance.WSURL = getEnvOrDefault("BINANCE_TESTNET_WS_URL", "wss://testnet.binance.vision/ws")
		config.Binance.APIBaseURL = getEnvOrDefault("BINANCE_TESTNET_API_URL", "https://testnet.binance.vision")
		log.Println("🧪 Using Binance Testnet")
	} else {
		config.Binance.WSURL = getEnvOrDefault("BINANCE_WS_URL", "wss://stream.binance.com:9443/ws")
		config.Binance.APIBaseURL = getEnvOrDefault("BINANCE_API_URL", "https://api.binance.com")
		log.Println("🔴 Using Binance Live Network")
	}

	// Trading configuration
	config.Trading = TradingConfig{
		MaxPositions:     getEnvIntOrDefault("MAX_POSITIONS", 5),
		DefaultRiskPct:   getEnvFloatOrDefault("DEFAULT_RISK_PCT", 2.0),
		MaxDailyLoss:     getEnvFloatOrDefault("MAX_DAILY_LOSS", 2500.0),
		PositionTimeout:  getEnvIntOrDefault("POSITION_TIMEOUT_MINUTES", 30),
		SignalBufferSize: getEnvIntOrDefault("SIGNAL_BUFFER_SIZE", 1000),
		PriceBufferSize:  getEnvIntOrDefault("PRICE_BUFFER_SIZE", 1000),
	}

	config.Trading.TechnicalPeriods.RSI = getEnvIntOrDefault("RSI_PERIOD", 14)
	config.Trading.TechnicalPeriods.EMA9 = getEnvIntOrDefault("EMA9_PERIOD", 9)
	config.Trading.TechnicalPeriods.EMA21 = getEnvIntOrDefault("EMA21_PERIOD", 21)
	config.Trading.TechnicalPeriods.EMA50 = getEnvIntOrDefault("EMA50_PERIOD", 50)
	config.Trading.TechnicalPeriods.EMA200 = getEnvIntOrDefault("EMA200_PERIOD", 200)

	// Database configuration (optional)
	config.Database = DatabaseConfig{
		Host:     getEnvOrDefault("DB_HOST", "localhost"),
		Port:     getEnvIntOrDefault("DB_PORT", 5432),
		Name:     getEnvOrDefault("DB_NAME", "trading_engine"),
		User:     getEnvOrDefault("DB_USER", "postgres"),
		Password: os.Getenv("DB_PASSWORD"),
		SSLMode:  getEnvOrDefault("DB_SSL_MODE", "disable"),
	}

	// Redis configuration (optional)
	config.Redis = RedisConfig{
		Host:     getEnvOrDefault("REDIS_HOST", "localhost"),
		Port:     getEnvIntOrDefault("REDIS_PORT", 6379),
		Password: os.Getenv("REDIS_PASSWORD"),
		DB:       getEnvIntOrDefault("REDIS_DB", 0),
	}

	// Validate required fields
	if err := config.Validate(); err != nil {
		return nil, fmt.Errorf("configuration validation failed: %w", err)
	}

	return config, nil
}

// Validate checks if all required configuration is present
func (c *Config) Validate() error {
	if c.Binance.APIKey == "" {
		return fmt.Errorf("BINANCE_API_KEY is required")
	}
	if c.Binance.SecretKey == "" {
		return fmt.Errorf("BINANCE_SECRET_KEY is required")
	}
	if c.Trading.MaxPositions <= 0 {
		return fmt.Errorf("MAX_POSITIONS must be greater than 0")
	}
	if c.Trading.DefaultRiskPct <= 0 || c.Trading.DefaultRiskPct > 100 {
		return fmt.Errorf("DEFAULT_RISK_PCT must be between 0 and 100")
	}
	return nil
}

// Helper functions
func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvIntOrDefault(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func getEnvFloatOrDefault(key string, defaultValue float64) float64 {
	if value := os.Getenv(key); value != "" {
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			return floatValue
		}
	}
	return defaultValue
}

func getEnvDurationOrDefault(key string, defaultValue time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		if duration, err := time.ParseDuration(value); err == nil {
			return duration
		}
	}
	return defaultValue
}
