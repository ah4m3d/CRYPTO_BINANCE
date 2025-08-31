import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { createBrokerService } from "@/lib/broker-service"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const trades = await db.trade.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(trades)
  } catch (error) {
    console.error("Error fetching trades:", error)
    return NextResponse.json(
      { error: "Failed to fetch trades" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { symbol, type, quantity, price, broker = 'demo' } = await request.json()

    // Validate input
    if (!symbol || !type || !quantity || !price) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Get user details
    const user = await db.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Calculate total cost
    const total = quantity * price

    // For demo mode, use a more flexible balance check
    if (broker === 'demo') {
      // Demo mode - more lenient balance check
      const demoBalance = 1000000 // ₹10,00,000 demo balance
      if (type === 'BUY' && total > demoBalance) {
        return NextResponse.json(
          { error: "Demo balance exceeded" },
          { status: 400 }
        )
      }
    } else {
      // Real trading mode - strict balance check
      if (type === 'BUY' && user.balance < total) {
        return NextResponse.json(
          { error: "Insufficient balance" },
          { status: 400 }
        )
      }
    }

    // Create trade record
    const trade = await db.trade.create({
      data: {
        userId: session.user.id,
        symbol: symbol.toUpperCase(),
        type: type.toUpperCase(),
        quantity,
        price,
        total,
        status: 'PENDING'
      }
    })

    // Execute trade based on mode
    if (broker === 'demo') {
      // Demo mode - simulate instant execution
      await new Promise(resolve => setTimeout(resolve, 500)) // Simulate processing delay
      
      // Update trade status to completed for demo
      const updatedTrade = await db.trade.update({
        where: { id: trade.id },
        data: {
          status: 'COMPLETED',
          brokerOrderId: `DEMO_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }
      })

      return NextResponse.json({
        ...updatedTrade,
        message: `Demo ${type} order executed successfully!`,
        demoMode: true
      })
    } else {
      // Real broker trading
      try {
        if (user.brokerApiKey && user.brokerApiSecret) {
          const brokerService = createBrokerService(broker as 'zerodha' | 'upstox')
          
          const orderResult = await brokerService.placeOrder({
            symbol,
            quantity,
            price,
            orderType: 'LIMIT',
            side: type.toUpperCase() as 'BUY' | 'SELL',
            product: 'CNC'
          })

          // Update trade with broker order ID
          const updatedTrade = await db.trade.update({
            where: { id: trade.id },
            data: {
              brokerOrderId: orderResult.orderId,
              status: orderResult.status === 'PENDING' ? 'PENDING' : 'FAILED'
            }
          })

          // Update user balance if trade is successful
          if (orderResult.status === 'PENDING') {
            const balanceChange = type === 'BUY' ? -total : total
            await db.user.update({
              where: { id: session.user.id },
              data: {
                balance: user.balance + balanceChange
              }
            })
          }

          return NextResponse.json({
            ...updatedTrade,
            brokerOrderId: orderResult.orderId,
            status: orderResult.status
          })
        } else {
          // No broker API configured, treat as demo
          const updatedTrade = await db.trade.update({
            where: { id: trade.id },
            data: {
              status: 'COMPLETED',
              brokerOrderId: `SIM_${Date.now()}`
            }
          })

          return NextResponse.json({
            ...updatedTrade,
            message: "Trade simulated (no broker API configured)"
          })
        }
      } catch (error) {
        // Update trade status to failed
        await db.trade.update({
          where: { id: trade.id },
          data: {
            status: 'FAILED'
          }
        })

        return NextResponse.json(
          { error: "Trade execution failed", details: error },
          { status: 500 }
        )
      }
    }
  } catch (error) {
    console.error("Trade API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
