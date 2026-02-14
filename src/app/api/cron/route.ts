import { NextRequest, NextResponse } from 'next/server'

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:6820'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const includeDisabled = searchParams.get('includeDisabled') === 'true'
    
    const query = includeDisabled ? '?includeDisabled=true' : ''
    const res = await fetch(`${GATEWAY_URL}/api/cron/list${query}`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    })
    
    if (!res.ok) {
      console.error('Gateway cron error:', res.status)
      return NextResponse.json({ jobs: [] })
    }
    
    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Cron API error:', error)
    return NextResponse.json({ jobs: [] })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, jobId } = body
    
    if (action === 'run' && jobId) {
      const res = await fetch(`${GATEWAY_URL}/api/cron/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      })
      
      if (!res.ok) {
        return NextResponse.json({ error: 'Failed to trigger job' }, { status: res.status })
      }
      
      return NextResponse.json({ success: true })
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Cron POST error:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
