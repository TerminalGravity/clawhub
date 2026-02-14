'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Terminal, Wifi, WifiOff, CheckCircle, XCircle,
  Loader2, ArrowRight, Server, Cpu, FolderOpen
} from 'lucide-react'

interface ConnectionStatus {
  connected: boolean
  gateway?: {
    version?: string
    uptime?: string
  }
  nodes?: Array<{
    id: string
    name: string
    status: 'online' | 'offline'
  }>
  workspaces?: number
}

export default function SetupPage() {
  const router = useRouter()
  const [gatewayUrl, setGatewayUrl] = useState('')
  const [testing, setTesting] = useState(false)
  const [status, setStatus] = useState<ConnectionStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load saved gateway URL
  useEffect(() => {
    const saved = localStorage.getItem('talon_gateway_url')
    if (saved) setGatewayUrl(saved)
  }, [])

  async function testConnection() {
    if (!gatewayUrl.trim()) return
    
    setTesting(true)
    setError(null)
    setStatus(null)
    
    try {
      // Test gateway connection
      const res = await fetch('/api/gateway/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: gatewayUrl.trim() }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        setError(data.error || 'Connection failed')
        return
      }
      
      setStatus(data)
      
      // Save successful connection
      localStorage.setItem('talon_gateway_url', gatewayUrl.trim())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setTesting(false)
    }
  }

  function handleContinue() {
    if (status?.connected) {
      router.push('/')
    }
  }

  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-terminal-500/20 rounded-2xl mb-4">
            <Terminal className="w-8 h-8 text-terminal-500" />
          </div>
          <h1 className="text-2xl font-bold">Talon</h1>
          <p className="text-ink-tertiary mt-1">Connect to your OpenClaw Gateway</p>
        </div>

        {/* Connection Form */}
        <div className="bg-surface-1 rounded-2xl border border-border-subtle p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Gateway URL</label>
              <input
                type="url"
                value={gatewayUrl}
                onChange={(e) => setGatewayUrl(e.target.value)}
                placeholder="https://your-gateway.tail657eaf.ts.net:5050"
                className="w-full bg-surface-2 border border-border-default rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-terminal-500/50 font-mono"
              />
              <p className="text-xs text-ink-muted mt-2">
                Your OpenClaw gateway URL (Tailscale, localhost, or public URL)
              </p>
            </div>

            <button
              onClick={testConnection}
              disabled={!gatewayUrl.trim() || testing}
              className="w-full flex items-center justify-center gap-2 bg-terminal-600 hover:bg-terminal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-medium transition-colors"
            >
              {testing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Testing Connection...
                </>
              ) : (
                <>
                  <Wifi className="w-4 h-4" />
                  Test Connection
                </>
              )}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-red-300">Connection Failed</div>
                <div className="text-sm text-red-300/80 mt-1">{error}</div>
              </div>
            </div>
          )}

          {/* Success */}
          {status?.connected && (
            <div className="mt-4 space-y-4">
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-green-300">Connected!</div>
                  {status.gateway?.version && (
                    <div className="text-sm text-green-300/80 mt-1">
                      OpenClaw {status.gateway.version}
                    </div>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-surface-2 rounded-lg p-3 text-center">
                  <Server className="w-5 h-5 mx-auto mb-1 text-terminal-400" />
                  <div className="text-lg font-bold">1</div>
                  <div className="text-xs text-ink-muted">Gateway</div>
                </div>
                <div className="bg-surface-2 rounded-lg p-3 text-center">
                  <Cpu className="w-5 h-5 mx-auto mb-1 text-blue-400" />
                  <div className="text-lg font-bold">{status.nodes?.length || 0}</div>
                  <div className="text-xs text-ink-muted">Nodes</div>
                </div>
                <div className="bg-surface-2 rounded-lg p-3 text-center">
                  <FolderOpen className="w-5 h-5 mx-auto mb-1 text-purple-400" />
                  <div className="text-lg font-bold">{status.workspaces || 0}</div>
                  <div className="text-xs text-ink-muted">Workspaces</div>
                </div>
              </div>

              {/* Nodes List */}
              {status.nodes && status.nodes.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-ink-tertiary uppercase tracking-wider mb-2">
                    Connected Nodes
                  </div>
                  <div className="space-y-2">
                    {status.nodes.map((node) => (
                      <div
                        key={node.id}
                        className="flex items-center gap-3 bg-surface-2 rounded-lg px-3 py-2"
                      >
                        <span className={`w-2 h-2 rounded-full ${
                          node.status === 'online' ? 'bg-green-400' : 'bg-ink-muted'
                        }`} />
                        <span className="text-sm">{node.name || node.id}</span>
                        <span className="text-xs text-ink-muted ml-auto">{node.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Continue Button */}
              <button
                onClick={handleContinue}
                className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-3 rounded-lg font-medium transition-colors"
              >
                Open Talon
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Quick connect options */}
        <div className="mt-6 text-center">
          <p className="text-sm text-ink-muted mb-3">Quick connect:</p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={() => setGatewayUrl('http://localhost:6820')}
              className="text-xs bg-surface-2 hover:bg-surface-3 px-3 py-1.5 rounded-lg"
            >
              localhost:6820
            </button>
            <button
              onClick={() => setGatewayUrl('http://127.0.0.1:18789')}
              className="text-xs bg-surface-2 hover:bg-surface-3 px-3 py-1.5 rounded-lg"
            >
              127.0.0.1:18789
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
