'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { 
  Activity, ChevronDown, ChevronRight, Clock, FileText, 
  Folder, MessageSquare, AlertTriangle, Settings, Terminal,
  Zap, Box, Send, RotateCcw, RefreshCw, Loader2, Users,
  Calendar, ExternalLink, Play
} from 'lucide-react'
import { useAgents, useBlockers, useSelectedAgent, Agent, Blocker } from '@/lib/hooks'

function StatusIndicator({ status }: { status: 'online' | 'busy' | 'offline' }) {
  const colors = {
    online: 'bg-status-online',
    busy: 'bg-status-busy', 
    offline: 'bg-status-offline'
  }
  return (
    <span className={`w-2 h-2 rounded-full ${colors[status]} ${status === 'online' ? 'pulse-online' : ''}`} />
  )
}

function TokenMeter({ current, max }: { current: number, max: number }) {
  const percentage = Math.min((current / max) * 100, 100)
  const color = percentage > 80 ? 'bg-status-error' : percentage > 50 ? 'bg-status-busy' : 'bg-terminal-500'
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-1.5 bg-surface-3 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${percentage}%` }} />
      </div>
      <span className="text-xs font-mono text-ink-tertiary">{Math.round(percentage)}%</span>
    </div>
  )
}

function BlockersBadge({ blockers }: { blockers: Blocker[] }) {
  const highPriority = blockers.filter(b => b.priority === 'high').length
  if (blockers.length === 0) return null
  
  return (
    <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full ${
      highPriority > 0 ? 'bg-status-error text-white' : 'bg-status-busy/20 text-status-busy'
    }`}>
      {blockers.length}
    </span>
  )
}

function AgentSidebar({ 
  agents, 
  selectedId, 
  onSelect, 
  blockers,
  loading 
}: { 
  agents: Agent[]
  selectedId: string | null
  onSelect: (id: string) => void
  blockers: Blocker[]
  loading: boolean
}) {
  const [expandedSections, setExpandedSections] = useState({ 
    agents: true, 
    projects: true, 
    system: false 
  })

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  return (
    <aside className="w-64 flex flex-col border-r border-border-subtle">
      {/* Logo */}
      <div className="h-14 flex items-center gap-2 px-4 border-b border-border-subtle">
        <Terminal className="w-6 h-6 text-terminal-500" />
        <span className="font-semibold text-lg">ClawHub</span>
        {loading && <Loader2 className="w-4 h-4 text-terminal-500 animate-spin ml-auto" />}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {/* Agents Section */}
        <div className="px-2">
          <button 
            onClick={() => toggleSection('agents')}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-ink-tertiary uppercase tracking-wider hover:text-ink-secondary"
          >
            {expandedSections.agents ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Agents ({agents.length})
          </button>
          
          {expandedSections.agents && (
            <div className="mt-1 space-y-0.5">
              {agents.map(agent => (
                <button
                  key={agent.id}
                  onClick={() => onSelect(agent.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors
                    ${selectedId === agent.id 
                      ? 'bg-terminal-500/15 text-terminal-400 border border-terminal-500/30' 
                      : 'hover:bg-surface-2 text-ink-secondary hover:text-ink-primary'
                    }`}
                >
                  <span className="text-lg">{agent.avatar}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <StatusIndicator status={agent.status} />
                      <span className="text-sm font-medium truncate">{agent.name}</span>
                    </div>
                  </div>
                  {agent.tokenUsage && agent.tokenUsage > 0 && (
                    <span className="text-xs font-mono text-ink-muted">{Math.round(agent.tokenUsage)}k</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Blockers Section */}
        {blockers.length > 0 && (
          <div className="px-2 mt-4">
            <button 
              onClick={() => toggleSection('system')}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-status-busy uppercase tracking-wider hover:text-ink-secondary"
            >
              <AlertTriangle className="w-3 h-3" />
              Blockers
              <BlockersBadge blockers={blockers} />
            </button>
            
            <div className="mt-2 space-y-2 px-2">
              {blockers.slice(0, 5).map(blocker => (
                <div 
                  key={blocker.id}
                  className={`text-xs p-2 rounded-lg border ${
                    blocker.priority === 'high' 
                      ? 'bg-status-error/10 border-status-error/30 text-red-300'
                      : 'bg-surface-2 border-border-subtle text-ink-secondary'
                  }`}
                >
                  {blocker.text}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <div className="px-2 mt-4 space-y-0.5">
          <Link 
            href="/command"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/15"
          >
            <Zap className="w-4 h-4" />
            <span className="text-sm font-medium">Command Center</span>
          </Link>
          <Link 
            href="/agents"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-surface-2 text-ink-secondary hover:text-ink-primary"
          >
            <Users className="w-4 h-4" />
            <span className="text-sm">All Agents</span>
            <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
          </Link>
          <Link 
            href="/projects"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-surface-2 text-ink-secondary hover:text-ink-primary"
          >
            <Box className="w-4 h-4" />
            <span className="text-sm">Projects</span>
            <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
          </Link>
          <Link 
            href="/schedule"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-surface-2 text-ink-secondary hover:text-ink-primary"
          >
            <Calendar className="w-4 h-4" />
            <span className="text-sm">Schedule</span>
            <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
          </Link>
          <Link 
            href="/settings"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-surface-2 text-ink-secondary hover:text-ink-primary"
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm">Settings</span>
            <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
          </Link>
        </div>
      </nav>

      {/* User */}
      <div className="p-3 border-t border-border-subtle">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-terminal-500/20 rounded-lg flex items-center justify-center text-terminal-400 font-medium">J</div>
          <div className="flex-1">
            <div className="text-sm font-medium">Jack</div>
            <div className="text-xs text-ink-muted">Online</div>
          </div>
          <Link href="/settings" className="p-1.5 hover:bg-surface-2 rounded-lg text-ink-tertiary hover:text-ink-primary">
            <Settings className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </aside>
  )
}

function AgentWorkspace({ agent, blockers }: { agent: Agent | undefined, blockers: Blocker[] }) {
  const [inputValue, setInputValue] = useState('')
  const [messages, setMessages] = useState<{ role: 'user' | 'agent', content: string, time: string }[]>([])
  
  if (!agent) {
    return (
      <main className="flex-1 flex items-center justify-center bg-surface-0">
        <div className="text-center text-ink-muted">
          <Terminal className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Select an agent to get started</p>
        </div>
      </main>
    )
  }
  
  const agentBlockers = blockers.filter(b => 
    b.category?.toLowerCase().includes(agent.id) || 
    agent.blockers?.some(ab => ab.includes(b.text))
  )
  
  return (
    <main className="flex-1 flex flex-col min-w-0">
      {/* Agent Header */}
      <header className="bg-surface-1 border-b border-border-subtle p-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-2xl shadow-lg">
            {agent.avatar}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">{agent.name}</h1>
              <StatusIndicator status={agent.status} />
            </div>
            <p className="text-sm text-ink-tertiary">{agent.description}</p>
          </div>
          <div className="flex items-center gap-6">
            {agent.memorySize && (
              <div className="text-right">
                <div className="text-xs text-ink-muted uppercase tracking-wider">Memory</div>
                <div className="font-mono">{agent.memorySize}</div>
              </div>
            )}
            {agent.model && (
              <div className="text-right">
                <div className="text-xs text-ink-muted uppercase tracking-wider">Model</div>
                <div className="font-mono text-sm">{agent.model.split('/').pop()}</div>
              </div>
            )}
            <button className="flex items-center gap-2 px-3 py-2 bg-surface-3 hover:bg-surface-4 rounded-lg text-sm font-medium transition-colors">
              <RotateCcw className="w-4 h-4" />
              /new
            </button>
          </div>
        </div>
      </header>

      {/* Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center h-full">
                <div className="text-center text-ink-muted max-w-md">
                  <div className="text-4xl mb-4">{agent.avatar}</div>
                  <h3 className="text-lg font-medium text-ink-secondary mb-2">Chat with {agent.name}</h3>
                  <p className="text-sm">Send a message to start a conversation. Your agent will respond with context from their memory and tools.</p>
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className="flex gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    msg.role === 'user' 
                      ? 'bg-terminal-500/20 text-terminal-400' 
                      : 'bg-gradient-to-br from-purple-500 to-pink-500'
                  }`}>
                    {msg.role === 'user' ? 'J' : agent.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{msg.role === 'user' ? 'Jack' : agent.name}</span>
                      <span className="text-xs text-ink-muted">{msg.time}</span>
                    </div>
                    <div className="bg-surface-2 rounded-lg p-3 text-sm whitespace-pre-wrap border border-border-subtle">
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border-subtle">
            <div className="flex gap-3">
              <input
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder={`Message ${agent.name}...`}
                className="flex-1 bg-surface-2 border border-border-default rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-terminal-500/50 focus:ring-1 focus:ring-terminal-500/20 placeholder:text-ink-muted"
                onKeyDown={e => {
                  if (e.key === 'Enter' && inputValue.trim()) {
                    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                    setMessages(prev => [...prev, { role: 'user', content: inputValue, time: now }])
                    setInputValue('')
                    // TODO: Actually send to gateway
                  }
                }}
              />
              <button 
                className="flex items-center gap-2 px-5 py-3 bg-terminal-600 hover:bg-terminal-500 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                disabled={!inputValue.trim()}
                onClick={() => {
                  if (inputValue.trim()) {
                    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                    setMessages(prev => [...prev, { role: 'user', content: inputValue, time: now }])
                    setInputValue('')
                  }
                }}
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - Workspace Details */}
        <aside className="w-80 bg-surface-1 border-l border-border-subtle overflow-y-auto hidden lg:block">
          {/* Blockers */}
          {agentBlockers.length > 0 && (
            <section className="p-4 border-b border-border-subtle">
              <h3 className="text-xs font-medium text-status-busy uppercase tracking-wider flex items-center gap-2 mb-3">
                <AlertTriangle className="w-3.5 h-3.5" />
                Blockers ({agentBlockers.length})
              </h3>
              <div className="space-y-2">
                {agentBlockers.map((blocker) => (
                  <div key={blocker.id} className="bg-surface-2 rounded-lg p-3 border border-status-busy/20">
                    <div className="text-sm font-medium">{blocker.text}</div>
                    {blocker.owner && (
                      <div className="text-xs text-ink-muted mt-1">Owner: @{blocker.owner}</div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Memory Files */}
          <section className="p-4 border-b border-border-subtle">
            <h3 className="text-xs font-medium text-ink-tertiary uppercase tracking-wider flex items-center gap-2 mb-3">
              <FileText className="w-3.5 h-3.5" />
              Workspace
            </h3>
            <div className="space-y-1">
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-2 text-left transition-colors">
                <FileText className="w-4 h-4 text-green-400" />
                <span className="font-mono text-sm text-ink-secondary">MEMORY.md</span>
                {agent.memorySize && <span className="ml-auto text-xs text-ink-muted">{agent.memorySize}</span>}
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-2 text-left transition-colors">
                <FileText className="w-4 h-4 text-purple-400" />
                <span className="font-mono text-sm text-ink-secondary">SOUL.md</span>
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-2 text-left transition-colors">
                <Folder className="w-4 h-4 text-blue-400" />
                <span className="font-mono text-sm text-ink-secondary">memory/</span>
              </button>
            </div>
          </section>

          {/* Session Info */}
          <section className="p-4">
            <h3 className="text-xs font-medium text-ink-tertiary uppercase tracking-wider flex items-center gap-2 mb-3">
              <Activity className="w-3.5 h-3.5" />
              Session
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-tertiary">Status</span>
                <span className={`flex items-center gap-1 ${
                  agent.status === 'online' ? 'text-green-400' : 'text-ink-muted'
                }`}>
                  <StatusIndicator status={agent.status} />
                  {agent.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-tertiary">Last Activity</span>
                <span className="text-ink-secondary">{agent.lastActivity || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-tertiary">Workspace</span>
                <span className="font-mono text-xs text-ink-secondary truncate max-w-[150px]">
                  {agent.workdir.split('/').pop()}
                </span>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </main>
  )
}

export default function Home() {
  const { agents, loading, refresh } = useAgents(10000) // Refresh every 10s
  const { blockers } = useBlockers(30000) // Refresh every 30s
  const { selectedAgent, selectedId, setSelectedId } = useSelectedAgent(agents)

  return (
    <div className="h-screen flex bg-surface-0">
      <AgentSidebar 
        agents={agents} 
        selectedId={selectedId} 
        onSelect={setSelectedId}
        blockers={blockers}
        loading={loading}
      />
      <AgentWorkspace agent={selectedAgent} blockers={blockers} />
    </div>
  )
}
