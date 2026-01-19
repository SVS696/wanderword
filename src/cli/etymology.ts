#!/usr/bin/env tsx
/**
 * CLI tool for tracing word etymology using various AI models
 *
 * Usage:
 *   npx tsx src/cli/etymology.ts <word> [--model <model>] [--timeout <seconds>]
 *
 * Models: gemini, claude, codex, qwen, gemini-api
 *
 * Examples:
 *   npx tsx src/cli/etymology.ts coffee
 *   npx tsx src/cli/etymology.ts tea --model claude
 *   npx tsx src/cli/etymology.ts algorithm --model gemini --timeout 90
 */

import { execSync } from 'child_process';
import path from 'path';

const CLI_AGENTS_PATH = process.env.CLI_AGENTS_PATH || path.join(process.env.HOME || '~', '.claude/skills/cli-agents');

const SYSTEM_INSTRUCTION = `You are an expert etymologist and historical linguist. When given a word, return its geographic and linguistic journey through history as structured JSON.

Guidelines:
- Coordinates must be [longitude, latitude] format (longitude first for GeoJSON compatibility)
- Include 3-8 waypoints for most words, capturing major linguistic transitions.
- For the journey array, order chronologically (order: 1 is first stop after origin).
- Be historically accurate - if uncertain, note approximations.
- routeType should reflect how the word likely traveled TO that location.
- For each location, provide a name and the ISO 3166-1 alpha-2 country code.

IMPORTANT: Return ONLY valid JSON matching this schema:
{
  "word": "string",
  "currentMeaning": "string",
  "origin": {
    "word": "string",
    "language": "string",
    "meaning": "string",
    "location": { "name": "string", "countryCode": "string", "coordinates": [lon, lat] },
    "century": "string"
  },
  "journey": [{
    "order": number,
    "word": "string",
    "language": "string",
    "pronunciation": "string (optional)",
    "location": { "name": "string", "countryCode": "string", "coordinates": [lon, lat] },
    "century": "string",
    "routeType": "land" | "sea",
    "notes": "string"
  }],
  "narrative": "string",
  "routeSummary": "string",
  "funFact": "string (optional)"
}`;

interface Args {
  word: string;
  model: string;
  timeout: number;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Etymology Tracer - CLI tool for word origin visualization

Usage:
  npx tsx src/cli/etymology.ts <word> [options]

Options:
  --model <model>    AI model to use (gemini, claude, codex, qwen)
                     Default: gemini
  --timeout <sec>    Timeout in seconds. Default: 60
  --help, -h         Show this help

Examples:
  npx tsx src/cli/etymology.ts coffee
  npx tsx src/cli/etymology.ts tea --model claude
  npx tsx src/cli/etymology.ts algorithm --model qwen --timeout 90
`);
    process.exit(0);
  }

  const result: Args = {
    word: args[0],
    model: 'gemini',
    timeout: 60
  };

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--model' && args[i + 1]) {
      result.model = args[++i];
    } else if (args[i] === '--timeout' && args[i + 1]) {
      result.timeout = parseInt(args[++i], 10);
    }
  }

  return result;
}

function callCliAgent(word: string, model: string, timeout: number): string {
  const prompt = `Trace the etymological journey of the word: "${word}"

${SYSTEM_INSTRUCTION}

Return ONLY the JSON object, no other text.`;

  const cliCallerPath = path.join(CLI_AGENTS_PATH, 'cli_caller.py');

  // Escape special characters in prompt for shell
  const escapedPrompt = prompt.replace(/"/g, '\\"').replace(/\n/g, '\\n');

  const cmd = `python3 "${cliCallerPath}" --model ${model} --prompt "${escapedPrompt}" --timeout ${timeout}`;

  console.log(`\n🔍 Tracing etymology of "${word}" using ${model}...\n`);

  try {
    const output = execSync(cmd, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024, // 10MB
      timeout: (timeout + 10) * 1000
    });

    return output;
  } catch (error: any) {
    if (error.stdout) {
      return error.stdout;
    }
    throw error;
  }
}

function extractJson(text: string): any {
  // Try to find JSON in the response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No valid JSON found in response');
  }

  return JSON.parse(jsonMatch[0]);
}

function displayResult(data: any) {
  console.log('\n' + '='.repeat(60));
  console.log(`📖 ${data.word.toUpperCase()}`);
  console.log('='.repeat(60));

  console.log(`\n📝 Definition: ${data.currentMeaning}\n`);

  console.log('🌍 ORIGIN');
  console.log(`   Word: "${data.origin.word}" (${data.origin.language})`);
  console.log(`   Meaning: ${data.origin.meaning}`);
  console.log(`   Location: ${data.origin.location.name}`);
  console.log(`   Century: ${data.origin.century}`);

  console.log('\n🗺️  JOURNEY');
  data.journey.forEach((step: any, idx: number) => {
    const icon = step.routeType === 'sea' ? '⛵' : '🚶';
    console.log(`\n   ${idx + 1}. ${icon} "${step.word}" (${step.language})`);
    console.log(`      → ${step.location.name} | ${step.century}`);
    console.log(`      ${step.notes}`);
  });

  console.log('\n📜 NARRATIVE');
  console.log(data.narrative.split('\n').map((l: string) => '   ' + l).join('\n'));

  if (data.funFact) {
    console.log('\n💡 FUN FACT');
    console.log(`   ${data.funFact}`);
  }

  console.log('\n' + '='.repeat(60));
}

async function main() {
  const { word, model, timeout } = parseArgs();

  try {
    const output = callCliAgent(word, model, timeout);
    const data = extractJson(output);

    displayResult(data);

    // Also output raw JSON for piping
    if (process.env.OUTPUT_JSON === '1') {
      console.log('\n📦 RAW JSON:');
      console.log(JSON.stringify(data, null, 2));
    }

  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main();
