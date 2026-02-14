import { NextResponse } from 'next/server'
import { readdir, readFile, stat } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const AGENTS_DIR = process.env.AGENTS_DIR || '/root/clawd/agents'
const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || '/root/clawd'

interface AgentInfo {
  id: string
  name: string
  description: string
  status: 'online' | 'busy' | 'offline'
  avatar: string
  workdir: string
  memorySize?: string
  lastActivity?: string
  blockers?: string[]
}

// Extract name/description from SOUL.md or IDENTITY.md
async function parseAgentIdentity(agentDir: string): Promise<{ name?: string; description?: string; avatar?: string }> {
  const result: { name?: string; description?: string; avatar?: string } = {}
  
  // Try SOUL.md first
  const soulPath = join(agentDir, 'SOUL.md')
  if (existsSync(soulPath)) {
    try {
      const content = await readFile(soulPath, 'utf-8')
      const nameMatch = content.match(/^\*\*Name:\*\*\s*(.+)$/m) || content.match(/^Name:\s*(.+)$/m)
      const focusMatch = content.match(/^\*\*Focus:\*\*\s*(.+)$/m)
      const vibeMatch = content.match(/^\*\*Vibe:\*\*\s*(.+)$/m)
      
      if (nameMatch) result.name = nameMatch[1].trim()
      if (focusMatch) result.description = focusMatch[1].trim()
      else if (vibeMatch) result.description = vibeMatch[1].trim()
      
      // Extract emoji from content
      const emojiMatch = content.match(/^\*\*Emoji:\*\*\s*(\p{Emoji})/mu)
      if (emojiMatch) result.avatar = emojiMatch[1]
    } catch {}
  }
  
  // Try IDENTITY.md as fallback
  const identityPath = join(agentDir, 'IDENTITY.md')
  if (!result.name && existsSync(identityPath)) {
    try {
      const content = await readFile(identityPath, 'utf-8')
      const nameMatch = content.match(/^\*\*Name:\*\*\s*(.+)$/m) || content.match(/- \*\*Name:\*\*\s*(.+)$/m)
      const creatureMatch = content.match(/^\*\*Creature:\*\*\s*(.+)$/m) || content.match(/- \*\*Creature:\*\*\s*(.+)$/m)
      const emojiMatch = content.match(/^\*\*Emoji:\*\*\s*(\p{Emoji})/mu) || content.match(/- \*\*Emoji:\*\*\s*(\p{Emoji})/mu)
      
      if (nameMatch) result.name = nameMatch[1].trim()
      if (creatureMatch) result.description = creatureMatch[1].trim()
      if (emojiMatch) result.avatar = emojiMatch[1]
    } catch {}
  }
  
  return result
}

// Get file size in human-readable format
async function getMemorySize(agentDir: string): Promise<string | undefined> {
  const memoryPath = join(agentDir, 'MEMORY.md')
  try {
    const stats = await stat(memoryPath)
    const kb = stats.size / 1024
    return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(1)} KB`
  } catch {
    return undefined
  }
}

// Extract blockers from MEMORY.md or workspace BLOCKERS.md
async function getBlockers(agentDir: string): Promise<string[]> {
  const blockers: string[] = []
  
  // Check workspace-level BLOCKERS.md
  const workspaceBlockersPath = join(WORKSPACE_ROOT, 'BLOCKERS.md')
  if (existsSync(workspaceBlockersPath)) {
    try {
      const content = await readFile(workspaceBlockersPath, 'utf-8')
      // Extract lines that look like blockers
      const matches = content.matchAll(/^[-*]\s*\[[ x]\]\s*(.+)$/gm)
      for (const match of matches) {
        if (!match[1].startsWith('[x]')) {
          blockers.push(match[1].trim())
        }
      }
    } catch {}
  }
  
  return blockers.slice(0, 3) // Max 3 blockers per agent
}

// Default avatars by agent type
const DEFAULT_AVATARS: Record<string, string> = {
  ugc: '🎬',
  scraper: '🕷️',
  vape: '💨',
  adminops: '📋',
  kai: '🦞',
  personal: '🤖',
  shopify: '🛍️',
  default: '🤖'
}

export async function GET() {
  try {
    const entries = await readdir(AGENTS_DIR, { withFileTypes: true })
    const agentDirs = entries.filter(e => e.isDirectory())
    
    const agents: AgentInfo[] = await Promise.all(
      agentDirs.map(async (dir) => {
        const agentDir = join(AGENTS_DIR, dir.name)
        const identity = await parseAgentIdentity(agentDir)
        const memorySize = await getMemorySize(agentDir)
        const blockers = await getBlockers(agentDir)
        
        // Try to get last modified time of MEMORY.md or memory/ dir
        let lastActivity: string | undefined
        try {
          const memoryPath = join(agentDir, 'MEMORY.md')
          const memoryStats = await stat(memoryPath)
          const ago = Date.now() - memoryStats.mtimeMs
          if (ago < 60000) lastActivity = 'Just now'
          else if (ago < 3600000) lastActivity = `${Math.floor(ago / 60000)}m ago`
          else if (ago < 86400000) lastActivity = `${Math.floor(ago / 3600000)}h ago`
          else lastActivity = `${Math.floor(ago / 86400000)}d ago`
        } catch {}
        
        return {
          id: dir.name,
          name: identity.name || dir.name.charAt(0).toUpperCase() + dir.name.slice(1),
          description: identity.description || `${dir.name} agent`,
          status: 'offline' as const, // Will be updated with real session data
          avatar: identity.avatar || DEFAULT_AVATARS[dir.name] || DEFAULT_AVATARS.default,
          workdir: agentDir,
          memorySize,
          lastActivity,
          blockers: blockers.length > 0 ? blockers : undefined
        }
      })
    )
    
    return NextResponse.json({ agents })
  } catch (error) {
    console.error('Error listing agents:', error)
    return NextResponse.json({ error: 'Failed to list agents' }, { status: 500 })
  }
}
