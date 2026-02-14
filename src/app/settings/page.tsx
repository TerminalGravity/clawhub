'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ConfigData {
  models?: {
    providers?: Record<string, {
      baseUrl?: string;
      apiKey?: string;
      auth?: string;
      api?: string;
      models?: Array<{
        id: string;
        name: string;
        reasoning?: boolean;
      }>;
    }>;
  };
  auth?: {
    profiles?: Record<string, {
      provider: string;
      mode: string;
      email?: string;
    }>;
    order?: Record<string, string[]>;
  };
  channels?: {
    telegram?: {
      botToken?: string;
      accounts?: Record<string, { botToken?: string }>;
    };
    discord?: {
      token?: string;
      accounts?: Record<string, { token?: string }>;
    };
  };
  tools?: {
    web?: {
      search?: { apiKey?: string; provider?: string };
      fetch?: { enabled?: boolean };
    };
  };
  talk?: {
    apiKey?: string;
    voiceId?: string;
  };
  skills?: {
    entries?: Record<string, { apiKey?: string; enabled?: boolean }>;
  };
  gateway?: {
    auth?: {
      token?: string;
      password?: string;
    };
    port?: number;
    tailscale?: { mode?: string };
  };
}

function RedactedBadge({ hasValue }: { hasValue: boolean }) {
  return hasValue ? (
    <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded">
      ••••••••
    </span>
  ) : (
    <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded">
      Not Set
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
      <div className="px-4 py-3 bg-zinc-800/50 border-b border-zinc-700">
        <h2 className="font-semibold text-white">{title}</h2>
      </div>
      <div className="p-4 space-y-3">
        {children}
      </div>
    </div>
  );
}

function ConfigRow({ label, value, sensitive = false, type = 'text' }: {
  label: string;
  value: string | boolean | number | undefined;
  sensitive?: boolean;
  type?: 'text' | 'boolean' | 'badge';
}) {
  if (type === 'badge' || sensitive) {
    const hasValue = value === '__OPENCLAW_REDACTED__' || (typeof value === 'string' && value.length > 0);
    return (
      <div className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
        <span className="text-zinc-400">{label}</span>
        <RedactedBadge hasValue={hasValue} />
      </div>
    );
  }
  
  if (type === 'boolean') {
    return (
      <div className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
        <span className="text-zinc-400">{label}</span>
        <span className={`px-2 py-0.5 text-xs rounded ${value ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-zinc-500'}`}>
          {value ? 'Enabled' : 'Disabled'}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
      <span className="text-zinc-400">{label}</span>
      <span className="text-white font-mono text-sm">{String(value ?? '—')}</span>
    </div>
  );
}

export default function SettingsPage() {
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch('/api/gateway/config');
        if (!res.ok) throw new Error('Failed to fetch config');
        const data = await res.json();
        setConfig(data.config || {});
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-zinc-800 rounded w-48"></div>
            <div className="h-64 bg-zinc-800 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <h2 className="text-red-400 font-semibold">Error Loading Config</h2>
            <p className="text-red-300/70 mt-1">{error}</p>
            <p className="text-zinc-500 mt-2 text-sm">
              Make sure the gateway is running and GATEWAY_URL is set correctly.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const providers = config?.models?.providers || {};
  const authProfiles = config?.auth?.profiles || {};
  const channels = config?.channels || {};
  const tools = config?.tools || {};
  const skills = config?.skills?.entries || {};

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-zinc-400 hover:text-white">
              ← Back
            </Link>
            <h1 className="text-xl font-bold">⚙️ Gateway Settings</h1>
          </div>
          <div className="text-sm text-zinc-500">
            Port: {config?.gateway?.port || 5050}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Gateway Auth */}
        <Section title="🔐 Gateway Authentication">
          <ConfigRow label="Auth Token" value={config?.gateway?.auth?.token} sensitive />
          <ConfigRow label="Password" value={config?.gateway?.auth?.password} sensitive />
          <ConfigRow label="Tailscale Mode" value={config?.gateway?.tailscale?.mode} />
        </Section>

        {/* Model Providers */}
        <Section title="🤖 Model Providers">
          {Object.keys(providers).length === 0 ? (
            <p className="text-zinc-500 text-sm">No custom providers configured (using built-in defaults)</p>
          ) : (
            Object.entries(providers).map(([name, provider]) => (
              <div key={name} className="border border-zinc-800 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">{name}</span>
                  <span className="text-xs text-zinc-500">{provider.api || 'default'}</span>
                </div>
                <ConfigRow label="Base URL" value={provider.baseUrl} />
                <ConfigRow label="API Key" value={provider.apiKey} sensitive />
                <ConfigRow label="Auth Mode" value={provider.auth} />
                {provider.models && provider.models.length > 0 && (
                  <div className="pt-2 border-t border-zinc-800">
                    <span className="text-xs text-zinc-500">Models: </span>
                    <span className="text-xs text-zinc-400">
                      {provider.models.map(m => m.name).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </Section>

        {/* Auth Profiles */}
        <Section title="🎭 Auth Profiles">
          {Object.keys(authProfiles).length === 0 ? (
            <p className="text-zinc-500 text-sm">No auth profiles configured</p>
          ) : (
            Object.entries(authProfiles).map(([id, profile]) => (
              <div key={id} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                <div>
                  <span className="text-white font-medium">{id}</span>
                  <span className="text-zinc-500 text-sm ml-2">({profile.provider})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-xs rounded ${
                    profile.mode === 'oauth' ? 'bg-purple-500/20 text-purple-400' :
                    profile.mode === 'api_key' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-zinc-700 text-zinc-400'
                  }`}>
                    {profile.mode}
                  </span>
                  {profile.email && (
                    <span className="text-xs text-zinc-500">{profile.email}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </Section>

        {/* Channel Tokens */}
        <Section title="💬 Channel Tokens">
          {/* Telegram */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-zinc-300">Telegram</h3>
            <ConfigRow label="Bot Token" value={channels.telegram?.botToken} sensitive />
            {channels.telegram?.accounts && Object.entries(channels.telegram.accounts).map(([name, account]) => (
              <ConfigRow key={name} label={`Account: ${name}`} value={account.botToken} sensitive />
            ))}
          </div>

          {/* Discord */}
          <div className="space-y-2 pt-3 border-t border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-300">Discord</h3>
            <ConfigRow label="Bot Token" value={channels.discord?.token} sensitive />
            {channels.discord?.accounts && Object.entries(channels.discord.accounts).map(([name, account]) => (
              <ConfigRow key={name} label={`Account: ${name}`} value={account.token} sensitive />
            ))}
          </div>
        </Section>

        {/* Tool API Keys */}
        <Section title="🔧 Tool API Keys">
          <ConfigRow label="Web Search (Brave)" value={tools.web?.search?.apiKey} sensitive />
          <ConfigRow label="Web Search Provider" value={tools.web?.search?.provider || 'brave'} />
          <ConfigRow label="Web Fetch" value={tools.web?.fetch?.enabled} type="boolean" />
          <ConfigRow label="TTS (ElevenLabs)" value={config?.talk?.apiKey} sensitive />
          <ConfigRow label="TTS Voice ID" value={config?.talk?.voiceId} />
        </Section>

        {/* Skill API Keys */}
        <Section title="🎯 Skill API Keys">
          {Object.keys(skills).length === 0 ? (
            <p className="text-zinc-500 text-sm">No skills with API keys configured</p>
          ) : (
            Object.entries(skills)
              .filter(([, skill]) => skill.apiKey)
              .map(([name, skill]) => (
                <div key={name} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white">{name}</span>
                    {skill.enabled !== undefined && (
                      <span className={`px-1.5 py-0.5 text-xs rounded ${skill.enabled ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-zinc-500'}`}>
                        {skill.enabled ? 'on' : 'off'}
                      </span>
                    )}
                  </div>
                  <RedactedBadge hasValue={!!skill.apiKey} />
                </div>
              ))
          )}
        </Section>

        {/* Environment Variables Reference */}
        <Section title="📋 Environment Variables Reference">
          <p className="text-zinc-500 text-sm mb-3">
            These are the env files available on the server for Talon deployment:
          </p>
          <div className="bg-zinc-950 rounded-lg p-3 font-mono text-xs space-y-1 max-h-64 overflow-y-auto">
            <div className="text-zinc-400"># Talon Required</div>
            <div className="text-green-400">GATEWAY_URL=https://srv1325349.tail657eaf.ts.net:5050</div>
            <div className="text-green-400">GATEWAY_TOKEN=&lt;from gateway.auth.token&gt;</div>
            <div className="text-green-400">OPENAI_API_KEY=&lt;from ~/.env.openai&gt;</div>
            <div className="text-zinc-600 mt-2"># Available ~/.env.* files</div>
            <div className="text-zinc-500">airtable, apify, brave, claude_max, elevenlabs, exa</div>
            <div className="text-zinc-500">fal, firecrawl, flyio, gemini, github, google</div>
            <div className="text-zinc-500">higgsfield, kling, openai, openrouter, orgo</div>
            <div className="text-zinc-500">resend, tavily, twilio, vercel, x, youtube</div>
          </div>
        </Section>

        {/* Quick Actions */}
        <div className="flex gap-3 pt-4">
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors"
          >
            Refresh Config
          </button>
          <Link
            href="/setup"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm transition-colors"
          >
            Gateway Setup Wizard
          </Link>
        </div>
      </main>
    </div>
  );
}
