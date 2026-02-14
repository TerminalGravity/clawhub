/**
 * LanceDB + OpenAI Embeddings Integration
 * 
 * Provides semantic search at multiple scopes:
 * - Global (gateway level)
 * - Per-project
 * - Per-workspace (agent)
 * - Cross-workspace
 */

import * as lancedb from '@lancedb/lancedb'
import OpenAI from 'openai'
import { readFile, readdir, stat } from 'fs/promises'
import { join, relative } from 'path'
import { existsSync } from 'fs'

// Configuration
const LANCE_DB_PATH = process.env.LANCE_DB_PATH || '/root/clawd/.lancedb'
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const EMBEDDING_MODEL = 'text-embedding-3-small'
const EMBEDDING_DIMENSIONS = 1536

// OpenAI client
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null

// Types
export interface MemoryDocument {
  id: string
  content: string
  scope: 'global' | 'project' | 'workspace' | 'cross'
  scopeId?: string // project or workspace ID
  sourcePath: string
  sourceType: 'memory' | 'soul' | 'daily' | 'document' | 'conversation'
  timestamp: string
  metadata?: Record<string, unknown>
}

export interface SearchResult {
  document: MemoryDocument
  score: number
  snippet: string
}

export interface IndexStats {
  totalDocuments: number
  byScope: Record<string, number>
  lastIndexed?: string
}

// Database singleton
let db: lancedb.Connection | null = null

async function getDb(): Promise<lancedb.Connection> {
  if (!db) {
    db = await lancedb.connect(LANCE_DB_PATH)
  }
  return db
}

/**
 * Generate embeddings for text using OpenAI
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!openai) {
    throw new Error('OpenAI API key not configured')
  }
  
  // Truncate text to fit model limits (~8000 tokens ≈ 32000 chars)
  const truncated = text.slice(0, 32000)
  
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: truncated,
  })
  
  return response.data[0].embedding
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (!openai) {
    throw new Error('OpenAI API key not configured')
  }
  
  const truncated = texts.map(t => t.slice(0, 32000))
  
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: truncated,
  })
  
  return response.data.map(d => d.embedding)
}

/**
 * Get or create a table for a specific scope
 */
async function getTable(scope: string): Promise<lancedb.Table> {
  const database = await getDb()
  const tableName = `memory_${scope}`
  
  const tables = await database.tableNames()
  
  if (tables.includes(tableName)) {
    return database.openTable(tableName)
  }
  
  // Create new table with schema
  return database.createTable(tableName, [{
    id: 'init',
    content: '',
    scope: scope,
    scopeId: '',
    sourcePath: '',
    sourceType: 'document',
    timestamp: new Date().toISOString(),
    metadata: {},
    vector: new Array(EMBEDDING_DIMENSIONS).fill(0),
  }])
}

/**
 * Index a document into LanceDB
 */
export async function indexDocument(doc: MemoryDocument): Promise<void> {
  const embedding = await generateEmbedding(doc.content)
  
  const table = await getTable(doc.scope)
  
  await table.add([{
    ...doc,
    vector: embedding,
  }])
}

/**
 * Index multiple documents in batch
 */
export async function indexDocuments(docs: MemoryDocument[]): Promise<void> {
  if (docs.length === 0) return
  
  // Group by scope
  const byScope = docs.reduce((acc, doc) => {
    if (!acc[doc.scope]) acc[doc.scope] = []
    acc[doc.scope].push(doc)
    return acc
  }, {} as Record<string, MemoryDocument[]>)
  
  for (const [scope, scopeDocs] of Object.entries(byScope)) {
    const embeddings = await generateEmbeddings(scopeDocs.map(d => d.content))
    
    const table = await getTable(scope)
    
    const records = scopeDocs.map((doc, i) => ({
      ...doc,
      vector: embeddings[i],
    }))
    
    await table.add(records)
  }
}

/**
 * Search for similar documents
 */
export async function search(
  query: string,
  options: {
    scope?: 'global' | 'project' | 'workspace' | 'cross' | 'all'
    scopeId?: string
    limit?: number
    minScore?: number
  } = {}
): Promise<SearchResult[]> {
  const { scope = 'all', scopeId, limit = 10, minScore = 0.5 } = options
  
  const queryEmbedding = await generateEmbedding(query)
  
  const scopes = scope === 'all' 
    ? ['global', 'project', 'workspace', 'cross'] 
    : [scope]
  
  const results: SearchResult[] = []
  
  for (const s of scopes) {
    try {
      const table = await getTable(s)
      
      let searchQuery = table.vectorSearch(queryEmbedding).limit(limit)
      
      // Filter by scopeId if provided
      if (scopeId) {
        searchQuery = searchQuery.where(`scopeId = '${scopeId}'`)
      }
      
      const searchResults = await searchQuery.toArray()
      
      for (const result of searchResults) {
        const score = 1 - (result._distance || 0) // Convert distance to similarity
        
        if (score >= minScore) {
          results.push({
            document: {
              id: result.id,
              content: result.content,
              scope: result.scope,
              scopeId: result.scopeId,
              sourcePath: result.sourcePath,
              sourceType: result.sourceType,
              timestamp: result.timestamp,
              metadata: result.metadata,
            },
            score,
            snippet: result.content.slice(0, 500),
          })
        }
      }
    } catch (e) {
      // Table might not exist yet
      console.warn(`Search in scope ${s} failed:`, e)
    }
  }
  
  // Sort by score and limit
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/**
 * Index all memory files from a workspace
 */
export async function indexWorkspace(
  workspaceId: string,
  workspacePath: string
): Promise<number> {
  const docs: MemoryDocument[] = []
  
  // Index MEMORY.md
  const memoryPath = join(workspacePath, 'MEMORY.md')
  if (existsSync(memoryPath)) {
    const content = await readFile(memoryPath, 'utf-8')
    docs.push({
      id: `${workspaceId}:MEMORY.md`,
      content,
      scope: 'workspace',
      scopeId: workspaceId,
      sourcePath: 'MEMORY.md',
      sourceType: 'memory',
      timestamp: new Date().toISOString(),
    })
  }
  
  // Index SOUL.md
  const soulPath = join(workspacePath, 'SOUL.md')
  if (existsSync(soulPath)) {
    const content = await readFile(soulPath, 'utf-8')
    docs.push({
      id: `${workspaceId}:SOUL.md`,
      content,
      scope: 'workspace',
      scopeId: workspaceId,
      sourcePath: 'SOUL.md',
      sourceType: 'soul',
      timestamp: new Date().toISOString(),
    })
  }
  
  // Index memory/ directory
  const memoryDir = join(workspacePath, 'memory')
  if (existsSync(memoryDir)) {
    const files = await readdir(memoryDir)
    for (const file of files) {
      if (file.endsWith('.md')) {
        const filePath = join(memoryDir, file)
        const content = await readFile(filePath, 'utf-8')
        docs.push({
          id: `${workspaceId}:memory/${file}`,
          content,
          scope: 'workspace',
          scopeId: workspaceId,
          sourcePath: `memory/${file}`,
          sourceType: 'daily',
          timestamp: new Date().toISOString(),
        })
      }
    }
  }
  
  if (docs.length > 0) {
    await indexDocuments(docs)
  }
  
  return docs.length
}

/**
 * Index all workspaces in an agents directory
 */
export async function indexAllWorkspaces(agentsDir: string): Promise<Record<string, number>> {
  const results: Record<string, number> = {}
  
  if (!existsSync(agentsDir)) return results
  
  const entries = await readdir(agentsDir, { withFileTypes: true })
  
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const workspacePath = join(agentsDir, entry.name)
      const count = await indexWorkspace(entry.name, workspacePath)
      results[entry.name] = count
    }
  }
  
  return results
}

/**
 * Index global documents (PROJECTS.md, BLOCKERS.md, etc.)
 */
export async function indexGlobal(workspaceRoot: string): Promise<number> {
  const docs: MemoryDocument[] = []
  
  const globalFiles = ['PROJECTS.md', 'BLOCKERS.md', 'CONTACTS.md', 'USER.md']
  
  for (const file of globalFiles) {
    const filePath = join(workspaceRoot, file)
    if (existsSync(filePath)) {
      const content = await readFile(filePath, 'utf-8')
      docs.push({
        id: `global:${file}`,
        content,
        scope: 'global',
        sourcePath: file,
        sourceType: 'document',
        timestamp: new Date().toISOString(),
      })
    }
  }
  
  if (docs.length > 0) {
    await indexDocuments(docs)
  }
  
  return docs.length
}

/**
 * Get index statistics
 */
export async function getStats(): Promise<IndexStats> {
  const database = await getDb()
  const tables = await database.tableNames()
  
  const byScope: Record<string, number> = {}
  let totalDocuments = 0
  
  for (const tableName of tables) {
    if (tableName.startsWith('memory_')) {
      const scope = tableName.replace('memory_', '')
      const table = await database.openTable(tableName)
      const count = await table.countRows()
      byScope[scope] = count
      totalDocuments += count
    }
  }
  
  return {
    totalDocuments,
    byScope,
    lastIndexed: new Date().toISOString(),
  }
}

/**
 * Clear all indexed data
 */
export async function clearIndex(scope?: string): Promise<void> {
  const database = await getDb()
  const tables = await database.tableNames()
  
  for (const tableName of tables) {
    if (tableName.startsWith('memory_')) {
      if (!scope || tableName === `memory_${scope}`) {
        await database.dropTable(tableName)
      }
    }
  }
}
