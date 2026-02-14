'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { 
  ChevronLeft, FileText, FolderOpen, MessageSquare, 
  Zap, Box, Settings, Loader2, Send, Plus,
  Clock, Activity, Users, Wrench, ChevronRight,
  Play, RotateCcw, Eye, EyeOff
} from 'lucide-react'
import MemoryViewer from '@/components/memory-viewer'
import SpawnPanel from '@/components/spawn-panel'

interface Workspace {
  id: string
  name: string
  description: string
  avatar: string
  status: 'online' | 'busy' | 'offline'
  memorySize?: string
  lastActivity?: string
  model?: string
  workdir: string
}

interface Session {
  key: string
  kind: string
  agentId?: string
  lastActivity?: string
  messageCount?: number
}

interface Project {
  id: string
  name: string
  status: string
  progress?: number
}

export default function WorkspacePage() {
  const params = useParams()
  const workspaceId = params.id as string
  
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  
  const [activeTab, setActiveTab] = useState<'chat' | 'memory' | 'spawn' | 'settings'>('chat')
  const [showSidebar, setShowSidebar] = useState(true)
  
  // Chat state
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'agent'; content: string; time: string }>>([])
  const [inputValue, setInputValue] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        // Fetch workspace details
        const agentsRes = await fetch('/api/agents')
        const agentsData = await agentsRes.json()
        const ws = agentsData.agents?.find((a: Workspace) => a.id === workspaceId)
        if (ws) setWorkspace(ws)
        
        // Fetch active sessions for this workspace
        const sessionsRes = await fetch(`/api/sessions/list?activeMinutes=1440`)
        const sessionsData = await sessionsRes.json()
        const wsSessions = sessionsData.sessions?.filter((s: Session) => s.agentId === workspaceId) || []
        setSessions(wsSessions)
        
        // Fetch projects (would need to parse from workspace PROJECTS.md)
        // For now, use global projects
        const projectsRes = await fetch('/api/projects')
        const projectsData = await projectsRes.json()
        setProjects(projectsData.projects?.slice(0, 5) || [])
      } catch (e) {
        console.error('Failed to load workspace:', e)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [workspaceId])

  async function sendMessage() {
    if (!inputValue.trim() || sending) return
    
    const msg = inputValue.trim()
    setInputValue('')
    setMessages(prev => [...prev, { role: 'user', content: msg, time: new Date().toLocaleTimeString() }])
    setSending(true)
    
    try {
      const res = await fetch('/api/sessions/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: workspaceId, message: msg }),
      })
      
      if (res.ok) {
        const data = await res.json()
        if (data.response) {
          setMessages(prev => [...prev, { 
            role: 'agent', 
            content: data.response, 
            time: new Date().toLocaleTimeString() 
          }])
        }
      }
    } catch (e) {
      console.error('Send failed:', e)
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-terminal-500" />
      </div>
    )
  }

  if (!workspace) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🤷</div>
          <h2 className="text-xl font-semibold mb-2">Workspace not found</h2>
          <Link href="/" className="text-terminal-400 hover:underline">
            Go back to dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col">
      {/* Header */}
      <header className="bg-surface-1 border-b border-border-subtle">
        <div className="flex items-center gap-4 px-4 py-3">
          <Link href="/" className="p-2 hover:bg-surface-3 rounded-lg text-ink-tertiary hover:text-ink-primary">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-xl">
            {workspace.avatar}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-semibold">{workspace.name}</h1>
              <span className={`w-2 h-2 rounded-full ${
                workspace.status === 'online' ? 'bg-green-400' : 'bg-ink-muted'
              }`} />
            </div>
            <p className="text-sm text-ink-tertiary">{workspace.description}</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 hover:bg-surface-3 rounded-lg text-ink-tertiary hover:text-ink-primary"
            >
              {showSidebar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button className="p-2 hover:bg-surface-3 rounded-lg text-ink-tertiary hover:text-ink-primary">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-1 px-4 pb-2">
          {[
            { id: 'chat', icon: MessageSquare, label: 'Chat' },
            { id: 'memory', icon: FileText, label: 'Memory' },
            { id: 'spawn', icon: Zap, label: 'Sub-Agents' },
            { id: 'settings', icon: Settings, label: 'Settings' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-terminal-500/15 text-terminal-400 border border-terminal-500/30'
                  : 'text-ink-tertiary hover:text-ink-secondary hover:bg-surface-2'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Tab Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeTab === 'chat' && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center h-full">
                    <div className="text-center text-ink-muted">
                      <div className="text-4xl mb-4">{workspace.avatar}</div>
                      <h3 className="text-lg font-medium mb-2">Chat with {workspace.name}</h3>
                      <p className="text-sm max-w-md">
                        Send a message to start working. Your agent has access to memory, tools, and can spawn sub-agents.
                      </p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div key={i} className="flex gap-3 max-w-3xl">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        msg.role === 'user' ? 'bg-terminal-500/20 text-terminal-400' : 'bg-gradient-to-br from-purple-500 to-pink-500'
                      }`}>
                        {msg.role === 'user' ? 'J' : workspace.avatar}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{msg.role === 'user' ? 'You' : workspace.name}</span>
                          <span className="text-xs text-ink-muted">{msg.time}</span>
                        </div>
                        <div className="bg-surface-2 rounded-lg p-3 text-sm whitespace-pre-wrap border border-border-subtle">
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                
                {sending && (
                  <div className="flex gap-3 max-w-3xl">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                      {workspace.avatar}
                    </div>
                    <div className="bg-surface-2 rounded-lg p-3 border border-border-subtle">
                      <Loader2 className="w-4 h-4 animate-spin text-terminal-400" />
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="border-t border-border-subtle p-4">
                <div className="flex gap-3 max-w-3xl">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder={`Message ${workspace.name}...`}
                    className="flex-1 bg-surface-2 border border-border-default rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-terminal-500/50"
                    disabled={sending}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!inputValue.trim() || sending}
                    className="flex items-center gap-2 px-5 py-3 bg-terminal-600 hover:bg-terminal-500 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'memory' && (
            <div className="flex-1 overflow-hidden">
              <MemoryViewer agentId={workspaceId} />
            </div>
          )}

          {activeTab === 'spawn' && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="max-w-2xl">
                <SpawnPanel currentAgentId={workspaceId} />
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="max-w-2xl space-y-6">
                <div className="bg-surface-1 rounded-xl border border-border-subtle p-4">
                  <h3 className="font-medium mb-4">Workspace Info</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-ink-tertiary">ID</span>
                      <span className="font-mono">{workspace.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-tertiary">Directory</span>
                      <span className="font-mono text-xs">{workspace.workdir}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-tertiary">Memory Size</span>
                      <span>{workspace.memorySize || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-tertiary">Model</span>
                      <span className="font-mono">{workspace.model || 'Default'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-surface-1 rounded-xl border border-border-subtle p-4">
                  <h3 className="font-medium mb-4">Active Sessions</h3>
                  {sessions.length === 0 ? (
                    <p className="text-sm text-ink-muted">No active sessions</p>
                  ) : (
                    <div className="space-y-2">
                      {sessions.map((session) => (
                        <div key={session.key} className="flex items-center gap-3 p-2 bg-surface-2 rounded-lg">
                          <span className="w-2 h-2 rounded-full bg-green-400" />
                          <span className="font-mono text-sm flex-1 truncate">{session.key}</span>
                          <span className="text-xs text-ink-muted">{session.messageCount} msgs</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <aside className="w-72 bg-surface-1 border-l border-border-subtle overflow-y-auto">
            {/* Quick Stats */}
            <div className="p-4 border-b border-border-subtle">
              <h3 className="text-xs font-medium text-ink-tertiary uppercase tracking-wider mb-3">Quick Stats</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-surface-2 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold">{sessions.length}</div>
                  <div className="text-xs text-ink-muted">Sessions</div>
                </div>
                <div className="bg-surface-2 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold">{projects.length}</div>
                  <div className="text-xs text-ink-muted">Projects</div>
                </div>
              </div>
            </div>

            {/* Projects */}
            <div className="p-4 border-b border-border-subtle">
              <h3 className="text-xs font-medium text-ink-tertiary uppercase tracking-wider mb-3 flex items-center justify-between">
                <span>Projects</span>
                <button className="p-1 hover:bg-surface-3 rounded">
                  <Plus className="w-3 h-3" />
                </button>
              </h3>
              {projects.length === 0 ? (
                <p className="text-sm text-ink-muted">No projects</p>
              ) : (
                <div className="space-y-2">
                  {projects.map((project) => (
                    <div key={project.id} className="flex items-center gap-2 text-sm">
                      <Box className="w-4 h-4 text-orange-400" />
                      <span className="flex-1 truncate">{project.name}</span>
                      <span className="text-xs text-ink-muted">{project.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Workspace Files */}
            <div className="p-4">
              <h3 className="text-xs font-medium text-ink-tertiary uppercase tracking-wider mb-3">Files</h3>
              <div className="space-y-1">
                {['MEMORY.md', 'SOUL.md', 'TOOLS.md', 'memory/'].map((file) => (
                  <button
                    key={file}
                    onClick={() => setActiveTab('memory')}
                    className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-surface-2 rounded text-sm text-left"
                  >
                    {file.endsWith('/') ? (
                      <FolderOpen className="w-4 h-4 text-blue-400" />
                    ) : (
                      <FileText className="w-4 h-4 text-green-400" />
                    )}
                    <span className="font-mono">{file}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
