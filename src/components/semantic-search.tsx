'use client'

import { useState } from 'react'
import { 
  Search, Loader2, FileText, FolderOpen, 
  Globe, Users, Zap, ChevronDown, X,
  Database, RefreshCw
} from 'lucide-react'

interface SearchResult {
  document: {
    id: string
    content: string
    scope: string
    scopeId?: string
    sourcePath: string
    sourceType: string
    timestamp: string
  }
  score: number
  snippet: string
}

interface IndexStats {
  totalDocuments: number
  byScope: Record<string, number>
  lastIndexed?: string
}

interface SemanticSearchProps {
  defaultScope?: 'all' | 'global' | 'workspace' | 'project' | 'cross'
  scopeId?: string
  onResultClick?: (result: SearchResult) => void
}

const SCOPE_ICONS: Record<string, typeof Globe> = {
  global: Globe,
  workspace: FolderOpen,
  project: Users,
  cross: Zap,
}

const SCOPE_COLORS: Record<string, string> = {
  global: 'text-blue-400',
  workspace: 'text-purple-400',
  project: 'text-orange-400',
  cross: 'text-green-400',
}

export default function SemanticSearch({ 
  defaultScope = 'all', 
  scopeId,
  onResultClick 
}: SemanticSearchProps) {
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState(defaultScope)
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showIndexPanel, setShowIndexPanel] = useState(false)
  const [stats, setStats] = useState<IndexStats | null>(null)
  const [indexing, setIndexing] = useState(false)

  async function handleSearch() {
    if (!query.trim()) return
    
    setSearching(true)
    setError(null)
    
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          scope: scope === 'all' ? undefined : scope,
          scopeId,
          limit: 20,
          minScore: 0.4,
        }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        setError(data.error || 'Search failed')
        return
      }
      
      setResults(data.results || [])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSearching(false)
    }
  }

  async function fetchStats() {
    try {
      const res = await fetch('/api/index')
      const data = await res.json()
      setStats(data)
    } catch (e) {
      console.error('Failed to fetch stats:', e)
    }
  }

  async function triggerIndex(action: string) {
    setIndexing(true)
    try {
      const res = await fetch('/api/index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      
      if (res.ok) {
        await fetchStats()
      }
    } catch (e) {
      console.error('Index failed:', e)
    } finally {
      setIndexing(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search across memory, projects, workspaces..."
            className="w-full pl-10 pr-4 py-3 bg-surface-2 border border-border-default rounded-lg text-sm focus:outline-none focus:border-terminal-500/50"
          />
        </div>
        
        {/* Scope selector */}
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value as typeof scope)}
          className="px-4 py-3 bg-surface-2 border border-border-default rounded-lg text-sm focus:outline-none focus:border-terminal-500/50"
        >
          <option value="all">All Scopes</option>
          <option value="global">Global</option>
          <option value="workspace">Workspaces</option>
          <option value="project">Projects</option>
          <option value="cross">Cross-Workspace</option>
        </select>
        
        <button
          onClick={handleSearch}
          disabled={!query.trim() || searching}
          className="flex items-center gap-2 px-5 py-3 bg-terminal-600 hover:bg-terminal-500 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
        >
          {searching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          Search
        </button>
        
        <button
          onClick={() => {
            setShowIndexPanel(!showIndexPanel)
            if (!stats) fetchStats()
          }}
          className="p-3 bg-surface-2 hover:bg-surface-3 rounded-lg text-ink-tertiary hover:text-ink-primary"
          title="Index Management"
        >
          <Database className="w-4 h-4" />
        </button>
      </div>

      {/* Index Management Panel */}
      {showIndexPanel && (
        <div className="bg-surface-1 rounded-xl border border-border-subtle p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-400" />
              Vector Index
            </h3>
            <button onClick={() => setShowIndexPanel(false)} className="p-1 hover:bg-surface-3 rounded">
              <X className="w-4 h-4 text-ink-muted" />
            </button>
          </div>
          
          {stats ? (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-surface-2 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold">{stats.totalDocuments}</div>
                  <div className="text-xs text-ink-muted">Total Docs</div>
                </div>
                {Object.entries(stats.byScope).map(([scope, count]) => {
                  const Icon = SCOPE_ICONS[scope] || FileText
                  return (
                    <div key={scope} className="bg-surface-2 rounded-lg p-3 text-center">
                      <Icon className={`w-4 h-4 mx-auto mb-1 ${SCOPE_COLORS[scope] || 'text-ink-muted'}`} />
                      <div className="text-lg font-bold">{count}</div>
                      <div className="text-xs text-ink-muted capitalize">{scope}</div>
                    </div>
                  )
                })}
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => triggerIndex('all')}
                  disabled={indexing}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg text-sm font-medium"
                >
                  {indexing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Reindex All
                </button>
                <button
                  onClick={() => triggerIndex('global')}
                  disabled={indexing}
                  className="px-4 py-2 bg-surface-3 hover:bg-surface-4 rounded-lg text-sm"
                >
                  Index Global
                </button>
              </div>
              
              {stats.lastIndexed && (
                <p className="text-xs text-ink-muted text-center">
                  Last indexed: {new Date(stats.lastIndexed).toLocaleString()}
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-terminal-500" />
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm text-ink-muted">
            {results.length} result{results.length !== 1 ? 's' : ''}
          </div>
          
          {results.map((result, i) => {
            const Icon = SCOPE_ICONS[result.document.scope] || FileText
            const color = SCOPE_COLORS[result.document.scope] || 'text-ink-muted'
            
            return (
              <div
                key={i}
                onClick={() => onResultClick?.(result)}
                className="bg-surface-1 rounded-xl border border-border-subtle p-4 hover:border-terminal-500/30 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm text-terminal-400">
                        {result.document.sourcePath}
                      </span>
                      <span className="text-xs text-ink-muted">•</span>
                      <span className={`text-xs capitalize ${color}`}>
                        {result.document.scope}
                        {result.document.scopeId && `:${result.document.scopeId}`}
                      </span>
                      <span className="text-xs text-ink-muted ml-auto">
                        {Math.round(result.score * 100)}% match
                      </span>
                    </div>
                    <p className="text-sm text-ink-secondary line-clamp-3">
                      {result.snippet}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Empty state */}
      {!searching && results.length === 0 && query && (
        <div className="text-center py-8 text-ink-muted">
          <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No results found for &quot;{query}&quot;</p>
        </div>
      )}
    </div>
  )
}
