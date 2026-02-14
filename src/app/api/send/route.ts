import { NextRequest, NextResponse } from 'next/server'

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:6820'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentId, message, sessionKey, timeoutSeconds = 120 } = body
    
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }
    
    if (!agentId && !sessionKey) {
      return NextResponse.json({ error: 'Either agentId or sessionKey is required' }, { status: 400 })
    }
    
    // Send to gateway
    const res = await fetch(`${GATEWAY_URL}/api/sessions/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agentId,
        sessionKey,
        message,
        timeoutSeconds,
      }),
    })
    
    if (!res.ok) {
      const errorText = await res.text()
      console.error('Gateway send error:', res.status, errorText)
      return NextResponse.json({ error: `Gateway error: ${res.status}` }, { status: res.status })
    }
    
    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Send API error:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
