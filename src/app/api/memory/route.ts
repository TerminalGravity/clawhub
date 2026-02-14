import { NextRequest, NextResponse } from 'next/server'
import { readdir, readFile, stat } from 'fs/promises'
import { join, relative } from 'path'
import { existsSync } from 'fs'

const AGENTS_DIR = process.env.AGENTS_DIR || '/root/clawd/agents'

interface FileInfo {
  name: string
  path: string
  type: 'file' | 'directory'
  size?: number
  modified?: string
}

interface MemoryFile {
  path: string
  content: string
  size: number
  modified: string
}

// List files in an agent's workspace
async function listFiles(agentId: string, subpath: string = ''): Promise<FileInfo[]> {
  const basePath = join(AGENTS_DIR, agentId, subpath)
  
  if (!existsSync(basePath)) {
    return []
  }
  
  const entries = await readdir(basePath, { withFileTypes: true })
  const files: FileInfo[] = []
  
  for (const entry of entries) {
    // Skip hidden files and node_modules
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
    
    const fullPath = join(basePath, entry.name)
    const relativePath = join(subpath, entry.name)
    
    try {
      const stats = await stat(fullPath)
      files.push({
        name: entry.name,
        path: relativePath,
        type: entry.isDirectory() ? 'directory' : 'file',
        size: entry.isFile() ? stats.size : undefined,
        modified: stats.mtime.toISOString(),
      })
    } catch {
      // Skip files we can't stat
    }
  }
  
  // Sort: directories first, then by name
  return files.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

// Read a specific file
async function readMemoryFile(agentId: string, filePath: string): Promise<MemoryFile | null> {
  const fullPath = join(AGENTS_DIR, agentId, filePath)
  
  // Security: ensure path doesn't escape agent directory
  const resolvedPath = join(AGENTS_DIR, agentId, filePath)
  if (!resolvedPath.startsWith(join(AGENTS_DIR, agentId))) {
    return null
  }
  
  if (!existsSync(fullPath)) {
    return null
  }
  
  try {
    const stats = await stat(fullPath)
    if (stats.isDirectory()) {
      return null
    }
    
    // Limit file size to 1MB
    if (stats.size > 1024 * 1024) {
      return {
        path: filePath,
        content: '[File too large to display]',
        size: stats.size,
        modified: stats.mtime.toISOString(),
      }
    }
    
    const content = await readFile(fullPath, 'utf-8')
    return {
      path: filePath,
      content,
      size: stats.size,
      modified: stats.mtime.toISOString(),
    }
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const agentId = searchParams.get('agent')
  const filePath = searchParams.get('file')
  const dirPath = searchParams.get('dir') || ''
  
  if (!agentId) {
    return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 })
  }
  
  // Check agent exists
  const agentDir = join(AGENTS_DIR, agentId)
  if (!existsSync(agentDir)) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }
  
  // If file requested, return file content
  if (filePath) {
    const file = await readMemoryFile(agentId, filePath)
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }
    return NextResponse.json({ file })
  }
  
  // Otherwise, list directory
  const files = await listFiles(agentId, dirPath)
  return NextResponse.json({ 
    files,
    path: dirPath,
    agent: agentId,
  })
}
