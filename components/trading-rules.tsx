"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"

export function TradingRules() {
  const [rules, setRules] = useState({
    autoTrading: false,
    stopLossPercentage: 5,
    takeProfitPercentage: 10,
    maxDailyTrades: 10,
    maxPositionSize: 1000,
    riskPerTrade: 2,
  })

  const handleSaveRules = () => {
    // In a real app, this would save to a database or API
    console.log("[v0] Saving trading rules:", rules)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Trading Rules Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Auto Trading Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-trading">Auto Trading</Label>
              <div className="text-sm text-muted-foreground">
                Enable automatic buying and selling based on your rules
              </div>
            </div>
            <Switch
              id="auto-trading"
              checked={rules.autoTrading}
              onCheckedChange={(checked) => setRules({ ...rules, autoTrading: checked })}
            />
          </div>

          <Separator />

          {/* Risk Management */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Risk Management</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stop-loss">Stop Loss (%)</Label>
                <Input
                  id="stop-loss"
                  type="number"
                  value={rules.stopLossPercentage}
                  onChange={(e) => setRules({ ...rules, stopLossPercentage: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="take-profit">Take Profit (%)</Label>
                <Input
                  id="take-profit"
                  type="number"
                  value={rules.takeProfitPercentage}
                  onChange={(e) => setRules({ ...rules, takeProfitPercentage: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="risk-per-trade">Risk Per Trade (%)</Label>
              <Input
                id="risk-per-trade"
                type="number"
                value={rules.riskPerTrade}
                onChange={(e) => setRules({ ...rules, riskPerTrade: Number(e.target.value) })}
              />
            </div>
          </div>

          <Separator />

          {/* Position Limits */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Position Limits</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max-daily-trades">Max Daily Trades</Label>
                <Input
                  id="max-daily-trades"
                  type="number"
                  value={rules.maxDailyTrades}
                  onChange={(e) => setRules({ ...rules, maxDailyTrades: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-position-size">Max Position Size (₹)</Label>
                <Input
                  id="max-position-size"
                  type="number"
                  value={rules.maxPositionSize}
                  onChange={(e) => setRules({ ...rules, maxPositionSize: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveRules}>Save Rules</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
