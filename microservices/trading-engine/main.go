package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"github.com/rs/cors"

	"trading-engine/cache"
	"trading-engine/config"
	"trading-engine/database"
	"trading-engine/engine"
	"trading-engine/logger"
	"trading-engine/models"
)

// Application holds all the application dependencies
type Application struct {
	config       *config.Config
	logger       *logger.Logger
	database     *database.DB
	cache        *cache.Client
	engine       *engine.Engine
	upgrader     websocket.Upgrader
	clients      map[*websocket.Conn]bool
	clientsMutex sync.RWMutex
	broadcast    chan []byte
}

func main() {
	// Initialize configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		fmt.Printf("Failed to load configuration: %v\n", err)
		os.Exit(1)
	}

	// Initialize logger
	log, err := logger.NewLogger("trading-engine", logger.INFO, "./logs")
	if err != nil {
		fmt.Printf("Failed to initialize logger: %v\n", err)
		os.Exit(1)
	}
	log.Info("Starting Trading Engine v2.0 - Optimized")

	// Initialize database (optional)
	var db *database.DB
	dbConfig := &database.Config{
		Host:     cfg.Database.Host,
		Port:     cfg.Database.Port,
		User:     cfg.Database.User,
		Password: cfg.Database.Password,
		DBName:   cfg.Database.Name,
		SSLMode:  cfg.Database.SSLMode,
	}
	db, err = database.NewDB(dbConfig, log)
	if err != nil {
		log.Warn("Failed to initialize database, running without persistence: %v", err)
		db = nil // Continue without database
	}
	if db != nil {
		defer db.Close()
	}

	// Initialize cache (optional)
	var cacheClient *cache.Client
	cacheConfig := &cache.Config{
		Host:     cfg.Redis.Host,
		Port:     cfg.Redis.Port,
		Password: cfg.Redis.Password,
		DB:       cfg.Redis.DB,
	}
	cacheClient, err = cache.NewClient(cacheConfig, log)
	if err != nil {
		log.Warn("Failed to initialize cache, running without Redis: %v", err)
		cacheClient = nil // Continue without cache
	}
	if cacheClient != nil {
		defer cacheClient.Close()
	}

	// Initialize trading engine
	tradingEngine, err := engine.NewEngine(cfg, log)
	if err != nil {
		log.Error("Failed to initialize trading engine: %v", err)
		os.Exit(1)
	}

	// Create application instance
	app := &Application{
		config:   cfg,
		logger:   log,
		database: db,
		cache:    cacheClient,
		engine:   tradingEngine,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true // Allow all origins for development
			},
		},
		clients:   make(map[*websocket.Conn]bool),
		broadcast: make(chan []byte, 256),
	}

	// Start the engine
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	if err := app.engine.Start(ctx); err != nil {
		log.Error("Failed to start trading engine: %v", err)
		os.Exit(1)
	}

	// Start WebSocket broadcast handler
	go app.handleWebSocketBroadcasts()

	// Start periodic data broadcasting
	go app.startDataBroadcasting(ctx)

	// Setup HTTP server
	router := app.setupRoutes()

	server := &http.Server{
		Addr:         ":" + cfg.Server.Port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in a goroutine
	go func() {
		log.Info("Starting HTTP server on port " + cfg.Server.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Error("HTTP server failed: %v", err)
		}
	}()

	// Wait for interrupt signal
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop

	log.Info("Shutting down trading engine...")

	// Graceful shutdown
	cancel()

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer shutdownCancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Error("Server shutdown failed: %v", err)
	}

	if err := app.engine.Stop(); err != nil {
		log.Error("Engine shutdown failed: %v", err)
	}

	log.Info("Trading engine shutdown complete")
}

// setupRoutes configures the HTTP routes
func (app *Application) setupRoutes() http.Handler {
	router := mux.NewRouter()

	// API routes
	api := router.PathPrefix("/api").Subrouter()

	// Trading state endpoints
	api.HandleFunc("/trading-state", app.getTradingStateHandler).Methods("GET")
	api.HandleFunc("/trading/enable", app.enableTradingHandler).Methods("POST")
	api.HandleFunc("/trading/disable", app.disableTradingHandler).Methods("POST")
	api.HandleFunc("/trading/status", app.getTradingStatusHandler).Methods("GET")

	// Position management
	api.HandleFunc("/positions", app.getPositionsHandler).Methods("GET")
	api.HandleFunc("/positions/{symbol}/close", app.closePositionHandler).Methods("POST")

	// Trade history
	api.HandleFunc("/trades", app.getTradesHandler).Methods("GET")
	api.HandleFunc("/trades/{symbol}", app.getTradesBySymbolHandler).Methods("GET")

	// Settings
	api.HandleFunc("/settings", app.getSettingsHandler).Methods("GET")
	api.HandleFunc("/settings", app.updateSettingsHandler).Methods("POST")

	// Market data
	api.HandleFunc("/market-data", app.getMarketDataHandler).Methods("GET")
	api.HandleFunc("/market-data/{symbol}", app.getSymbolDataHandler).Methods("GET")

	// Performance metrics
	api.HandleFunc("/performance", app.getPerformanceHandler).Methods("GET")

	// Health check
	api.HandleFunc("/health", app.healthCheckHandler).Methods("GET")

	// WebSocket endpoint
	router.HandleFunc("/ws", app.websocketHandler)

	// CORS middleware
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: true,
	})

	return c.Handler(router)
}

// HTTP Handlers

func (app *Application) getTradingStateHandler(w http.ResponseWriter, r *http.Request) {
	state := app.engine.GetTradingState()

	// Cache the state if cache is available
	if app.cache != nil {
		if err := app.cache.SetTradingState(r.Context(), state); err != nil {
			app.logger.Warn("Failed to cache trading state: %v", err)
		}
	}

	// Save to database
	if app.database != nil {
		// Save recent trades and positions
		for _, trade := range state.Trades {
			if err := app.database.SaveTrade(&trade); err != nil {
				app.logger.Error("Failed to save trade to database: %v", err)
			}
		}

		for _, position := range state.Positions {
			if err := app.database.SavePosition(&position); err != nil {
				app.logger.Error("Failed to save position to database: %v", err)
			}
		}
	}

	app.writeJSONResponse(w, state)
}

func (app *Application) enableTradingHandler(w http.ResponseWriter, r *http.Request) {
	app.engine.EnableTrading()
	app.writeJSONResponse(w, map[string]string{"status": "enabled"})
}

func (app *Application) disableTradingHandler(w http.ResponseWriter, r *http.Request) {
	app.engine.DisableTrading()
	app.writeJSONResponse(w, map[string]string{"status": "disabled"})
}

func (app *Application) getTradingStatusHandler(w http.ResponseWriter, r *http.Request) {
	status := map[string]interface{}{
		"enabled":   app.engine.IsTrading(),
		"timestamp": time.Now(),
	}
	app.writeJSONResponse(w, status)
}

func (app *Application) getPositionsHandler(w http.ResponseWriter, r *http.Request) {
	state := app.engine.GetTradingState()
	app.writeJSONResponse(w, state.Positions)
}

func (app *Application) closePositionHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	symbol := vars["symbol"]

	if err := app.engine.ClosePosition(symbol, "MANUAL"); err != nil {
		app.writeErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	app.writeJSONResponse(w, map[string]string{"status": "closed", "symbol": symbol})
}

func (app *Application) getTradesHandler(w http.ResponseWriter, r *http.Request) {
	// Try to get from cache first
	if app.cache != nil {
		if state, found, err := app.cache.GetTradingState(r.Context()); err == nil && found {
			app.writeJSONResponse(w, state.Trades)
			return
		}
	}

	// Fall back to database
	if app.database != nil {
		trades, err := app.database.GetTrades("", 100)
		if err != nil {
			app.writeErrorResponse(w, http.StatusInternalServerError, "Failed to fetch trades")
			return
		}
		app.writeJSONResponse(w, trades)
		return
	}

	// Fall back to engine state
	state := app.engine.GetTradingState()
	app.writeJSONResponse(w, state.Trades)
}

func (app *Application) getTradesBySymbolHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	symbol := vars["symbol"]

	if app.database != nil {
		trades, err := app.database.GetTrades(symbol, 50)
		if err != nil {
			app.writeErrorResponse(w, http.StatusInternalServerError, "Failed to fetch trades")
			return
		}
		app.writeJSONResponse(w, trades)
		return
	}

	// Filter from engine state
	state := app.engine.GetTradingState()
	var filteredTrades []models.Trade
	for _, trade := range state.Trades {
		if trade.Symbol == symbol {
			filteredTrades = append(filteredTrades, trade)
		}
	}
	app.writeJSONResponse(w, filteredTrades)
}

func (app *Application) getSettingsHandler(w http.ResponseWriter, r *http.Request) {
	state := app.engine.GetTradingState()
	app.writeJSONResponse(w, state.Settings)
}

func (app *Application) updateSettingsHandler(w http.ResponseWriter, r *http.Request) {
	var settings models.TradingSettings
	if err := json.NewDecoder(r.Body).Decode(&settings); err != nil {
		app.writeErrorResponse(w, http.StatusBadRequest, "Invalid settings format")
		return
	}

	if err := app.engine.UpdateSettings(settings); err != nil {
		app.writeErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	// Save to database
	if app.database != nil {
		if err := app.database.SaveTradingSettings(&settings); err != nil {
			app.logger.Error("Failed to save settings to database: %v", err)
		}
	}

	app.writeJSONResponse(w, map[string]string{"status": "updated"})
}

func (app *Application) getMarketDataHandler(w http.ResponseWriter, r *http.Request) {
	state := app.engine.GetTradingState()
	app.writeJSONResponse(w, state.Watchlist)
}

func (app *Application) getSymbolDataHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	symbol := vars["symbol"]

	state := app.engine.GetTradingState()
	for _, item := range state.Watchlist {
		if item.Symbol == symbol {
			app.writeJSONResponse(w, item)
			return
		}
	}

	app.writeErrorResponse(w, http.StatusNotFound, "Symbol not found")
}

func (app *Application) getPerformanceHandler(w http.ResponseWriter, r *http.Request) {
	state := app.engine.GetTradingState()

	performance := map[string]interface{}{
		"totalPnL":         state.TotalPnL,
		"dayPnL":           state.DayPnL,
		"tradingBalance":   state.TradingBalance,
		"availableBalance": state.AvailableBalance,
		"totalTrades":      len(state.Trades),
		"activePositions":  len(state.Positions),
		"timestamp":        time.Now(),
	}

	app.writeJSONResponse(w, performance)
}

func (app *Application) healthCheckHandler(w http.ResponseWriter, r *http.Request) {
	health := map[string]interface{}{
		"status":    "healthy",
		"timestamp": time.Now(),
		"version":   "2.0",
		"trading":   app.engine.IsTrading(),
	}

	// Check database connectivity
	if app.database != nil {
		health["database"] = "connected"
	} else {
		health["database"] = "disconnected"
	}

	// Check cache connectivity
	if app.cache != nil {
		health["cache"] = "connected"
	} else {
		health["cache"] = "disconnected"
	}

	app.writeJSONResponse(w, health)
}

// WebSocket handler
func (app *Application) websocketHandler(w http.ResponseWriter, r *http.Request) {
	conn, err := app.upgrader.Upgrade(w, r, nil)
	if err != nil {
		app.logger.Error("WebSocket upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	app.clientsMutex.Lock()
	app.clients[conn] = true
	app.clientsMutex.Unlock()

	app.logger.Info("New WebSocket client connected")

	// Send initial state
	state := app.engine.GetTradingState()
	if data, err := json.Marshal(map[string]interface{}{
		"type": "trading-state",
		"data": state,
	}); err == nil {
		conn.WriteMessage(websocket.TextMessage, data)
	}

	// Handle incoming messages
	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			app.logger.Debug("WebSocket read error: %v", err)
			break
		}

		var msg map[string]interface{}
		if err := json.Unmarshal(message, &msg); err != nil {
			continue
		}

		// Handle different message types
		switch msg["type"] {
		case "ping":
			response := map[string]interface{}{
				"type":      "pong",
				"timestamp": time.Now(),
			}
			if data, err := json.Marshal(response); err == nil {
				conn.WriteMessage(websocket.TextMessage, data)
			}
		}
	}

	// Remove client on disconnect
	app.clientsMutex.Lock()
	delete(app.clients, conn)
	app.clientsMutex.Unlock()

	app.logger.Info("WebSocket client disconnected")
}

// WebSocket broadcast handlers
func (app *Application) handleWebSocketBroadcasts() {
	for {
		select {
		case message := <-app.broadcast:
			app.clientsMutex.RLock()
			for client := range app.clients {
				err := client.WriteMessage(websocket.TextMessage, message)
				if err != nil {
					client.Close()
					delete(app.clients, client)
				}
			}
			app.clientsMutex.RUnlock()
		}
	}
}

func (app *Application) startDataBroadcasting(ctx context.Context) {
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			state := app.engine.GetTradingState()
			message := map[string]interface{}{
				"type":      "update",
				"data":      state,
				"timestamp": time.Now(),
			}

			if data, err := json.Marshal(message); err == nil {
				select {
				case app.broadcast <- data:
				default:
					// Channel is full, skip this update
				}
			}
		}
	}
}

// Utility functions
func (app *Application) writeJSONResponse(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(data); err != nil {
		app.logger.Error("Failed to encode JSON response: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
	}
}

func (app *Application) writeErrorResponse(w http.ResponseWriter, statusCode int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	response := map[string]string{"error": message}
	json.NewEncoder(w).Encode(response)
}
