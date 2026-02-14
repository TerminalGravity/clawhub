/**
 * OpenClaw Gateway Client
 * Connects Talon to the real OpenClaw gateway API
 */

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:6820'
const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN || ''

interface GatewayResponse<T> {
  status: 'ok' | 'error'
  data?: T
  error?: string
}

async function gatewayFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${GATEWAY_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(GATEWAY_TOKEN && { 'Authorization': `Bearer ${GATEWAY_TOKEN}` }),
      ...options?.headers,
    },
  })
  
  if (!res.ok) {
    throw new Error(`Gateway error: ${res.status} ${res.statusText}`)
  }
  
  return res.json()
}

// Session types
export interface Session {
  key: string
  kind: string
  agentId?: string
  model?: string
  channel?: string
  createdAt?: string
  lastActivity?: string
  messageCount?: number
  tokenUsage?: {
    input: number
    output: number
    total: number
  }
}

export interface SessionMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string
}

// Agent config types
export interface AgentConfig {
  id: string
  name?: string
  description?: string
  model?: string
  workdir?: string
  soul?: string
  memory?: string
}

// Cron job types
export interface CronJob {
  id: string
  name?: string
  schedule: {
    kind: 'at' | 'every' | 'cron'
    expr?: string
    at?: string
    everyMs?: number
  }
  payload: {
    kind: 'systemEvent' | 'agentTurn'
    text?: string
    message?: string
  }
  enabled: boolean
  lastRun?: string
  nextRun?: string
}

/**
 * List all sessions with optional filters
 */
export async function listSessions(params?: {
  kinds?: string[]
  activeMinutes?: number
  limit?: number
  messageLimit?: number
}): Promise<Session[]> {
  const query = new URLSearchParams()
  if (params?.kinds) query.set('kinds', params.kinds.join(','))
  if (params?.activeMinutes) query.set('activeMinutes', String(params.activeMinutes))
  if (params?.limit) query.set('limit', String(params.limit))
  if (params?.messageLimit) query.set('messageLimit', String(params.messageLimit))
  
  const res = await gatewayFetch<{ sessions: Session[] }>(`/api/sessions?${query}`)
  return res.sessions || []
}

/**
 * Get session history
 */
export async function getSessionHistory(sessionKey: string, params?: {
  limit?: number
  includeTools?: boolean
}): Promise<SessionMessage[]> {
  const query = new URLSearchParams({ sessionKey })
  if (params?.limit) query.set('limit', String(params.limit))
  if (params?.includeTools) query.set('includeTools', 'true')
  
  const res = await gatewayFetch<{ messages: SessionMessage[] }>(`/api/sessions/history?${query}`)
  return res.messages || []
}

/**
 * Send a message to a session
 */
export async function sendMessage(params: {
  sessionKey?: string
  agentId?: string
  label?: string
  message: string
  timeoutSeconds?: number
}): Promise<{ response?: string }> {
  return gatewayFetch('/api/sessions/send', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

/**
 * List cron jobs
 */
export async function listCronJobs(includeDisabled = false): Promise<CronJob[]> {
  const query = includeDisabled ? '?includeDisabled=true' : ''
  const res = await gatewayFetch<{ jobs: CronJob[] }>(`/api/cron/jobs${query}`)
  return res.jobs || []
}

/**
 * Get cron scheduler status
 */
export async function getCronStatus(): Promise<{
  running: boolean
  jobCount: number
  nextFire?: string
}> {
  return gatewayFetch('/api/cron/status')
}

/**
 * Trigger a cron job manually
 */
export async function triggerCronJob(jobId: string): Promise<void> {
  await gatewayFetch('/api/cron/run', {
    method: 'POST',
    body: JSON.stringify({ jobId }),
  })
}

/**
 * List available agents from config
 */
export async function listAgents(): Promise<AgentConfig[]> {
  // This would ideally come from gateway, but for now we read from filesystem
  const res = await gatewayFetch<{ agents: AgentConfig[] }>('/api/agents')
  return res.agents || []
}

/**
 * Get session status (model, tokens, cost)
 */
export async function getSessionStatus(sessionKey?: string): Promise<{
  model?: string
  tokens?: { input: number; output: number }
  cost?: number
  elapsed?: string
}> {
  const query = sessionKey ? `?sessionKey=${sessionKey}` : ''
  return gatewayFetch(`/api/session/status${query}`)
}
