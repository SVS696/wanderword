/**
 * Simple API server for CLI agent calls
 *
 * Run: npx tsx server/api.ts
 * Then start Vite: npm run dev
 */

import { createServer } from 'http';
import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const PORT = 3001;
const CLI_AGENTS_PATH = process.env.CLI_AGENTS_PATH || path.join(process.env.HOME || '~', '.claude/skills/cli-agents');

// CLI agents to check
const CLI_AGENTS = ['gemini', 'claude', 'codex', 'qwen'] as const;

// Check if a CLI tool is installed
function checkCliInstalled(name: string): boolean {
  try {
    execSync(`which ${name}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Check installed CLI agents
  if (req.method === 'GET' && req.url === '/api/cli-agents/check') {
    const agents = CLI_AGENTS.map(name => ({
      name,
      installed: checkCliInstalled(name)
    }));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ agents }));
    return;
  }

  // Proxy Ollama model list
  if (req.method === 'GET' && req.url?.startsWith('/api/ollama/tags')) {
    const urlParams = new URL(req.url, `http://localhost:${PORT}`);
    const baseUrl = urlParams.searchParams.get('baseUrl') || 'http://localhost:11434';

    try {
      const response = await fetch(`${baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`Ollama returned ${response.status}`);
      }
      const data = await response.json();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch (error: any) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Ollama not available',
        message: error.message,
        models: []
      }));
    }
    return;
  }

  if (req.method === 'POST' && req.url === '/api/cli-agent') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { model, prompt, timeout = 60 } = JSON.parse(body);

        console.log(`[${new Date().toISOString()}] Request: model=${model}, timeout=${timeout}`);

        const cliCallerPath = path.join(CLI_AGENTS_PATH, 'cli_caller.py');

        // Use spawn with args array to avoid shell escaping issues
        const pythonProcess = spawn('python3', [
          cliCallerPath,
          '--model', model,
          '--prompt', prompt,
          '--timeout', String(timeout)
        ], {
          timeout: (timeout + 30) * 1000
        });

        let output = '';
        let errorOutput = '';

        pythonProcess.stdout.on('data', (data) => {
          output += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });

        pythonProcess.on('close', (code) => {
          if (code === 0 || output.length > 0) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ output: output || errorOutput }));
          } else {
            console.error(`[ERROR] Exit code: ${code}, stderr: ${errorOutput}`);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              error: `Process exited with code ${code}`,
              output: errorOutput
            }));
          }
        });

        pythonProcess.on('error', (err) => {
          console.error(`[ERROR] ${err.message}`);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message, output: '' }));
        });

      } catch (error: any) {
        console.error(`[ERROR] ${error.message}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: error.message,
          output: ''
        }));
      }
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`\n🚀 CLI Agent API Server running on http://localhost:${PORT}`);
  console.log(`   CLI Agents Path: ${CLI_AGENTS_PATH}`);
  console.log(`\n   POST /api/cli-agent - Call AI model via CLI`);
  console.log(`   Body: { model: "gemini"|"claude"|"codex"|"qwen", prompt: "...", timeout: 60 }\n`);
});
