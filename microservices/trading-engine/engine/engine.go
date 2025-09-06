package engine

import (
	"context"
	"fmt"
	"math"
	"sync"
	"time"

	"trading-engine/binance"
	"trading-engine/config"
	"trading-engine/logger"
	"trading-engine/models"
	"trading-engine/technical"
	"trading-engine/utils"
)

// Engine represents the main trading engine
type Engine struct {
	config         *config.Config
	logger         *logger.Logger
	binanceClient  *binance.Client
	wsClient       *binance.WebSocketClient
	techAnalyzer   *technical.Analyzer
	tradingState   *models.TradingState
	dataBuffers    map[string][]models.Candle
	subscribers    map[string][]chan models.LiveTicker
	positionTimers map[string]*time.Timer
	lastTradeTime  map[string]time.Time

	// Mutexes for thread safety
	stateMutex       sync.RWMutex
	buffersMutex     sync.RWMutex
	subscribersMutex sync.RWMutex
	timersMutex      sync.RWMutex

	// Control channels
	stopChan       chan struct{}
	tradingEnabled bool
	tradingMutex   sync.RWMutex
}

// NewEngine creates a new trading engine instance
func NewEngine(cfg *config.Config, log *logger.Logger) (*Engine, error) {
	// Initialize Binance clients
	binanceClient := binance.NewClient(&cfg.Binance, log)
	wsClient := binance.NewWebSocketClient(&cfg.Binance, log)

	// Initialize technical analyzer
	techConfig := &technical.Config{
		RSIPeriod:     cfg.Trading.TechnicalPeriods.RSI,
		EMA9Period:    cfg.Trading.TechnicalPeriods.EMA9,
		EMA21Period:   cfg.Trading.TechnicalPeriods.EMA21,
		EMA50Period:   cfg.Trading.TechnicalPeriods.EMA50,
		EMA200Period:  cfg.Trading.TechnicalPeriods.EMA200,
		MinConfidence: 60,
		CacheDuration: 30 * time.Second,
	}
	techAnalyzer := technical.NewAnalyzer(techConfig)

	// Initialize default watchlist
	defaultWatchlist := []models.WatchlistItem{
		{Symbol: "BTCUSDT", Name: "Bitcoin", IsActive: true, LastUpdate: time.Now()},
		{Symbol: "ETHUSDT", Name: "Ethereum", IsActive: true, LastUpdate: time.Now()},
		{Symbol: "BNBUSDT", Name: "BNB", IsActive: true, LastUpdate: time.Now()},
		{Symbol: "XRPUSDT", Name: "Ripple", IsActive: true, LastUpdate: time.Now()},
		{Symbol: "ADAUSDT", Name: "Cardano", IsActive: true, LastUpdate: time.Now()},
		{Symbol: "SOLUSDT", Name: "Solana", IsActive: true, LastUpdate: time.Now()},
		{Symbol: "DOGEUSDT", Name: "Dogecoin", IsActive: true, LastUpdate: time.Now()},
		{Symbol: "TRXUSDT", Name: "TRON", IsActive: true, LastUpdate: time.Now()},
		{Symbol: "MATICUSDT", Name: "Polygon", IsActive: true, LastUpdate: time.Now()},
		{Symbol: "DOTUSDT", Name: "Polkadot", IsActive: true, LastUpdate: time.Now()},
	}

	// Initialize trading state
	tradingState := &models.TradingState{
		Trades:           []models.Trade{},
		Positions:        []models.Position{},
		TotalPnL:         0,
		DayPnL:           0,
		TradingBalance:   50000,
		AvailableBalance: 50000,
		Watchlist:        defaultWatchlist,
		Settings: models.TradingSettings{
			MinConfidence:     60,
			MaxPositionSize:   10000,
			RiskPerTrade:      cfg.Trading.DefaultRiskPct,
			MaxDailyLoss:      cfg.Trading.MaxDailyLoss,
			MaxPositions:      cfg.Trading.MaxPositions,
			StopLossPercent:   1.0,
			TakeProfitPercent: 1.5,
			MaxHoldTime:       cfg.Trading.PositionTimeout,
			ScalingFactor:     1,
			IsEnabled:         false,
		},
	}

	engine := &Engine{
		config:         cfg,
		logger:         log,
		binanceClient:  binanceClient,
		wsClient:       wsClient,
		techAnalyzer:   techAnalyzer,
		tradingState:   tradingState,
		dataBuffers:    make(map[string][]models.Candle),
		subscribers:    make(map[string][]chan models.LiveTicker),
		positionTimers: make(map[string]*time.Timer),
		lastTradeTime:  make(map[string]time.Time),
		stopChan:       make(chan struct{}),
		tradingEnabled: false,
	}

	return engine, nil
}

// Start starts the trading engine
func (e *Engine) Start(ctx context.Context) error {
	e.logger.Info("Starting trading engine...")

	// Health check
	if err := e.binanceClient.HealthCheck(ctx); err != nil {
		return fmt.Errorf("Binance health check failed: %w", err)
	}

	// Initialize historical data
	if err := e.initializeHistoricalData(ctx); err != nil {
		e.logger.Warn("Failed to initialize historical data: %v", err)
	}

	// Start data fetching
	go e.startDataFetching(ctx)

	// Start trading loop
	go e.startTradingLoop(ctx)

	// Start position monitoring
	go e.startPositionMonitoring(ctx)

	e.logger.Info("Trading engine started successfully")
	return nil
}

// Stop stops the trading engine
func (e *Engine) Stop() error {
	e.logger.Info("Stopping trading engine...")

	close(e.stopChan)

	// Close WebSocket connections
	if err := e.wsClient.Close(); err != nil {
		e.logger.Error("Error closing WebSocket connections: %v", err)
	}

	// Cancel all position timers
	e.timersMutex.Lock()
	for symbol, timer := range e.positionTimers {
		timer.Stop()
		e.logger.Debug("Cancelled timer for position: %s", symbol)
	}
	e.positionTimers = make(map[string]*time.Timer)
	e.timersMutex.Unlock()

	e.logger.Info("Trading engine stopped")
	return nil
}

// initializeHistoricalData fetches historical data for all watchlist symbols
func (e *Engine) initializeHistoricalData(ctx context.Context) error {
	e.logger.Info("Initializing historical data...")

	e.stateMutex.RLock()
	symbols := make([]string, len(e.tradingState.Watchlist))
	for i, item := range e.tradingState.Watchlist {
		symbols[i] = item.Symbol
	}
	e.stateMutex.RUnlock()

	for _, symbol := range symbols {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		candles, err := e.binanceClient.FetchHistoricalKlines(ctx, symbol, "5m", 200)
		if err != nil {
			e.logger.Error("Failed to fetch historical data for %s: %v", symbol, err)
			continue
		}

		e.buffersMutex.Lock()
		e.dataBuffers[symbol] = candles
		e.buffersMutex.Unlock()

		e.logger.Debug("Loaded %d historical candles for %s", len(candles), symbol)
	}

	e.logger.Info("Historical data initialization completed")
	return nil
}

// startDataFetching starts the real-time data fetching routine
func (e *Engine) startDataFetching(ctx context.Context) {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	e.logger.Info("Starting real-time data fetching")

	for {
		select {
		case <-ctx.Done():
			return
		case <-e.stopChan:
			return
		case <-ticker.C:
			e.updateRealTimeData(ctx)
		}
	}
}

// updateRealTimeData fetches and updates real-time market data
func (e *Engine) updateRealTimeData(ctx context.Context) {
	e.stateMutex.RLock()
	symbols := make([]string, len(e.tradingState.Watchlist))
	for i, item := range e.tradingState.Watchlist {
		symbols[i] = item.Symbol
	}
	e.stateMutex.RUnlock()

	if len(symbols) == 0 {
		return
	}

	prices, err := e.binanceClient.FetchPrices(ctx, symbols)
	if err != nil {
		e.logger.Error("Failed to fetch real-time prices: %v", err)
		return
	}

	// Update data buffers and perform technical analysis
	for symbol, priceData := range prices {
		candle := models.Candle{
			Open:      priceData.LastPrice,
			High:      priceData.LastPrice,
			Low:       priceData.LastPrice,
			Close:     priceData.LastPrice,
			Volume:    priceData.Volume,
			Time:      time.Now().Unix(),
			Timestamp: time.Now(),
			Symbol:    symbol,
		}

		e.buffersMutex.Lock()
		buffer := e.dataBuffers[symbol]
		if len(buffer) >= e.config.Trading.PriceBufferSize {
			buffer = buffer[1:]
		}
		buffer = append(buffer, candle)
		e.dataBuffers[symbol] = buffer
		e.buffersMutex.Unlock()

		// Perform technical analysis
		go e.updateTechnicalAnalysis(ctx, symbol, buffer)
	}

	e.logger.Debug("Updated real-time data for %d symbols", len(prices))
}

// updateTechnicalAnalysis updates technical analysis for a symbol
func (e *Engine) updateTechnicalAnalysis(ctx context.Context, symbol string, candles []models.Candle) {
	analysis, err := e.techAnalyzer.Analyze(ctx, symbol, candles)
	if err != nil {
		e.logger.Error("Technical analysis failed for %s: %v", symbol, err)
		return
	}

	// Update watchlist with technical analysis
	e.stateMutex.Lock()
	for i, item := range e.tradingState.Watchlist {
		if item.Symbol == symbol {
			e.tradingState.Watchlist[i].Technical = &models.TechnicalAnalysis{
				EMA9:       analysis.Indicators.EMA9,
				EMA21:      analysis.Indicators.EMA21,
				EMA50:      analysis.Indicators.EMA50,
				EMA200:     analysis.Indicators.EMA200,
				RSI:        analysis.Indicators.RSI,
				MACD:       analysis.Indicators.MACD,
				VWAP:       analysis.Indicators.VWAP,
				MA50:       analysis.Indicators.EMA50, // Using EMA50 as MA50 approximation
				Signal:     analysis.Signals.Overall,
				Confidence: analysis.Confidence,
			}
			e.tradingState.Watchlist[i].Price = analysis.Price
			e.tradingState.Watchlist[i].LastUpdate = time.Now()
			break
		}
	}
	e.stateMutex.Unlock()
}

// startTradingLoop starts the main trading execution loop
func (e *Engine) startTradingLoop(ctx context.Context) {
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	e.logger.Info("Starting trading loop")

	for {
		select {
		case <-ctx.Done():
			return
		case <-e.stopChan:
			return
		case <-ticker.C:
			e.tradingMutex.RLock()
			enabled := e.tradingEnabled
			e.tradingMutex.RUnlock()

			if enabled {
				e.processTrading(ctx)
			}
		}
	}
}

// processTrading processes trading signals and executes trades
func (e *Engine) processTrading(ctx context.Context) {
	e.stateMutex.RLock()
	watchlist := make([]models.WatchlistItem, len(e.tradingState.Watchlist))
	copy(watchlist, e.tradingState.Watchlist)
	settings := e.tradingState.Settings
	currentPositions := len(e.tradingState.Positions)
	availableBalance := e.tradingState.AvailableBalance
	dayPnL := e.tradingState.DayPnL
	e.stateMutex.RUnlock()

	// Check daily loss limit
	if math.Abs(dayPnL) >= settings.MaxDailyLoss {
		e.logger.Warn("Daily loss limit reached: %.2f", dayPnL)
		return
	}

	// Check if we can open new positions
	if currentPositions >= settings.MaxPositions {
		return
	}

	// Check available balance
	if availableBalance < 1000 {
		e.logger.Warn("Insufficient balance for trading: %.2f", availableBalance)
		return
	}

	for _, item := range watchlist {
		if !item.IsActive || item.Technical == nil {
			continue
		}

		// Check if we already have a position for this symbol
		hasPosition := e.hasPosition(item.Symbol)
		if hasPosition {
			continue
		}

		// Check signal confidence
		if item.Technical.Confidence < settings.MinConfidence {
			continue
		}

		// Check cooldown period
		if e.isInCooldown(item.Symbol) {
			continue
		}

		// Execute trade based on signal
		switch item.Technical.Signal {
		case "STRONG_BUY", "BUY":
			e.executeBuyTrade(ctx, item, settings)
		case "STRONG_SELL", "SELL":
			e.executeSellTrade(ctx, item, settings)
		}
	}
}

// executeBuyTrade executes a buy trade
func (e *Engine) executeBuyTrade(ctx context.Context, item models.WatchlistItem, settings models.TradingSettings) {
	if item.Technical == nil {
		return
	}

	// Calculate position size
	riskAmount := e.tradingState.AvailableBalance * (settings.RiskPerTrade / 100)
	positionSize := utils.MinFloat64(riskAmount/(settings.StopLossPercent/100), settings.MaxPositionSize)

	if positionSize < 100 {
		return // Position too small
	}

	quantity := positionSize / item.Price
	totalCost := quantity * item.Price

	// Validate position
	if err := utils.ValidatePositionSize(totalCost, settings.MaxPositionSize, e.tradingState.AvailableBalance); err != nil {
		e.logger.Error("Position validation failed for %s: %v", item.Symbol, err)
		return
	}

	// Calculate stop loss and take profit
	stopLoss := utils.CalculateStopLoss(item.Price, settings.StopLossPercent, true)
	takeProfit := utils.CalculateTakeProfit(item.Price, settings.TakeProfitPercent, true)

	// Create trade
	trade := models.Trade{
		ID:         utils.GenerateTradeID(item.Symbol),
		Symbol:     item.Symbol,
		Type:       "BUY",
		Price:      item.Price,
		Quantity:   quantity,
		Timestamp:  time.Now(),
		Signal:     item.Technical.Signal,
		Confidence: item.Technical.Confidence,
	}

	// Create position
	position := models.Position{
		ID:            utils.GenerateTradeID(item.Symbol),
		Symbol:        item.Symbol,
		Quantity:      quantity,
		AvgBuyPrice:   item.Price,
		CurrentValue:  totalCost,
		UnrealizedPnL: 0,
		EntryTime:     time.Now(),
		TargetPrice:   &takeProfit,
		StopLossPrice: &stopLoss,
	}

	// Update trading state
	e.stateMutex.Lock()
	e.tradingState.Trades = append(e.tradingState.Trades, trade)
	e.tradingState.Positions = append(e.tradingState.Positions, position)
	e.tradingState.AvailableBalance -= totalCost
	e.stateMutex.Unlock()

	// Set position timer
	e.setPositionTimer(item.Symbol, settings.MaxHoldTime)

	// Update last trade time
	e.lastTradeTime[item.Symbol] = time.Now()

	e.logger.WithFields(map[string]interface{}{
		"symbol":      item.Symbol,
		"type":        "BUY",
		"price":       item.Price,
		"quantity":    quantity,
		"confidence":  item.Technical.Confidence,
		"stop_loss":   stopLoss,
		"take_profit": takeProfit,
	}).Info("Executed buy trade")
}

// executeSellTrade executes a sell trade (short position)
func (e *Engine) executeSellTrade(ctx context.Context, item models.WatchlistItem, settings models.TradingSettings) {
	// Similar implementation to executeBuyTrade but for short positions
	// ... (implementation similar to buy but with negative quantity for short)
}

// hasPosition checks if there's an active position for a symbol
func (e *Engine) hasPosition(symbol string) bool {
	e.stateMutex.RLock()
	defer e.stateMutex.RUnlock()

	for _, position := range e.tradingState.Positions {
		if position.Symbol == symbol {
			return true
		}
	}
	return false
}

// isInCooldown checks if a symbol is in cooldown period
func (e *Engine) isInCooldown(symbol string) bool {
	lastTrade, exists := e.lastTradeTime[symbol]
	if !exists {
		return false
	}

	cooldownPeriod := 30 * time.Second
	return time.Since(lastTrade) < cooldownPeriod
}

// setPositionTimer sets a timer to automatically close a position
func (e *Engine) setPositionTimer(symbol string, maxHoldMinutes int) {
	e.timersMutex.Lock()
	defer e.timersMutex.Unlock()

	// Cancel existing timer if any
	if timer, exists := e.positionTimers[symbol]; exists {
		timer.Stop()
	}

	// Set new timer
	timer := time.AfterFunc(time.Duration(maxHoldMinutes)*time.Minute, func() {
		e.closePositionByTimeout(symbol)
	})

	e.positionTimers[symbol] = timer
}

// closePositionByTimeout closes a position due to timeout
func (e *Engine) closePositionByTimeout(symbol string) {
	e.logger.WithFields(map[string]interface{}{
		"symbol": symbol,
		"reason": "timeout",
	}).Info("Closing position due to timeout")

	e.ClosePosition(symbol, "TIMEOUT")
}

// startPositionMonitoring starts monitoring positions for exit conditions
func (e *Engine) startPositionMonitoring(ctx context.Context) {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	e.logger.Info("Starting position monitoring")

	for {
		select {
		case <-ctx.Done():
			return
		case <-e.stopChan:
			return
		case <-ticker.C:
			e.checkExitConditions()
		}
	}
}

// checkExitConditions checks if any positions should be closed
func (e *Engine) checkExitConditions() {
	e.stateMutex.RLock()
	positions := make([]models.Position, len(e.tradingState.Positions))
	copy(positions, e.tradingState.Positions)
	e.stateMutex.RUnlock()

	for _, position := range positions {
		e.buffersMutex.RLock()
		buffer, exists := e.dataBuffers[position.Symbol]
		e.buffersMutex.RUnlock()

		if !exists || len(buffer) == 0 {
			continue
		}

		currentPrice := buffer[len(buffer)-1].Close

		// Check stop loss
		if position.StopLossPrice != nil {
			if (position.Quantity > 0 && currentPrice <= *position.StopLossPrice) ||
				(position.Quantity < 0 && currentPrice >= *position.StopLossPrice) {
				e.ClosePosition(position.Symbol, "STOP_LOSS")
				continue
			}
		}

		// Check take profit
		if position.TargetPrice != nil {
			if (position.Quantity > 0 && currentPrice >= *position.TargetPrice) ||
				(position.Quantity < 0 && currentPrice <= *position.TargetPrice) {
				e.ClosePosition(position.Symbol, "TAKE_PROFIT")
				continue
			}
		}

		// Update unrealized P&L
		e.updatePositionPnL(position.Symbol, currentPrice)
	}
}

// updatePositionPnL updates the unrealized P&L for a position
func (e *Engine) updatePositionPnL(symbol string, currentPrice float64) {
	e.stateMutex.Lock()
	defer e.stateMutex.Unlock()

	for i, position := range e.tradingState.Positions {
		if position.Symbol == symbol {
			pnl := utils.CalculatePnL(position.AvgBuyPrice, currentPrice, position.Quantity, position.Quantity > 0)
			e.tradingState.Positions[i].UnrealizedPnL = pnl
			e.tradingState.Positions[i].CurrentValue = currentPrice * math.Abs(position.Quantity)
			break
		}
	}
}

// Public methods for external control

// GetTradingState returns the current trading state
func (e *Engine) GetTradingState() *models.TradingState {
	e.stateMutex.RLock()
	defer e.stateMutex.RUnlock()

	// Create a deep copy to avoid race conditions
	state := &models.TradingState{
		Trades:           make([]models.Trade, len(e.tradingState.Trades)),
		Positions:        make([]models.Position, len(e.tradingState.Positions)),
		TotalPnL:         e.tradingState.TotalPnL,
		DayPnL:           e.tradingState.DayPnL,
		TradingBalance:   e.tradingState.TradingBalance,
		AvailableBalance: e.tradingState.AvailableBalance,
		Settings:         e.tradingState.Settings,
		Watchlist:        make([]models.WatchlistItem, len(e.tradingState.Watchlist)),
	}

	copy(state.Trades, e.tradingState.Trades)
	copy(state.Positions, e.tradingState.Positions)
	copy(state.Watchlist, e.tradingState.Watchlist)

	return state
}

// EnableTrading enables automated trading
func (e *Engine) EnableTrading() {
	e.tradingMutex.Lock()
	defer e.tradingMutex.Unlock()

	e.tradingEnabled = true

	// Also update the settings in trading state
	e.stateMutex.Lock()
	e.tradingState.Settings.IsEnabled = true
	e.stateMutex.Unlock()

	e.logger.Info("Automated trading enabled")
}

// DisableTrading disables automated trading
func (e *Engine) DisableTrading() {
	e.tradingMutex.Lock()
	defer e.tradingMutex.Unlock()

	e.tradingEnabled = false

	// Also update the settings in trading state
	e.stateMutex.Lock()
	e.tradingState.Settings.IsEnabled = false
	e.stateMutex.Unlock()

	e.logger.Info("Automated trading disabled")
}

// IsTrading returns whether automated trading is enabled
func (e *Engine) IsTrading() bool {
	e.tradingMutex.RLock()
	defer e.tradingMutex.RUnlock()

	return e.tradingEnabled
}

// ClosePosition closes a position with the given reason
func (e *Engine) ClosePosition(symbol, reason string) error {
	e.stateMutex.Lock()
	defer e.stateMutex.Unlock()

	// Find position
	positionIndex := -1
	for i, position := range e.tradingState.Positions {
		if position.Symbol == symbol {
			positionIndex = i
			break
		}
	}

	if positionIndex == -1 {
		return fmt.Errorf("position not found for symbol: %s", symbol)
	}

	position := e.tradingState.Positions[positionIndex]

	// Get current price
	e.buffersMutex.RLock()
	buffer, exists := e.dataBuffers[symbol]
	e.buffersMutex.RUnlock()

	if !exists || len(buffer) == 0 {
		return fmt.Errorf("no price data available for symbol: %s", symbol)
	}

	currentPrice := buffer[len(buffer)-1].Close

	// Calculate P&L
	pnl := utils.CalculatePnL(position.AvgBuyPrice, currentPrice, position.Quantity, position.Quantity > 0)
	holdTime := int(time.Since(position.EntryTime).Minutes())

	// Create exit trade
	exitTrade := models.Trade{
		ID:         utils.GenerateTradeID(symbol + "_exit"),
		Symbol:     symbol,
		Type:       "CLOSE",
		Price:      currentPrice,
		Quantity:   math.Abs(position.Quantity),
		Timestamp:  time.Now(),
		Signal:     reason,
		Confidence: 100,
		PnL:        &pnl,
		ExitPrice:  &currentPrice,
		HoldTime:   &holdTime,
	}

	// Update trading state
	e.tradingState.Trades = append(e.tradingState.Trades, exitTrade)
	e.tradingState.TotalPnL += pnl
	e.tradingState.DayPnL += pnl

	// Return capital to available balance
	originalInvestment := math.Abs(position.Quantity) * position.AvgBuyPrice
	e.tradingState.AvailableBalance += originalInvestment + pnl

	// Remove position
	e.tradingState.Positions = append(
		e.tradingState.Positions[:positionIndex],
		e.tradingState.Positions[positionIndex+1:]...)

	// Cancel timer
	e.timersMutex.Lock()
	if timer, exists := e.positionTimers[symbol]; exists {
		timer.Stop()
		delete(e.positionTimers, symbol)
	}
	e.timersMutex.Unlock()

	e.logger.WithFields(map[string]interface{}{
		"symbol":     symbol,
		"reason":     reason,
		"pnl":        pnl,
		"hold_time":  holdTime,
		"exit_price": currentPrice,
	}).Info("Position closed")

	return nil
}

// UpdateSettings updates trading settings
func (e *Engine) UpdateSettings(settings models.TradingSettings) error {
	// Validate settings
	if err := utils.ValidateRiskParameters(settings.RiskPerTrade, settings.StopLossPercent, settings.TakeProfitPercent); err != nil {
		return err
	}

	e.stateMutex.Lock()
	e.tradingState.Settings = settings
	e.stateMutex.Unlock()

	e.logger.WithFields(map[string]interface{}{
		"min_confidence":      settings.MinConfidence,
		"max_position_size":   settings.MaxPositionSize,
		"risk_per_trade":      settings.RiskPerTrade,
		"stop_loss_percent":   settings.StopLossPercent,
		"take_profit_percent": settings.TakeProfitPercent,
	}).Info("Trading settings updated")

	return nil
}
