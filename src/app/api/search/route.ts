import { NextRequest, NextResponse } from 'next/server'
import { search } from '@/lib/lancedb'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, scope, scopeId, limit = 10, minScore = 0.5 } = body
    
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }
    
    const results = await search(query, {
      scope,
      scopeId,
      limit,
      minScore,
    })
    
    return NextResponse.json({
      query,
      results,
      count: results.length,
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ 
      error: (error as Error).message 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')
  const scope = searchParams.get('scope') as 'global' | 'project' | 'workspace' | 'cross' | 'all' | undefined
  const scopeId = searchParams.get('scopeId') || undefined
  const limit = parseInt(searchParams.get('limit') || '10')
  
  if (!query) {
    return NextResponse.json({ error: 'Query (q) is required' }, { status: 400 })
  }
  
  try {
    const results = await search(query, { scope, scopeId, limit })
    
    return NextResponse.json({
      query,
      results,
      count: results.length,
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ 
      error: (error as Error).message 
    }, { status: 500 })
  }
}
