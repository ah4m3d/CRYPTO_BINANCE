'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TechnicalIndicatorsDisplay } from './technical-indicators-display';
import { scalpingTechnicalConfig, scalpingTradingSettings } from '@/config/scalping-config';

interface ScalpingDashboardProps {
  tradingState: any;
  onSettingsUpdate: (settings: any) => Promise<void>;
}

export function ScalpingDashboard({ tradingState, onSettingsUpdate }: ScalpingDashboardProps) {
  const [scalpingMode, setScalpingMode] = useState(false);

  const enableScalpingMode = async () => {
    await onSettingsUpdate(scalpingTradingSettings);
    setScalpingMode(true);
  };

  const getScalpingSignal = (technical: any) => {
    if (!technical) return { signal: 'HOLD', strength: 'WEAK', color: 'gray' };

    const ema9 = technical.ema9;
    const ema21 = technical.ema21;
    const rsi = technical.rsi;
    const macd = technical.macd;
    const vwap = technical.vwap;
    const price = tradingState?.watchlist?.find((coin: any) => 
      coin.technical === technical
    )?.price || 0;

    let bullishSignals = 0;
    let bearishSignals = 0;

    // EMA9 vs EMA21 crossover
    if (ema9 > ema21) bullishSignals++;
    else bearishSignals++;

    // RSI momentum
    if (rsi < 80 && rsi > 50) bullishSignals++;
    else if (rsi > 20 && rsi < 50) bearishSignals++;

    // MACD momentum
    if (macd > 0) bullishSignals++;
    else bearishSignals++;

    // VWAP position
    if (vwap > 0) {
      if (price > vwap) bullishSignals++;
      else bearishSignals++;
    }

    if (bullishSignals >= 3) {
      return { 
        signal: 'SCALP BUY', 
        strength: bullishSignals === 4 ? 'STRONG' : 'MODERATE',
        color: bullishSignals === 4 ? 'green' : 'blue'
      };
    } else if (bearishSignals >= 3) {
      return { 
        signal: 'SCALP SELL', 
        strength: bearishSignals === 4 ? 'STRONG' : 'MODERATE',
        color: bearishSignals === 4 ? 'red' : 'orange'
      };
    }

    return { signal: 'WAIT', strength: 'WEAK', color: 'gray' };
  };

  const getQuickStats = () => {
    const positions = tradingState?.positions || [];
    const totalPnL = tradingState?.totalPnL || 0;
    const dayPnL = tradingState?.dayPnL || 0;
    
    const avgHoldTime = positions.length > 0 
      ? positions.reduce((acc: number, pos: any) => {
          const entryTime = new Date(pos.entryTime).getTime();
          const currentTime = new Date().getTime();
          return acc + (currentTime - entryTime) / (1000 * 60); // minutes
        }, 0) / positions.length
      : 0;

    return { totalPnL, dayPnL, avgHoldTime: avgHoldTime.toFixed(1) };
  };

  const stats = getQuickStats();

  return (
    <div className="space-y-6">
      {/* Scalping Mode Toggle */}
      <Card className="border-2 border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            🏆 Intraday Scalping Mode
            <Badge variant={scalpingMode ? "default" : "secondary"}>
              {scalpingMode ? "ACTIVE" : "STANDARD"}
            </Badge>
          </CardTitle>
          <CardDescription>
            Optimized for short-term, high-frequency trading with tight stop losses and quick profits
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!scalpingMode ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Stop Loss:</span>
                  <div className="font-semibold text-red-600">0.5%</div>
                </div>
                <div>
                  <span className="text-gray-600">Take Profit:</span>
                  <div className="font-semibold text-green-600">1.0%</div>
                </div>
                <div>
                  <span className="text-gray-600">Max Hold:</span>
                  <div className="font-semibold">5 min</div>
                </div>
                <div>
                  <span className="text-gray-600">Position Size:</span>
                  <div className="font-semibold">$5,000</div>
                </div>
              </div>
              <Button onClick={enableScalpingMode} className="w-full">
                🚀 Enable Scalping Mode
              </Button>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-green-600 font-semibold">✅ Scalping Mode Active</div>
              <div className="text-sm text-gray-600 mt-1">
                System optimized for intraday scalping with fast signals and tight risk management
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scalping Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Total P&L</div>
            <div className={`text-xl font-bold ${stats.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${stats.totalPnL.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Day P&L</div>
            <div className={`text-xl font-bold ${stats.dayPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${stats.dayPnL.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Active Positions</div>
            <div className="text-xl font-bold">
              {tradingState?.positions?.length || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Avg Hold Time</div>
            <div className="text-xl font-bold">
              {stats.avgHoldTime}m
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scalping Signals Grid */}
      <Card>
        <CardHeader>
          <CardTitle>⚡ Scalping Signals</CardTitle>
          <CardDescription>
            Real-time scalping opportunities with EMA9/21 crossovers, RSI momentum, and VWAP levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tradingState?.watchlist?.slice(0, 6).map((coin: any) => {
              const scalpSignal = getScalpingSignal(coin.technical);
              const priceChange = coin.changePercent || 0;
              
              return (
                <div 
                  key={coin.symbol} 
                  className={`border rounded-lg p-4 transition-all hover:shadow-md ${
                    scalpSignal.signal.includes('BUY') ? 'border-green-200 bg-green-50' :
                    scalpSignal.signal.includes('SELL') ? 'border-red-200 bg-red-50' :
                    'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{coin.symbol}</h3>
                      <p className="text-sm text-gray-500">{coin.name}</p>
                    </div>
                    <Badge 
                      variant={
                        scalpSignal.signal.includes('BUY') ? 'default' :
                        scalpSignal.signal.includes('SELL') ? 'destructive' :
                        'secondary'
                      }
                      className="text-xs"
                    >
                      {scalpSignal.signal}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-lg font-bold">
                        ${coin.price?.toLocaleString() || '0'}
                      </span>
                      <span className={`text-sm font-medium ${
                        priceChange >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {priceChange > 0 ? '+' : ''}{priceChange.toFixed(2)}%
                      </span>
                    </div>
                    
                    <div className="text-xs text-gray-600">
                      Signal Strength: 
                      <span className={`ml-1 font-medium ${
                        scalpSignal.strength === 'STRONG' ? 'text-green-600' :
                        scalpSignal.strength === 'MODERATE' ? 'text-yellow-600' :
                        'text-gray-500'
                      }`}>
                        {scalpSignal.strength}
                      </span>
                    </div>
                  </div>
                  
                  {/* Scalping-optimized technical indicators */}
                  <TechnicalIndicatorsDisplay 
                    technical={coin.technical} 
                    config={scalpingTechnicalConfig}
                    className="mt-2"
                  />
                  
                  <div className="text-xs text-gray-400 mt-2">
                    Last: {new Date(coin.lastUpdate).toLocaleTimeString()}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Scalping Tips */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800">💡 Scalping Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold text-blue-700 mb-2">Entry Signals:</h4>
              <ul className="space-y-1 text-blue-600">
                <li>• EMA9 crosses above EMA21 (bullish)</li>
                <li>• RSI between 20-80 (momentum)</li>
                <li>• MACD positive (momentum)</li>
                <li>• Price above VWAP (strength)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-blue-700 mb-2">Risk Management:</h4>
              <ul className="space-y-1 text-blue-600">
                <li>• Stop Loss: 0.5% (tight control)</li>
                <li>• Take Profit: 1.0% (quick gains)</li>
                <li>• Max Hold: 5 minutes</li>
                <li>• Position Size: $5,000 max</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
