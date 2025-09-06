package database

import (
	"database/sql"
	"fmt"
	"time"

	"trading-engine/logger"
	"trading-engine/models"

	_ "github.com/lib/pq"
)

// DB wraps database connection with trading-specific methods
type DB struct {
	conn   *sql.DB
	logger *logger.Logger
}

// Config holds database configuration
type Config struct {
	Host     string
	Port     int
	User     string
	Password string
	DBName   string
	SSLMode  string
}

// NewDB creates a new database connection
func NewDB(config *Config, log *logger.Logger) (*DB, error) {
	dsn := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		config.Host, config.Port, config.User, config.Password, config.DBName, config.SSLMode)

	conn, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open database connection: %w", err)
	}

	// Test connection
	if err := conn.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	// Set connection pool settings
	conn.SetMaxOpenConns(25)
	conn.SetMaxIdleConns(5)
	conn.SetConnMaxLifetime(5 * time.Minute)

	db := &DB{
		conn:   conn,
		logger: log,
	}

	// Initialize database schema
	if err := db.InitSchema(); err != nil {
		return nil, fmt.Errorf("failed to initialize database schema: %w", err)
	}

	log.Info("Connected to PostgreSQL database")
	return db, nil
}

// Close closes the database connection
func (db *DB) Close() error {
	return db.conn.Close()
}

// InitSchema creates the database tables if they don't exist
func (db *DB) InitSchema() error {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS trades (
			id VARCHAR(50) PRIMARY KEY,
			symbol VARCHAR(20) NOT NULL,
			type VARCHAR(10) NOT NULL,
			price DECIMAL(20,8) NOT NULL,
			quantity DECIMAL(20,8) NOT NULL,
			timestamp TIMESTAMP NOT NULL,
			signal VARCHAR(20),
			confidence INTEGER,
			pnl DECIMAL(20,8),
			exit_price DECIMAL(20,8),
			hold_time INTEGER,
			created_at TIMESTAMP DEFAULT NOW()
		)`,

		`CREATE TABLE IF NOT EXISTS positions (
			id VARCHAR(50) PRIMARY KEY,
			symbol VARCHAR(20) NOT NULL,
			quantity DECIMAL(20,8) NOT NULL,
			avg_buy_price DECIMAL(20,8) NOT NULL,
			current_value DECIMAL(20,8) NOT NULL,
			unrealized_pnl DECIMAL(20,8) NOT NULL DEFAULT 0,
			entry_time TIMESTAMP NOT NULL,
			target_price DECIMAL(20,8),
			stop_loss_price DECIMAL(20,8),
			is_active BOOLEAN DEFAULT TRUE,
			created_at TIMESTAMP DEFAULT NOW(),
			updated_at TIMESTAMP DEFAULT NOW()
		)`,

		`CREATE TABLE IF NOT EXISTS market_data (
			id SERIAL PRIMARY KEY,
			symbol VARCHAR(20) NOT NULL,
			price DECIMAL(20,8) NOT NULL,
			volume DECIMAL(20,8) NOT NULL,
			timestamp TIMESTAMP NOT NULL,
			timeframe VARCHAR(10) NOT NULL,
			open_price DECIMAL(20,8),
			high_price DECIMAL(20,8),
			low_price DECIMAL(20,8),
			close_price DECIMAL(20,8),
			created_at TIMESTAMP DEFAULT NOW()
		)`,

		`CREATE TABLE IF NOT EXISTS technical_analysis (
			id SERIAL PRIMARY KEY,
			symbol VARCHAR(20) NOT NULL,
			ema9 DECIMAL(20,8),
			ema21 DECIMAL(20,8),
			ema50 DECIMAL(20,8),
			ema200 DECIMAL(20,8),
			rsi DECIMAL(10,4),
			macd DECIMAL(20,8),
			vwap DECIMAL(20,8),
			ma50 DECIMAL(20,8),
			signal VARCHAR(20),
			confidence INTEGER,
			timestamp TIMESTAMP NOT NULL,
			created_at TIMESTAMP DEFAULT NOW()
		)`,

		`CREATE TABLE IF NOT EXISTS trading_settings (
			id SERIAL PRIMARY KEY,
			min_confidence INTEGER NOT NULL,
			max_position_size DECIMAL(20,8) NOT NULL,
			risk_per_trade DECIMAL(10,4) NOT NULL,
			max_daily_loss DECIMAL(20,8) NOT NULL,
			max_positions INTEGER NOT NULL,
			stop_loss_percent DECIMAL(10,4) NOT NULL,
			take_profit_percent DECIMAL(10,4) NOT NULL,
			max_hold_time INTEGER NOT NULL,
			scaling_factor INTEGER NOT NULL DEFAULT 1,
			is_enabled BOOLEAN DEFAULT FALSE,
			created_at TIMESTAMP DEFAULT NOW(),
			updated_at TIMESTAMP DEFAULT NOW()
		)`,

		`CREATE TABLE IF NOT EXISTS watchlist (
			id SERIAL PRIMARY KEY,
			symbol VARCHAR(20) NOT NULL UNIQUE,
			name VARCHAR(100) NOT NULL,
			is_active BOOLEAN DEFAULT TRUE,
			price DECIMAL(20,8),
			last_update TIMESTAMP,
			created_at TIMESTAMP DEFAULT NOW()
		)`,

		`CREATE TABLE IF NOT EXISTS performance_metrics (
			id SERIAL PRIMARY KEY,
			date DATE NOT NULL,
			total_trades INTEGER DEFAULT 0,
			winning_trades INTEGER DEFAULT 0,
			losing_trades INTEGER DEFAULT 0,
			total_pnl DECIMAL(20,8) DEFAULT 0,
			day_pnl DECIMAL(20,8) DEFAULT 0,
			win_rate DECIMAL(10,4) DEFAULT 0,
			avg_trade_duration INTEGER DEFAULT 0,
			max_drawdown DECIMAL(20,8) DEFAULT 0,
			created_at TIMESTAMP DEFAULT NOW()
		)`,
	}

	for _, query := range queries {
		if _, err := db.conn.Exec(query); err != nil {
			return fmt.Errorf("failed to execute schema query: %w", err)
		}
	}

	// Create indexes for better performance
	indexes := []string{
		`CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol)`,
		`CREATE INDEX IF NOT EXISTS idx_trades_timestamp ON trades(timestamp)`,
		`CREATE INDEX IF NOT EXISTS idx_positions_symbol ON positions(symbol)`,
		`CREATE INDEX IF NOT EXISTS idx_positions_active ON positions(is_active)`,
		`CREATE INDEX IF NOT EXISTS idx_market_data_symbol_timestamp ON market_data(symbol, timestamp)`,
		`CREATE INDEX IF NOT EXISTS idx_technical_analysis_symbol_timestamp ON technical_analysis(symbol, timestamp)`,
		`CREATE INDEX IF NOT EXISTS idx_performance_metrics_date ON performance_metrics(date)`,
	}

	for _, index := range indexes {
		if _, err := db.conn.Exec(index); err != nil {
			db.logger.Warn("Failed to create index: %v", err)
		}
	}

	db.logger.Info("Database schema initialized successfully")
	return nil
}

// SaveTrade saves a trade to the database
func (db *DB) SaveTrade(trade *models.Trade) error {
	query := `
		INSERT INTO trades (id, symbol, type, price, quantity, timestamp, signal, confidence, pnl, exit_price, hold_time)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		ON CONFLICT (id) DO UPDATE SET
			pnl = EXCLUDED.pnl,
			exit_price = EXCLUDED.exit_price,
			hold_time = EXCLUDED.hold_time
	`

	_, err := db.conn.Exec(query,
		trade.ID, trade.Symbol, trade.Type, trade.Price, trade.Quantity,
		trade.Timestamp, trade.Signal, trade.Confidence,
		trade.PnL, trade.ExitPrice, trade.HoldTime)

	if err != nil {
		db.logger.Error("Failed to save trade %s: %v", trade.ID, err)
		return err
	}

	return nil
}

// GetTrades retrieves trades from the database
func (db *DB) GetTrades(symbol string, limit int) ([]models.Trade, error) {
	var query string
	var args []interface{}

	if symbol != "" {
		query = `
			SELECT id, symbol, type, price, quantity, timestamp, signal, confidence, 
				   COALESCE(pnl, 0), COALESCE(exit_price, 0), COALESCE(hold_time, 0)
			FROM trades 
			WHERE symbol = $1 
			ORDER BY timestamp DESC 
			LIMIT $2
		`
		args = []interface{}{symbol, limit}
	} else {
		query = `
			SELECT id, symbol, type, price, quantity, timestamp, signal, confidence,
				   COALESCE(pnl, 0), COALESCE(exit_price, 0), COALESCE(hold_time, 0)
			FROM trades 
			ORDER BY timestamp DESC 
			LIMIT $1
		`
		args = []interface{}{limit}
	}

	rows, err := db.conn.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var trades []models.Trade
	for rows.Next() {
		var trade models.Trade
		var pnl, exitPrice float64
		var holdTime int

		err := rows.Scan(
			&trade.ID, &trade.Symbol, &trade.Type, &trade.Price, &trade.Quantity,
			&trade.Timestamp, &trade.Signal, &trade.Confidence,
			&pnl, &exitPrice, &holdTime)

		if err != nil {
			return nil, err
		}

		if pnl != 0 {
			trade.PnL = &pnl
		}
		if exitPrice != 0 {
			trade.ExitPrice = &exitPrice
		}
		if holdTime != 0 {
			trade.HoldTime = &holdTime
		}

		trades = append(trades, trade)
	}

	return trades, nil
}

// SavePosition saves a position to the database
func (db *DB) SavePosition(position *models.Position) error {
	query := `
		INSERT INTO positions (id, symbol, quantity, avg_buy_price, current_value, unrealized_pnl, 
							   entry_time, target_price, stop_loss_price, is_active, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
		ON CONFLICT (id) DO UPDATE SET
			current_value = EXCLUDED.current_value,
			unrealized_pnl = EXCLUDED.unrealized_pnl,
			target_price = EXCLUDED.target_price,
			stop_loss_price = EXCLUDED.stop_loss_price,
			is_active = EXCLUDED.is_active,
			updated_at = NOW()
	`

	_, err := db.conn.Exec(query,
		position.ID, position.Symbol, position.Quantity, position.AvgBuyPrice,
		position.CurrentValue, position.UnrealizedPnL, position.EntryTime,
		position.TargetPrice, position.StopLossPrice, true)

	if err != nil {
		db.logger.Error("Failed to save position %s: %v", position.ID, err)
		return err
	}

	return nil
}

// GetActivePositions retrieves active positions from the database
func (db *DB) GetActivePositions() ([]models.Position, error) {
	query := `
		SELECT id, symbol, quantity, avg_buy_price, current_value, unrealized_pnl,
			   entry_time, target_price, stop_loss_price
		FROM positions 
		WHERE is_active = TRUE
		ORDER BY entry_time DESC
	`

	rows, err := db.conn.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var positions []models.Position
	for rows.Next() {
		var position models.Position
		var targetPrice, stopLossPrice sql.NullFloat64

		err := rows.Scan(
			&position.ID, &position.Symbol, &position.Quantity, &position.AvgBuyPrice,
			&position.CurrentValue, &position.UnrealizedPnL, &position.EntryTime,
			&targetPrice, &stopLossPrice)

		if err != nil {
			return nil, err
		}

		if targetPrice.Valid {
			position.TargetPrice = &targetPrice.Float64
		}
		if stopLossPrice.Valid {
			position.StopLossPrice = &stopLossPrice.Float64
		}

		positions = append(positions, position)
	}

	return positions, nil
}

// ClosePosition marks a position as inactive
func (db *DB) ClosePosition(positionID string) error {
	query := `UPDATE positions SET is_active = FALSE, updated_at = NOW() WHERE id = $1`

	_, err := db.conn.Exec(query, positionID)
	if err != nil {
		db.logger.Error("Failed to close position %s: %v", positionID, err)
		return err
	}

	return nil
}

// SaveMarketData saves market data to the database
func (db *DB) SaveMarketData(candle *models.Candle) error {
	query := `
		INSERT INTO market_data (symbol, price, volume, timestamp, timeframe, 
								open_price, high_price, low_price, close_price)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		ON CONFLICT DO NOTHING
	`

	_, err := db.conn.Exec(query,
		candle.Symbol, candle.Close, candle.Volume, candle.Timestamp, "5m",
		candle.Open, candle.High, candle.Low, candle.Close)

	if err != nil {
		db.logger.Error("Failed to save market data for %s: %v", candle.Symbol, err)
		return err
	}

	return nil
}

// SaveTechnicalAnalysis saves technical analysis to the database
func (db *DB) SaveTechnicalAnalysis(symbol string, analysis *models.TechnicalAnalysis) error {
	query := `
		INSERT INTO technical_analysis (symbol, ema9, ema21, ema50, ema200, rsi, macd, vwap, 
										ma50, signal, confidence, timestamp)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
	`

	_, err := db.conn.Exec(query,
		symbol, analysis.EMA9, analysis.EMA21, analysis.EMA50, analysis.EMA200,
		analysis.RSI, analysis.MACD, analysis.VWAP, analysis.MA50,
		analysis.Signal, analysis.Confidence)

	if err != nil {
		db.logger.Error("Failed to save technical analysis for %s: %v", symbol, err)
		return err
	}

	return nil
}

// SaveTradingSettings saves trading settings to the database
func (db *DB) SaveTradingSettings(settings *models.TradingSettings) error {
	query := `
		INSERT INTO trading_settings (min_confidence, max_position_size, risk_per_trade, 
									  max_daily_loss, max_positions, stop_loss_percent, 
									  take_profit_percent, max_hold_time, scaling_factor, 
									  is_enabled, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
	`

	_, err := db.conn.Exec(query,
		settings.MinConfidence, settings.MaxPositionSize, settings.RiskPerTrade,
		settings.MaxDailyLoss, settings.MaxPositions, settings.StopLossPercent,
		settings.TakeProfitPercent, settings.MaxHoldTime, settings.ScalingFactor,
		settings.IsEnabled)

	if err != nil {
		db.logger.Error("Failed to save trading settings: %v", err)
		return err
	}

	return nil
}

// GetLatestTradingSettings retrieves the latest trading settings
func (db *DB) GetLatestTradingSettings() (*models.TradingSettings, error) {
	query := `
		SELECT min_confidence, max_position_size, risk_per_trade, max_daily_loss,
			   max_positions, stop_loss_percent, take_profit_percent, max_hold_time,
			   scaling_factor, is_enabled
		FROM trading_settings 
		ORDER BY created_at DESC 
		LIMIT 1
	`

	var settings models.TradingSettings
	err := db.conn.QueryRow(query).Scan(
		&settings.MinConfidence, &settings.MaxPositionSize, &settings.RiskPerTrade,
		&settings.MaxDailyLoss, &settings.MaxPositions, &settings.StopLossPercent,
		&settings.TakeProfitPercent, &settings.MaxHoldTime, &settings.ScalingFactor,
		&settings.IsEnabled)

	if err == sql.ErrNoRows {
		// Return default settings if none found
		return &models.TradingSettings{
			MinConfidence:     60,
			MaxPositionSize:   10000,
			RiskPerTrade:      2.0,
			MaxDailyLoss:      1000,
			MaxPositions:      5,
			StopLossPercent:   1.0,
			TakeProfitPercent: 1.5,
			MaxHoldTime:       60,
			ScalingFactor:     1,
			IsEnabled:         false,
		}, nil
	}

	if err != nil {
		return nil, err
	}

	return &settings, nil
}

// UpdateWatchlist updates or inserts watchlist items
func (db *DB) UpdateWatchlist(items []models.WatchlistItem) error {
	tx, err := db.conn.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Clear existing watchlist
	if _, err := tx.Exec("DELETE FROM watchlist"); err != nil {
		return err
	}

	// Insert new items
	stmt, err := tx.Prepare(`
		INSERT INTO watchlist (symbol, name, is_active, price, last_update)
		VALUES ($1, $2, $3, $4, $5)
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, item := range items {
		_, err := stmt.Exec(item.Symbol, item.Name, item.IsActive, item.Price, item.LastUpdate)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

// GetWatchlist retrieves the watchlist from the database
func (db *DB) GetWatchlist() ([]models.WatchlistItem, error) {
	query := `
		SELECT symbol, name, is_active, COALESCE(price, 0), COALESCE(last_update, NOW())
		FROM watchlist 
		ORDER BY symbol
	`

	rows, err := db.conn.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.WatchlistItem
	for rows.Next() {
		var item models.WatchlistItem
		err := rows.Scan(&item.Symbol, &item.Name, &item.IsActive, &item.Price, &item.LastUpdate)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}

	return items, nil
}

// SavePerformanceMetrics saves daily performance metrics
func (db *DB) SavePerformanceMetrics(date time.Time, metrics map[string]interface{}) error {
	query := `
		INSERT INTO performance_metrics (date, total_trades, winning_trades, losing_trades,
										total_pnl, day_pnl, win_rate, avg_trade_duration, max_drawdown)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		ON CONFLICT (date) DO UPDATE SET
			total_trades = EXCLUDED.total_trades,
			winning_trades = EXCLUDED.winning_trades,
			losing_trades = EXCLUDED.losing_trades,
			total_pnl = EXCLUDED.total_pnl,
			day_pnl = EXCLUDED.day_pnl,
			win_rate = EXCLUDED.win_rate,
			avg_trade_duration = EXCLUDED.avg_trade_duration,
			max_drawdown = EXCLUDED.max_drawdown
	`

	_, err := db.conn.Exec(query,
		date.Format("2006-01-02"),
		metrics["total_trades"],
		metrics["winning_trades"],
		metrics["losing_trades"],
		metrics["total_pnl"],
		metrics["day_pnl"],
		metrics["win_rate"],
		metrics["avg_trade_duration"],
		metrics["max_drawdown"])

	if err != nil {
		db.logger.Error("Failed to save performance metrics: %v", err)
		return err
	}

	return nil
}

// GetPerformanceMetrics retrieves performance metrics for a date range
func (db *DB) GetPerformanceMetrics(startDate, endDate time.Time) ([]map[string]interface{}, error) {
	query := `
		SELECT date, total_trades, winning_trades, losing_trades, total_pnl, day_pnl,
			   win_rate, avg_trade_duration, max_drawdown
		FROM performance_metrics 
		WHERE date BETWEEN $1 AND $2
		ORDER BY date DESC
	`

	rows, err := db.conn.Query(query, startDate.Format("2006-01-02"), endDate.Format("2006-01-02"))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var metrics []map[string]interface{}
	for rows.Next() {
		var date string
		var totalTrades, winningTrades, losingTrades, avgTradeDuration int
		var totalPnL, dayPnL, winRate, maxDrawdown float64

		err := rows.Scan(&date, &totalTrades, &winningTrades, &losingTrades,
			&totalPnL, &dayPnL, &winRate, &avgTradeDuration, &maxDrawdown)
		if err != nil {
			return nil, err
		}

		metric := map[string]interface{}{
			"date":               date,
			"total_trades":       totalTrades,
			"winning_trades":     winningTrades,
			"losing_trades":      losingTrades,
			"total_pnl":          totalPnL,
			"day_pnl":            dayPnL,
			"win_rate":           winRate,
			"avg_trade_duration": avgTradeDuration,
			"max_drawdown":       maxDrawdown,
		}

		metrics = append(metrics, metric)
	}

	return metrics, nil
}
