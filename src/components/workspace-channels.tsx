'use client'

import { useState, useEffect } from 'react'
import { 
  Hash, Plus, MoreHorizontal, MessageSquare, 
  Trash2, Edit2, Check, X, Loader2,
  ChevronDown, ChevronRight
} from 'lucide-react'

interface Channel {
  id: string
  name: string
  description?: string
  sessionKey?: string
  lastMessage?: string
  lastActivity?: string
  unread?: number
}

interface WorkspaceChannelsProps {
  workspaceId: string
  selectedChannelId?: string
  onSelectChannel: (channel: Channel) => void
  onCreateChannel?: (name: string, description?: string) => void
}

// Default channels for new workspaces
const DEFAULT_CHANNELS: Omit<Channel, 'id'>[] = [
  { name: 'general', description: 'General discussion' },
  { name: 'tasks', description: 'Task tracking and todos' },
  { name: 'research', description: 'Research notes and findings' },
  { name: 'ideas', description: 'Brainstorming and ideas' },
]

export default function WorkspaceChannels({
  workspaceId,
  selectedChannelId,
  onSelectChannel,
  onCreateChannel,
}: WorkspaceChannelsProps) {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newChannelName, setNewChannelName] = useState('')
  const [creating, setCreating] = useState(false)

  // Load channels from localStorage (or API in future)
  useEffect(() => {
    const stored = localStorage.getItem(`talon_channels_${workspaceId}`)
    if (stored) {
      setChannels(JSON.parse(stored))
    } else {
      // Initialize with default channels
      const defaults = DEFAULT_CHANNELS.map((ch, i) => ({
        ...ch,
        id: `${workspaceId}-${ch.name}`,
      }))
      setChannels(defaults)
      localStorage.setItem(`talon_channels_${workspaceId}`, JSON.stringify(defaults))
    }
    setLoading(false)
  }, [workspaceId])

  // Save channels when they change
  useEffect(() => {
    if (channels.length > 0) {
      localStorage.setItem(`talon_channels_${workspaceId}`, JSON.stringify(channels))
    }
  }, [channels, workspaceId])

  async function handleCreateChannel() {
    if (!newChannelName.trim()) return
    
    setCreating(true)
    
    const newChannel: Channel = {
      id: `${workspaceId}-${newChannelName.toLowerCase().replace(/\s+/g, '-')}`,
      name: newChannelName.trim().toLowerCase().replace(/\s+/g, '-'),
      description: '',
    }
    
    setChannels(prev => [...prev, newChannel])
    onCreateChannel?.(newChannel.name)
    
    setNewChannelName('')
    setShowCreate(false)
    setCreating(false)
  }

  function handleDeleteChannel(channelId: string) {
    if (channels.length <= 1) return // Keep at least one channel
    setChannels(prev => prev.filter(ch => ch.id !== channelId))
  }

  if (loading) {
    return (
      <div className="p-4">
        <Loader2 className="w-4 h-4 animate-spin text-terminal-500" />
      </div>
    )
  }

  return (
    <div className="py-2">
      {/* Section Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-1 px-3 py-1 text-xs font-medium text-ink-tertiary uppercase tracking-wider hover:text-ink-secondary"
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
        Channels
        <span className="ml-auto text-ink-muted">{channels.length}</span>
      </button>

      {!collapsed && (
        <div className="mt-1 space-y-0.5">
          {channels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => onSelectChannel(channel)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-colors group ${
                selectedChannelId === channel.id
                  ? 'bg-terminal-500/15 text-terminal-400'
                  : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-2'
              }`}
            >
              <Hash className="w-4 h-4 flex-shrink-0 text-ink-muted" />
              <span className="flex-1 truncate text-sm">{channel.name}</span>
              
              {channel.unread && channel.unread > 0 && (
                <span className="bg-terminal-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {channel.unread}
                </span>
              )}
              
              {/* Delete button (hidden by default) */}
              {channels.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteChannel(channel.id)
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-surface-3 rounded text-ink-muted hover:text-red-400"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </button>
          ))}

          {/* Create Channel */}
          {showCreate ? (
            <div className="px-3 py-2">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-ink-muted flex-shrink-0" />
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateChannel()
                    if (e.key === 'Escape') setShowCreate(false)
                  }}
                  placeholder="channel-name"
                  className="flex-1 bg-surface-2 border border-border-default rounded px-2 py-1 text-sm focus:outline-none focus:border-terminal-500/50"
                  autoFocus
                />
                <button
                  onClick={handleCreateChannel}
                  disabled={!newChannelName.trim() || creating}
                  className="p-1 bg-terminal-600 hover:bg-terminal-500 disabled:opacity-50 rounded text-white"
                >
                  {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="p-1 hover:bg-surface-3 rounded text-ink-muted"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCreate(true)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-ink-tertiary hover:text-ink-secondary hover:bg-surface-2 rounded-lg"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">Add Channel</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
