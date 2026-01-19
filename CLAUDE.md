# WanderWord Clone - Project Instructions

## Overview
Interactive etymology visualization app showing word migration across the globe. Built with React, D3.js, and multiple AI provider support.

## Tech Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS + Framer Motion
- **Map**: D3.js + topojson (Natural Earth projection)
- **AI Providers**: CLI agents, Direct APIs, Ollama

## Project Structure
```
src/
├── components/
│   ├── WorldMap.tsx      # D3.js map with animated journey paths
│   ├── SearchInput.tsx   # Search + provider selector + settings
│   ├── InfoPanel.tsx     # Etymology narrative panel
│   └── PlaybackControls.tsx
├── services/
│   └── aiProvider.ts     # Multi-provider AI service
├── types/
│   └── index.ts          # TypeScript interfaces
└── App.tsx

server/
└── api.ts                # API server for CLI agents + Ollama proxy
```

## Available AI Providers

### CLI Agents (no API key needed)
- `gemini` - Google Gemini CLI (1M tokens)
- `claude` - Anthropic Claude CLI (200k tokens)
- `codex` - OpenAI Codex CLI (128k tokens)
- `qwen` - Qwen CLI

### Direct APIs (need API key)
- `gemini-api` - Google Gemini API
- `openai-api` - OpenAI GPT-4o-mini
- `anthropic-api` - Claude Sonnet

### Local
- `ollama` - Local LLM (auto-discovers models)

## Running the Project

```bash
# Install dependencies
npm install

# Start API server (for CLI agents)
npm run server

# Start dev server (in another terminal)
npm run dev
```

## API Server Endpoints
- `POST /api/cli-agent` - Call CLI agent
- `GET /api/cli-agents/check` - Check installed CLI agents
- `GET /api/ollama/tags?baseUrl=...` - List Ollama models

## Adding New Providers
1. Add provider type to `src/types/index.ts`
2. Implement fetch function in `src/services/aiProvider.ts`
3. Add to `PROVIDERS` array in `src/components/SearchInput.tsx`

## Etymology JSON Schema
AI providers should return JSON matching `WordJourney` interface:
- `word`, `currentMeaning`
- `origin` with location coordinates [longitude, latitude]
- `journey[]` with ordered waypoints
- `narrative`, `routeSummary`, `funFact`

## Common Tasks

### Test CLI agent
```bash
curl -X POST http://localhost:3001/api/cli-agent \
  -H "Content-Type: application/json" \
  -d '{"model":"gemini","prompt":"Return JSON: {\"test\":true}","timeout":30}'
```

### Check installed agents
```bash
curl http://localhost:3001/api/cli-agents/check
```
