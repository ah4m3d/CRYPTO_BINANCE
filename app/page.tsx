"use client"

import React, { useState } from "react"
import IntradayScalpingTrader from "@/components/intraday-scalping-trader"

export default function Home() {
  const [isEnabled, setIsEnabled] = useState(false)
  return (
    <main className="container mx-auto p-4">
      <IntradayScalpingTrader 
        technicalData={{}} 
        isEnabled={isEnabled} 
        onToggle={setIsEnabled} 
      />
    </main>
  )
}
