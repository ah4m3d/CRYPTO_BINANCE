// Broker API Integration for Zerodha, Upstox, etc.

export interface BrokerOrder {
  symbol: string
  quantity: number
  price: number
  orderType: 'MARKET' | 'LIMIT'
  side: 'BUY' | 'SELL'
  product: 'CNC' | 'MIS' | 'NRML'
}

export interface BrokerOrderResponse {
  orderId: string
  status: 'PENDING' | 'COMPLETED' | 'REJECTED'
  message?: string
}

export interface BrokerPosition {
  symbol: string
  quantity: number
  averagePrice: number
  currentPrice: number
  pnl: number
}

// Zerodha Kite Connect Integration
export class ZerodhaService {
  private apiKey: string
  private apiSecret: string
  private accessToken?: string
  private baseUrl = 'https://api.kite.trade'

  constructor(apiKey: string, apiSecret: string) {
    this.apiKey = apiKey
    this.apiSecret = apiSecret
  }

  async authenticate(requestToken: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/session/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          api_key: this.apiKey,
          request_token: requestToken,
          checksum: this.generateChecksum(requestToken),
        }),
      })

      const data = await response.json()
      this.accessToken = data.data.access_token
      return this.accessToken
    } catch (error) {
      throw new Error(`Zerodha authentication failed: ${error}`)
    }
  }

  async placeOrder(order: BrokerOrder): Promise<BrokerOrderResponse> {
    if (!this.accessToken) {
      throw new Error('Not authenticated with Zerodha')
    }

    try {
      const response = await fetch(`${this.baseUrl}/orders/regular`, {
        method: 'POST',
        headers: {
          'Authorization': `token ${this.apiKey}:${this.accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          exchange: 'NSE',
          tradingsymbol: order.symbol,
          transaction_type: order.side,
          quantity: order.quantity.toString(),
          price: order.price.toString(),
          order_type: order.orderType,
          product: order.product,
          validity: 'DAY',
        }),
      })

      const data = await response.json()

      if (data.status === 'success') {
        return {
          orderId: data.data.order_id,
          status: 'PENDING',
        }
      } else {
        throw new Error(data.message)
      }
    } catch (error) {
      return {
        orderId: '',
        status: 'REJECTED',
        message: error instanceof Error ? error.message : 'Order placement failed',
      }
    }
  }

  async getPositions(): Promise<BrokerPosition[]> {
    if (!this.accessToken) {
      throw new Error('Not authenticated with Zerodha')
    }

    try {
      const response = await fetch(`${this.baseUrl}/portfolio/positions`, {
        headers: {
          'Authorization': `token ${this.apiKey}:${this.accessToken}`,
        },
      })

      const data = await response.json()
      
      return data.data.net.map((position: any) => ({
        symbol: position.tradingsymbol,
        quantity: position.quantity,
        averagePrice: position.average_price,
        currentPrice: position.last_price,
        pnl: position.pnl,
      }))
    } catch (error) {
      throw new Error(`Failed to fetch positions: ${error}`)
    }
  }

  async getOrderStatus(orderId: string): Promise<string> {
    if (!this.accessToken) {
      throw new Error('Not authenticated with Zerodha')
    }

    try {
      const response = await fetch(`${this.baseUrl}/orders`, {
        headers: {
          'Authorization': `token ${this.apiKey}:${this.accessToken}`,
        },
      })

      const data = await response.json()
      const order = data.data.find((o: any) => o.order_id === orderId)
      
      return order?.status || 'UNKNOWN'
    } catch (error) {
      throw new Error(`Failed to get order status: ${error}`)
    }
  }

  private generateChecksum(requestToken: string): string {
    const crypto = require('crypto')
    const data = this.apiKey + requestToken + this.apiSecret
    return crypto.createHash('sha256').update(data).digest('hex')
  }
}

// Upstox Integration
export class UpstoxService {
  private apiKey: string
  private apiSecret: string
  private accessToken?: string
  private baseUrl = 'https://api.upstox.com/v2'

  constructor(apiKey: string, apiSecret: string) {
    this.apiKey = apiKey
    this.apiSecret = apiSecret
  }

  async authenticate(authCode: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/login/authorization/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code: authCode,
          client_id: this.apiKey,
          client_secret: this.apiSecret,
          redirect_uri: 'http://localhost:3000/auth/callback/upstox',
          grant_type: 'authorization_code',
        }),
      })

      const data = await response.json()
      this.accessToken = data.access_token
      return this.accessToken
    } catch (error) {
      throw new Error(`Upstox authentication failed: ${error}`)
    }
  }

  async placeOrder(order: BrokerOrder): Promise<BrokerOrderResponse> {
    if (!this.accessToken) {
      throw new Error('Not authenticated with Upstox')
    }

    try {
      const response = await fetch(`${this.baseUrl}/order/place`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quantity: order.quantity,
          product: order.product,
          validity: 'DAY',
          price: order.price,
          tag: 'string',
          instrument_token: order.symbol,
          order_type: order.orderType,
          transaction_type: order.side,
          disclosed_quantity: 0,
          trigger_price: 0,
          is_amo: false,
        }),
      })

      const data = await response.json()

      if (data.status === 'success') {
        return {
          orderId: data.data.order_id,
          status: 'PENDING',
        }
      } else {
        throw new Error(data.message)
      }
    } catch (error) {
      return {
        orderId: '',
        status: 'REJECTED',
        message: error instanceof Error ? error.message : 'Order placement failed',
      }
    }
  }

  async getPositions(): Promise<BrokerPosition[]> {
    if (!this.accessToken) {
      throw new Error('Not authenticated with Upstox')
    }

    try {
      const response = await fetch(`${this.baseUrl}/portfolio/short-term-positions`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      })

      const data = await response.json()
      
      return data.data.map((position: any) => ({
        symbol: position.instrument_token,
        quantity: position.quantity,
        averagePrice: position.average_price,
        currentPrice: position.last_price,
        pnl: position.unrealised_pnl,
      }))
    } catch (error) {
      throw new Error(`Failed to fetch positions: ${error}`)
    }
  }
}

// Factory function to create broker service
export function createBrokerService(broker: 'zerodha' | 'upstox') {
  switch (broker) {
    case 'zerodha':
      return new ZerodhaService(
        process.env.ZERODHA_API_KEY!,
        process.env.ZERODHA_API_SECRET!
      )
    case 'upstox':
      return new UpstoxService(
        process.env.UPSTOX_API_KEY!,
        process.env.UPSTOX_API_SECRET!
      )
    default:
      throw new Error('Unsupported broker')
  }
}
