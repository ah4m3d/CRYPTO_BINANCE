package logger

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"
)

// LogLevel represents different log levels
type LogLevel int

const (
	DEBUG LogLevel = iota
	INFO
	WARN
	ERROR
	FATAL
)

// String returns the string representation of the log level
func (l LogLevel) String() string {
	switch l {
	case DEBUG:
		return "DEBUG"
	case INFO:
		return "INFO"
	case WARN:
		return "WARN"
	case ERROR:
		return "ERROR"
	case FATAL:
		return "FATAL"
	default:
		return "UNKNOWN"
	}
}

// Logger represents a structured logger
type Logger struct {
	level   LogLevel
	file    *os.File
	logger  *log.Logger
	service string
}

// NewLogger creates a new logger instance
func NewLogger(service string, level LogLevel, logDir string) (*Logger, error) {
	// Create log directory if it doesn't exist
	if err := os.MkdirAll(logDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create log directory: %w", err)
	}

	// Create log file with timestamp
	logFileName := fmt.Sprintf("%s_%s.log", service, time.Now().Format("2006-01-02"))
	logPath := filepath.Join(logDir, logFileName)

	file, err := os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		return nil, fmt.Errorf("failed to open log file: %w", err)
	}

	logger := log.New(file, "", log.LstdFlags|log.Lmicroseconds)

	return &Logger{
		level:   level,
		file:    file,
		logger:  logger,
		service: service,
	}, nil
}

// Close closes the logger
func (l *Logger) Close() error {
	if l.file != nil {
		return l.file.Close()
	}
	return nil
}

// log writes a log entry
func (l *Logger) log(level LogLevel, message string, args ...interface{}) {
	if level < l.level {
		return
	}

	timestamp := time.Now().Format("2006-01-02 15:04:05.000")
	logMessage := fmt.Sprintf("[%s] [%s] [%s] %s", timestamp, level.String(), l.service, fmt.Sprintf(message, args...))

	// Write to file
	l.logger.Println(logMessage)

	// Also write to console for important messages
	if level >= WARN {
		fmt.Println(logMessage)
	}
}

// Debug logs a debug message
func (l *Logger) Debug(message string, args ...interface{}) {
	l.log(DEBUG, message, args...)
}

// Info logs an info message
func (l *Logger) Info(message string, args ...interface{}) {
	l.log(INFO, message, args...)
}

// Warn logs a warning message
func (l *Logger) Warn(message string, args ...interface{}) {
	l.log(WARN, message, args...)
}

// Error logs an error message
func (l *Logger) Error(message string, args ...interface{}) {
	l.log(ERROR, message, args...)
}

// Fatal logs a fatal message and exits
func (l *Logger) Fatal(message string, args ...interface{}) {
	l.log(FATAL, message, args...)
	os.Exit(1)
}

// WithFields logs with additional structured fields
func (l *Logger) WithFields(fields map[string]interface{}) *LogEntry {
	return &LogEntry{
		logger: l,
		fields: fields,
	}
}

// LogEntry represents a log entry with fields
type LogEntry struct {
	logger *Logger
	fields map[string]interface{}
}

// Debug logs a debug message with fields
func (e *LogEntry) Debug(message string, args ...interface{}) {
	e.logWithFields(DEBUG, message, args...)
}

// Info logs an info message with fields
func (e *LogEntry) Info(message string, args ...interface{}) {
	e.logWithFields(INFO, message, args...)
}

// Warn logs a warning message with fields
func (e *LogEntry) Warn(message string, args ...interface{}) {
	e.logWithFields(WARN, message, args...)
}

// Error logs an error message with fields
func (e *LogEntry) Error(message string, args ...interface{}) {
	e.logWithFields(ERROR, message, args...)
}

// Fatal logs a fatal message with fields and exits
func (e *LogEntry) Fatal(message string, args ...interface{}) {
	e.logWithFields(FATAL, message, args...)
	os.Exit(1)
}

// logWithFields logs a message with structured fields
func (e *LogEntry) logWithFields(level LogLevel, message string, args ...interface{}) {
	if level < e.logger.level {
		return
	}

	timestamp := time.Now().Format("2006-01-02 15:04:05.000")

	// Format fields
	fieldStr := ""
	if len(e.fields) > 0 {
		fieldStr = " "
		for key, value := range e.fields {
			fieldStr += fmt.Sprintf("%s=%v ", key, value)
		}
	}

	logMessage := fmt.Sprintf("[%s] [%s] [%s]%s%s",
		timestamp,
		level.String(),
		e.logger.service,
		fieldStr,
		fmt.Sprintf(message, args...))

	// Write to file
	e.logger.logger.Println(logMessage)

	// Also write to console for important messages
	if level >= WARN {
		fmt.Println(logMessage)
	}
}

// Global logger instance
var globalLogger *Logger

// InitGlobalLogger initializes the global logger
func InitGlobalLogger(service string, level LogLevel, logDir string) error {
	var err error
	globalLogger, err = NewLogger(service, level, logDir)
	return err
}

// GetGlobalLogger returns the global logger
func GetGlobalLogger() *Logger {
	return globalLogger
}

// CloseGlobalLogger closes the global logger
func CloseGlobalLogger() error {
	if globalLogger != nil {
		return globalLogger.Close()
	}
	return nil
}

// Helper functions for global logger
func Debug(message string, args ...interface{}) {
	if globalLogger != nil {
		globalLogger.Debug(message, args...)
	}
}

func Info(message string, args ...interface{}) {
	if globalLogger != nil {
		globalLogger.Info(message, args...)
	}
}

func Warn(message string, args ...interface{}) {
	if globalLogger != nil {
		globalLogger.Warn(message, args...)
	}
}

func Error(message string, args ...interface{}) {
	if globalLogger != nil {
		globalLogger.Error(message, args...)
	}
}

func Fatal(message string, args ...interface{}) {
	if globalLogger != nil {
		globalLogger.Fatal(message, args...)
	}
}

func WithFields(fields map[string]interface{}) *LogEntry {
	if globalLogger != nil {
		return globalLogger.WithFields(fields)
	}
	return nil
}
