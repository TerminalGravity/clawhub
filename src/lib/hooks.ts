'use client'

import { useState, useEffect, useCallback } from 'react'

// Types
export interface Agent {
  id: string
  name: string
  description: string
  status: 'online' | 'busy' | 'offline'
  avatar: string
  workdir: string
  memorySize?: string
  lastActivity?: string
  blockers?: string[]
  tokenUsage?: number
  model?: string
}

export interface Session {
  key: string
  kind: string
  agentId?: string
  model?: string
  channel?: string
  lastActivity?: string
  messageCount?: number
}

export interface Blocker {
  id: string
  text: string
  owner?: string
  status: 'open' | 'in-progress' | 'resolved'
  priority: 'high' | 'medium' | 'low'
  category?: string
}

// Generic fetch hook with auto-refresh
function useAutoRefresh<T>(
  url: string,
  defaultValue: T,
  refreshInterval = 10000
): { data: T; loading: boolean; error: Error | null; refresh: () => void } {
  const [data, setData] = useState<T>(defaultValue)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
      setError(null)
    } catch (e) {
      setError(e as Error)
    } finally {
      setLoading(false)
    }
  }, [url])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, refreshInterval)
    return () => clearInterval(interval)
  }, [fetchData, refreshInterval])

  return { data, loading, error, refresh: fetchData }
}

/**
 * Fetch agents with real session status
 */
export function useAgents(refreshInterval = 10000) {
  const agents = useAutoRefresh<{ agents: Agent[] }>('/api/agents', { agents: [] }, refreshInterval)
  const sessions = useAutoRefresh<{ sessions: Session[] }>('/api/sessions?activeMinutes=60', { sessions: [] }, refreshInterval)
  
  // Merge session status into agents
  const mergedAgents = agents.data.agents.map(agent => {
    const activeSessions = sessions.data.sessions.filter(s => s.agentId === agent.id)
    const hasActive = activeSessions.length > 0
    const recentSession = activeSessions[0]
    
    return {
      ...agent,
      status: hasActive ? 'online' as const : agent.status,
      tokenUsage: recentSession?.messageCount,
      model: recentSession?.model,
      lastActivity: recentSession?.lastActivity || agent.lastActivity
    }
  })
  
  return {
    agents: mergedAgents,
    loading: agents.loading,
    error: agents.error,
    refresh: () => { agents.refresh(); sessions.refresh() }
  }
}

/**
 * Fetch blockers
 */
export function useBlockers(refreshInterval = 30000) {
  const result = useAutoRefresh<{ blockers: Blocker[]; summary?: { total: number; high: number } }>(
    '/api/blockers',
    { blockers: [] },
    refreshInterval
  )
  
  return {
    blockers: result.data.blockers,
    summary: result.data.summary,
    loading: result.loading,
    error: result.error,
    refresh: result.refresh
  }
}

/**
 * Selected agent state
 */
export function useSelectedAgent(agents: Agent[]) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  
  // Auto-select first online agent, or first agent
  useEffect(() => {
    if (!selectedId && agents.length > 0) {
      const onlineAgent = agents.find(a => a.status === 'online')
      setSelectedId(onlineAgent?.id || agents[0].id)
    }
  }, [agents, selectedId])
  
  const selectedAgent = agents.find(a => a.id === selectedId)
  
  return {
    selectedAgent,
    selectedId,
    setSelectedId
  }
}

/**
 * Send message to agent
 */
export function useSendMessage() {
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const send = useCallback(async (agentId: string, message: string) => {
    setSending(true)
    setError(null)
    
    try {
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, message })
      })
      
      if (!res.ok) {
        throw new Error(`Failed to send: ${res.status}`)
      }
      
      return await res.json()
    } catch (e) {
      setError((e as Error).message)
      throw e
    } finally {
      setSending(false)
    }
  }, [])
  
  return { send, sending, error }
}
