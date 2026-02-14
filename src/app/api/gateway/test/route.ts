import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }
    
    // Test gateway status endpoint
    const statusRes = await fetch(`${url}/api/status`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    })
    
    if (!statusRes.ok) {
      return NextResponse.json({ 
        connected: false, 
        error: `Gateway returned ${statusRes.status}` 
      })
    }
    
    const statusData = await statusRes.json()
    
    // Try to get nodes
    let nodes: Array<{ id: string; name: string; status: string }> = []
    try {
      const nodesRes = await fetch(`${url}/api/nodes/status`, {
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000),
      })
      if (nodesRes.ok) {
        const nodesData = await nodesRes.json()
        nodes = nodesData.nodes || []
      }
    } catch {
      // Nodes endpoint might not exist
    }
    
    // Try to get agents/workspaces count
    let workspaces = 0
    try {
      const agentsRes = await fetch(`${url}/api/agents/list`, {
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000),
      })
      if (agentsRes.ok) {
        const agentsData = await agentsRes.json()
        workspaces = agentsData.agents?.length || 0
      }
    } catch {
      // Agents endpoint might not exist
    }
    
    return NextResponse.json({
      connected: true,
      gateway: {
        version: statusData.version,
        uptime: statusData.uptime,
      },
      nodes,
      workspaces,
    })
  } catch (error) {
    const message = (error as Error).message
    if (message.includes('fetch failed') || message.includes('ECONNREFUSED')) {
      return NextResponse.json({ 
        connected: false, 
        error: 'Could not connect to gateway. Check the URL and ensure the gateway is running.' 
      })
    }
    return NextResponse.json({ 
      connected: false, 
      error: message 
    })
  }
}
