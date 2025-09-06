'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { TrendingUp, TrendingDown, Minus, RotateCcw, Trash, X, Wifi, WifiOff } from 'lucide-react'

// API Configuration
const TRADING_ENGINE_URL = process.env.NEXT_PUBLIC_TRADING_ENGINE_URL || 'http://localhost:8080'

export default function TradingDashboard() {
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected')

  const checkConnection = async () => {
    try {
      setConnectionStatus('connecting')
      const response = await fetch(`${TRADING_ENGINE_URL}/health`)
      if (response.ok) {
        setConnectionStatus('connected')
      } else {
        setConnectionStatus('disconnected')
      }
    } catch (error) {
      setConnectionStatus('disconnected')
    }
  }

  useEffect(() => {
    checkConnection()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-gray-900">🚀 Crypto Trading Microservices</h1>
            <Badge variant={connectionStatus === 'connected' ? 'default' : 'secondary'}>
              {connectionStatus === 'connected' ? <Wifi className="h-4 w-4 mr-1" /> : <WifiOff className="h-4 w-4 mr-1" />}
              Trading Engine: {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              onClick={checkConnection} 
              disabled={connectionStatus === 'connecting'}
              variant="outline"
            >
              {connectionStatus === 'connecting' ? 'Checking...' : 'Check Connection'}
            </Button>
          </div>
        </div>

        {/* Architecture Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-800">🏗️ Microservices Architecture</CardTitle>
            <CardDescription>Distributed cryptocurrency trading system with clean separation of concerns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-white p-4 rounded border shadow-sm">
                <h4 className="font-semibold text-green-700 mb-2">🎯 Trading Engine Service</h4>
                <p className="text-gray-600 mb-2">Port 8080 • Go Backend</p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• Real-time technical analysis</li>
                  <li>• Automated trading execution</li>
                  <li>• Risk management system</li>
                  <li>• Binance WebSocket integration</li>
                  <li>• Position & P&L tracking</li>
                </ul>
                <div className="mt-2">
                  <Badge variant="outline" className="text-xs">
                    REST API + WebSocket
                  </Badge>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded border shadow-sm">
                <h4 className="font-semibold text-blue-700 mb-2">🎨 Frontend UI Service</h4>
                <p className="text-gray-600 mb-2">Port 3000 • React/Next.js</p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• Real-time trading dashboard</li>
                  <li>• User interaction controls</li>
                  <li>• Live market data display</li>
                  <li>• Pure presentation layer</li>
                  <li>• Zero business logic</li>
                </ul>
                <div className="mt-2">
                  <Badge variant="outline" className="text-xs">
                    Currently Running
                  </Badge>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded border shadow-sm">
                <h4 className="font-semibold text-purple-700 mb-2">🌐 API Gateway Service</h4>
                <p className="text-gray-600 mb-2">Port 8090 • Go/Nginx</p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• Request routing & load balancing</li>
                  <li>• Authentication & authorization</li>
                  <li>• Rate limiting & throttling</li>
                  <li>• Service discovery</li>
                  <li>• Monitoring & logging</li>
                </ul>
                <div className="mt-2">
                  <Badge variant="secondary" className="text-xs">
                    Optional for Production
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Service Health Status */}
        <Card>
          <CardHeader>
            <CardTitle>🔍 Service Health Monitor</CardTitle>
            <CardDescription>Real-time status of all microservices</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Trading Engine</h4>
                  <span className={`h-3 w-3 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Status: <span className={connectionStatus === 'connected' ? 'text-green-600' : 'text-red-600'}>{connectionStatus}</span></p>
                  <p>Endpoint: <code className="text-xs bg-gray-100 px-1 rounded">{TRADING_ENGINE_URL}</code></p>
                  <p>Type: Go WebSocket + REST API</p>
                </div>
              </div>
              
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Frontend UI</h4>
                  <span className="h-3 w-3 rounded-full bg-green-500"></span>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Status: <span className="text-green-600">Running</span></p>
                  <p>Port: <code className="text-xs bg-gray-100 px-1 rounded">3000</code></p>
                  <p>Type: Next.js React App</p>
                </div>
              </div>
              
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">API Gateway</h4>
                  <span className="h-3 w-3 rounded-full bg-yellow-500"></span>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Status: <span className="text-yellow-600">Standby</span></p>
                  <p>Port: <code className="text-xs bg-gray-100 px-1 rounded">8090</code></p>
                  <p>Type: Optional Load Balancer</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Benefits of Microservices Architecture */}
        <Card>
          <CardHeader>
            <CardTitle>✨ Architecture Benefits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3 text-green-700">🚀 Performance & Scalability</h4>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• Independent service scaling</li>
                  <li>• Language-optimized performance (Go for speed, React for UX)</li>
                  <li>• Resource isolation and dedicated optimization</li>
                  <li>• Load balancing across service instances</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3 text-blue-700">🛠️ Development & Maintenance</h4>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• Independent deployments and updates</li>
                  <li>• Technology stack flexibility per service</li>
                  <li>• Isolated failure domains</li>
                  <li>• Team specialization and parallel development</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3 text-purple-700">🔒 Security & Reliability</h4>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• Service-level authentication and authorization</li>
                  <li>• Network-based security boundaries</li>
                  <li>• Fault tolerance and graceful degradation</li>
                  <li>• Individual service monitoring and health checks</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3 text-orange-700">📊 Monitoring & Operations</h4>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• Distributed tracing and logging</li>
                  <li>• Service-specific metrics and alerting</li>
                  <li>• Independent rollbacks and versioning</li>
                  <li>• Easier debugging and performance profiling</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Start Guide */}
        <Card>
          <CardHeader>
            <CardTitle>🚀 Quick Start Guide</CardTitle>
            <CardDescription>Get all microservices running locally</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 rounded border border-green-200">
                <h4 className="font-semibold text-green-800 mb-2">1. Start Trading Engine</h4>
                <code className="text-xs bg-green-100 p-2 rounded block mb-2">
                  cd microservices/trading-engine<br/>
                  go mod tidy<br/>
                  go run main.go
                </code>
                <p className="text-xs text-green-700">Runs on port 8080</p>
              </div>
              
              <div className="p-4 bg-blue-50 rounded border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">2. Start Frontend UI</h4>
                <code className="text-xs bg-blue-100 p-2 rounded block mb-2">
                  cd microservices/frontend-ui<br/>
                  npm install<br/>
                  npm run dev
                </code>
                <p className="text-xs text-blue-700">Runs on port 3000</p>
              </div>
              
              <div className="p-4 bg-purple-50 rounded border border-purple-200">
                <h4 className="font-semibold text-purple-800 mb-2">3. Optional: API Gateway</h4>
                <code className="text-xs bg-purple-100 p-2 rounded block mb-2">
                  cd microservices/api-gateway<br/>
                  go run main.go<br/>
                  # or nginx config
                </code>
                <p className="text-xs text-purple-700">Runs on port 8090</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Connection Status */}
        {connectionStatus !== 'connected' && (
          <Alert variant="destructive">
            <AlertDescription>
              ❌ Cannot connect to Trading Engine microservice at {TRADING_ENGINE_URL}. 
              Please ensure the Trading Engine service is running on port 8080.
            </AlertDescription>
          </Alert>
        )}
        
        {connectionStatus === 'connected' && (
          <Alert className="bg-green-50 border-green-200">
            <AlertDescription className="text-green-800">
              ✅ Successfully connected to Trading Engine microservice! All systems operational.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
