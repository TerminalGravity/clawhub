# ClawHub

**Agent Command Center for OpenClaw** — A workspace-first UI for managing AI agent workspaces with real-time cross-agent orchestration.

## Features

- 🤖 **Agent Dashboard** — View all agents with real-time status
- 💬 **Chat Interface** — Talk to any agent directly
- ⚡ **Command Center** — Cross-agent spawning and session management
- 📁 **Memory Browser** — Browse agent workspace files (MEMORY.md, SOUL.md)
- 📋 **Projects** — Track progress from PROJECTS.md
- ⏰ **Schedule** — Manage cron jobs
- 🚨 **Blockers** — Always-visible blockers from BLOCKERS.md

## Quick Start

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env.local
# Edit .env.local with your gateway URL

# Run development server
npm run dev

# Open http://localhost:3047
```

## Environment Variables

```env
# OpenClaw Gateway
GATEWAY_URL=http://localhost:6820

# Workspace paths (for local development)
AGENTS_DIR=/path/to/agents
WORKSPACE_ROOT=/path/to/workspace
BLOCKERS_PATH=/path/to/BLOCKERS.md
PROJECTS_PATH=/path/to/PROJECTS.md
```

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/KaiOpenClaw/clawhub)

**Note:** For Vercel deployment, you'll need to:
1. Set `GATEWAY_URL` to your OpenClaw gateway's public URL (via Tailscale Funnel or similar)
2. The API routes that read local files won't work — you'll need to connect to the gateway API instead

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **State:** Zustand + React hooks
- **Icons:** Lucide React

## Pages

| Route | Description |
|-------|-------------|
| `/` | Main dashboard with agent chat |
| `/command` | Cross-agent spawning & sessions |
| `/agents` | All agents grid view |
| `/projects` | Project tracker |
| `/schedule` | Cron job management |

## API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agents` | GET | List all agents |
| `/api/blockers` | GET | Get blockers from BLOCKERS.md |
| `/api/sessions/list` | GET | List active sessions |
| `/api/sessions/send` | POST | Send message to session |
| `/api/sessions/spawn` | POST | Spawn sub-agent |
| `/api/memory` | GET | Browse agent files |
| `/api/cron` | GET/POST | Cron job management |
| `/api/projects` | GET | List projects |

## License

MIT
