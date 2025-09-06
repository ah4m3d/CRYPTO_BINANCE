'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface TradingSettings {
  minConfidence: number;
  maxPositionSize: number;
  riskPerTrade: number;
  maxDailyLoss: number;
  maxPositions: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  maxHoldTime: number;
  scalingFactor: number;
  isEnabled: boolean;
}

interface TradingSettingsPanelProps {
  settings: TradingSettings;
  onUpdate: (settings: TradingSettings) => Promise<void>;
  loading?: boolean;
}

export function TradingSettingsPanel({ settings, onUpdate, loading = false }: TradingSettingsPanelProps) {
  const [localSettings, setLocalSettings] = useState<TradingSettings>(settings);
  const [hasChanges, setHasChanges] = useState(false);

  const handleChange = (field: keyof TradingSettings, value: number) => {
    const newSettings = { ...localSettings, [field]: value };
    setLocalSettings(newSettings);
    
    // Check if there are changes
    const changed = Object.keys(settings).some(key => 
      settings[key as keyof TradingSettings] !== newSettings[key as keyof TradingSettings]
    );
    setHasChanges(changed);
  };

  const handleSave = async () => {
    await onUpdate(localSettings);
    setHasChanges(false);
  };

  const handleReset = () => {
    setLocalSettings(settings);
    setHasChanges(false);
  };

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Badge variant={hasChanges ? "destructive" : "secondary"}>
            {hasChanges ? "Unsaved Changes" : "Settings Saved"}
          </Badge>
          {hasChanges && (
            <span className="text-sm text-yellow-600">
              Save your changes to apply them to the trading engine
            </span>
          )}
        </div>
        <div className="flex space-x-2">
          {hasChanges && (
            <Button variant="outline" onClick={handleReset} disabled={loading}>
              Reset
            </Button>
          )}
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || loading}
            className="min-w-[100px]"
          >
            {loading ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>

      <Separator />

      {/* Risk Management Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🛡️ Risk Management</CardTitle>
          <CardDescription>
            Configure your risk tolerance and protection parameters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="stopLoss">Stop Loss Percentage</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="stopLoss"
                  type="number"
                  value={localSettings.stopLossPercent}
                  onChange={(e) => handleChange('stopLossPercent', parseFloat(e.target.value) || 0)}
                  min="0"
                  max="10"
                  step="0.1"
                  className="w-24"
                />
                <span className="text-sm text-gray-500">%</span>
                <span className="text-xs text-gray-400">
                  Auto-sell if loss exceeds this %
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="takeProfit">Take Profit Percentage</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="takeProfit"
                  type="number"
                  value={localSettings.takeProfitPercent}
                  onChange={(e) => handleChange('takeProfitPercent', parseFloat(e.target.value) || 0)}
                  min="0"
                  max="20"
                  step="0.1"
                  className="w-24"
                />
                <span className="text-sm text-gray-500">%</span>
                <span className="text-xs text-gray-400">
                  Auto-sell if profit reaches this %
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="riskPerTrade">Risk Per Trade</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="riskPerTrade"
                  type="number"
                  value={localSettings.riskPerTrade}
                  onChange={(e) => handleChange('riskPerTrade', parseFloat(e.target.value) || 0)}
                  min="0.1"
                  max="10"
                  step="0.1"
                  className="w-24"
                />
                <span className="text-sm text-gray-500">%</span>
                <span className="text-xs text-gray-400">
                  % of balance to risk per trade
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxDailyLoss">Max Daily Loss</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="maxDailyLoss"
                  type="number"
                  value={localSettings.maxDailyLoss}
                  onChange={(e) => handleChange('maxDailyLoss', parseFloat(e.target.value) || 0)}
                  min="100"
                  max="10000"
                  step="100"
                  className="w-32"
                />
                <span className="text-sm text-gray-500">USD</span>
                <span className="text-xs text-gray-400">
                  Stop trading if daily loss exceeds
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Signal & Confidence Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📊 Signal & Confidence</CardTitle>
          <CardDescription>
            Configure when the system should trigger trades based on technical analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="minConfidence">Minimum Confidence Level</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="minConfidence"
                  type="number"
                  value={localSettings.minConfidence}
                  onChange={(e) => handleChange('minConfidence', parseFloat(e.target.value) || 0)}
                  min="50"
                  max="95"
                  step="1"
                  className="w-24"
                />
                <span className="text-sm text-gray-500">%</span>
                <span className="text-xs text-gray-400">
                  Only trade signals above this confidence
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scalingFactor">Signal Scaling Factor</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="scalingFactor"
                  type="number"
                  value={localSettings.scalingFactor}
                  onChange={(e) => handleChange('scalingFactor', parseInt(e.target.value) || 0)}
                  min="1"
                  max="3"
                  step="1"
                  className="w-24"
                />
                <span className="text-sm text-gray-500">x</span>
                <span className="text-xs text-gray-400">
                  Multiplier for signal strength
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Position Management Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📈 Position Management</CardTitle>
          <CardDescription>
            Control how many positions you hold and their sizes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="maxPositions">Maximum Positions</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="maxPositions"
                  type="number"
                  value={localSettings.maxPositions}
                  onChange={(e) => handleChange('maxPositions', parseInt(e.target.value) || 0)}
                  min="1"
                  max="20"
                  step="1"
                  className="w-24"
                />
                <span className="text-xs text-gray-400">
                  Max concurrent open positions
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxPositionSize">Max Position Size</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="maxPositionSize"
                  type="number"
                  value={localSettings.maxPositionSize}
                  onChange={(e) => handleChange('maxPositionSize', parseFloat(e.target.value) || 0)}
                  min="100"
                  max="50000"
                  step="100"
                  className="w-32"
                />
                <span className="text-sm text-gray-500">USD</span>
                <span className="text-xs text-gray-400">
                  Maximum value per position
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxHoldTime">Max Hold Time</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="maxHoldTime"
                  type="number"
                  value={localSettings.maxHoldTime}
                  onChange={(e) => handleChange('maxHoldTime', parseInt(e.target.value) || 0)}
                  min="5"
                  max="1440"
                  step="5"
                  className="w-24"
                />
                <span className="text-sm text-gray-500">min</span>
                <span className="text-xs text-gray-400">
                  Auto-close positions after this time
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Values Summary */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-lg">📋 Current Configuration Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">Stop Loss:</span>
              <span className="block text-red-600">{localSettings.stopLossPercent}%</span>
            </div>
            <div>
              <span className="font-medium">Take Profit:</span>
              <span className="block text-green-600">{localSettings.takeProfitPercent}%</span>
            </div>
            <div>
              <span className="font-medium">Min Confidence:</span>
              <span className="block text-blue-600">{localSettings.minConfidence}%</span>
            </div>
            <div>
              <span className="font-medium">Max Positions:</span>
              <span className="block">{localSettings.maxPositions}</span>
            </div>
            <div>
              <span className="font-medium">Risk/Trade:</span>
              <span className="block">{localSettings.riskPerTrade}%</span>
            </div>
            <div>
              <span className="font-medium">Daily Loss Limit:</span>
              <span className="block">${localSettings.maxDailyLoss}</span>
            </div>
            <div>
              <span className="font-medium">Max Position:</span>
              <span className="block">${localSettings.maxPositionSize}</span>
            </div>
            <div>
              <span className="font-medium">Max Hold:</span>
              <span className="block">{localSettings.maxHoldTime}m</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
