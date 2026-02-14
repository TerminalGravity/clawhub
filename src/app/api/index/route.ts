import { NextRequest, NextResponse } from 'next/server'
import { 
  indexWorkspace, 
  indexAllWorkspaces, 
  indexGlobal, 
  getStats,
  clearIndex 
} from '@/lib/lancedb'

const AGENTS_DIR = process.env.AGENTS_DIR || '/root/clawd/agents'
const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || '/root/clawd'

/**
 * GET /api/index - Get index statistics
 */
export async function GET() {
  try {
    const stats = await getStats()
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Index stats error:', error)
    return NextResponse.json({ 
      error: (error as Error).message 
    }, { status: 500 })
  }
}

/**
 * POST /api/index - Trigger indexing
 * 
 * Body:
 * - action: 'workspace' | 'all' | 'global' | 'clear'
 * - workspaceId?: string (required for action='workspace')
 * - scope?: string (for action='clear')
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, workspaceId, scope } = body
    
    switch (action) {
      case 'workspace': {
        if (!workspaceId) {
          return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
        }
        
        const workspacePath = `${AGENTS_DIR}/${workspaceId}`
        const count = await indexWorkspace(workspaceId, workspacePath)
        
        return NextResponse.json({
          action: 'workspace',
          workspaceId,
          documentsIndexed: count,
        })
      }
      
      case 'all': {
        const results = await indexAllWorkspaces(AGENTS_DIR)
        const globalCount = await indexGlobal(WORKSPACE_ROOT)
        
        return NextResponse.json({
          action: 'all',
          workspaces: results,
          global: globalCount,
          totalDocuments: Object.values(results).reduce((a, b) => a + b, 0) + globalCount,
        })
      }
      
      case 'global': {
        const count = await indexGlobal(WORKSPACE_ROOT)
        
        return NextResponse.json({
          action: 'global',
          documentsIndexed: count,
        })
      }
      
      case 'clear': {
        await clearIndex(scope)
        
        return NextResponse.json({
          action: 'clear',
          scope: scope || 'all',
        })
      }
      
      default:
        return NextResponse.json({ 
          error: 'Invalid action. Use: workspace, all, global, or clear' 
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Index error:', error)
    return NextResponse.json({ 
      error: (error as Error).message 
    }, { status: 500 })
  }
}
