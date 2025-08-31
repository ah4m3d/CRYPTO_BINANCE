import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const watchlist = await db.watchlist.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Fetch current stock prices for watchlist items
    const symbols = watchlist.map(item => item.symbol).join(',')
    if (symbols) {
      const stockPricesResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/stocks?symbols=${symbols}`)
      const stockPrices = await stockPricesResponse.json()

      // Merge watchlist data with current prices
      const enrichedWatchlist = watchlist.map(item => {
        const currentData = stockPrices.find((stock: any) => stock.symbol === item.symbol)
        return {
          ...item,
          currentPrice: currentData?.price || 0,
          change: currentData?.change || 0,
          changePercent: currentData?.changePercent || 0,
          volume: currentData?.volume || 0,
          status: 'monitoring' as const
        }
      })

      return NextResponse.json(enrichedWatchlist)
    }

    return NextResponse.json([])
  } catch (error) {
    console.error("Error fetching watchlist:", error)
    return NextResponse.json(
      { error: "Failed to fetch watchlist" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { symbol, name, buyPrice, sellPrice, quantity } = await request.json()

    if (!symbol) {
      return NextResponse.json(
        { error: "Symbol is required" },
        { status: 400 }
      )
    }

    // Check if already exists
    const existing = await db.watchlist.findUnique({
      where: {
        userId_symbol: {
          userId: session.user.id,
          symbol: symbol.toUpperCase()
        }
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: "Stock already in watchlist" },
        { status: 400 }
      )
    }

    const watchlistItem = await db.watchlist.create({
      data: {
        userId: session.user.id,
        symbol: symbol.toUpperCase(),
        name: name || `${symbol.toUpperCase()} Ltd.`,
        buyPrice,
        sellPrice,
        quantity: quantity || 0
      }
    })

    return NextResponse.json(watchlistItem)
  } catch (error) {
    console.error("Error adding to watchlist:", error)
    return NextResponse.json(
      { error: "Failed to add to watchlist" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')

    if (!symbol) {
      return NextResponse.json(
        { error: "Symbol is required" },
        { status: 400 }
      )
    }

    await db.watchlist.deleteMany({
      where: {
        userId: session.user.id,
        symbol: symbol.toUpperCase()
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing from watchlist:", error)
    return NextResponse.json(
      { error: "Failed to remove from watchlist" },
      { status: 500 }
    )
  }
}
