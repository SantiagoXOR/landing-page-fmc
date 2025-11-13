import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    ok: true,
    env: process.env.APP_ENV || 'development',
    timestamp: new Date().toISOString(),
  })
}
