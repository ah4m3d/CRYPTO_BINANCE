import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: Request) {
  const body = await req.json();
  const backendUrl = process.env.NEXT_PUBLIC_TRADING_ENGINE_URL || 'http://localhost:8080';

  const response = await fetch(`${backendUrl}/api/binance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
