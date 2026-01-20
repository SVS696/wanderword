import type { WordJourney, AIProvider, AIProviderConfig } from '@/types';

const SYSTEM_INSTRUCTION = `You are an expert etymologist and historical linguist. When given a word, return its geographic and linguistic journey through history as structured JSON.

Guidelines:
- Coordinates must be [longitude, latitude] format (longitude first for GeoJSON compatibility)
- Include 3-8 waypoints for most words, capturing major linguistic transitions.
- For the journey array, order chronologically (order: 1 is first stop after origin).
- Be historically accurate - if uncertain, note approximations.
- routeType should reflect how the word likely traveled TO that location.
- For each location, provide a name and the ISO 3166-1 alpha-2 country code.
- For words with multiple etymology paths (like "tea"), choose the most historically significant route but mention alternatives in the narrative.
- If a word has no clear geographic journey (coined recently, technical term, etc.), return fewer waypoints with the origin and current usage location.

IMPORTANT: Return ONLY valid JSON matching the schema. No markdown, no explanations.`;

const JSON_SCHEMA = `{
  "word": "string",
  "currentMeaning": "string - brief modern definition",
  "origin": {
    "word": "string - original word form",
    "language": "string - e.g. 'Arabic', 'Latin'",
    "meaning": "string - original meaning",
    "location": {
      "name": "string - city/region name",
      "countryCode": "string - ISO 3166-1 alpha-2",
      "coordinates": [longitude, latitude]
    },
    "century": "string - e.g. '15th Century'"
  },
  "journey": [
    {
      "order": 1,
      "word": "string - word form in this language",
      "language": "string",
      "pronunciation": "string - IPA optional",
      "location": {
        "name": "string",
        "countryCode": "string",
        "coordinates": [longitude, latitude]
      },
      "century": "string",
      "routeType": "land" | "sea",
      "notes": "string - how/why word changed"
    }
  ],
  "narrative": "string - 2-3 paragraphs telling the full story",
  "routeSummary": "string - e.g. 'SILK_ROAD' or 'MARITIME'",
  "funFact": "string - optional interesting tidbit"
}`;

const buildPrompt = (word: string, language: string = 'English') => {
  const languageInstruction = language && language !== 'English'
    ? `\n\nIMPORTANT: Write all text content (currentMeaning, narrative, notes, funFact, routeSummary) in ${language}. Keep only the schema field names in English.`
    : '';

  return `Trace the etymological journey of the word: "${word}"

${SYSTEM_INSTRUCTION}${languageInstruction}

Respond with JSON matching this schema:
${JSON_SCHEMA}

Return ONLY the JSON object, no other text.`;
};

// ============== Gemini API ==============
export async function fetchWordJourneyGeminiAPI(word: string, apiKey: string, language?: string): Promise<WordJourney> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const result = await model.generateContent({
    contents: [{
      role: 'user',
      parts: [{ text: buildPrompt(word, language) }]
    }],
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: {
      responseMimeType: 'application/json',
    }
  });

  const text = result.response.text();
  return JSON.parse(text);
}

// ============== OpenAI API ==============
export async function fetchWordJourneyOpenAI(word: string, apiKey: string, language?: string): Promise<WordJourney> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_INSTRUCTION },
        { role: 'user', content: buildPrompt(word, language) }
      ],
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'OpenAI API error');
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

// ============== Anthropic API ==============
export async function fetchWordJourneyAnthropic(word: string, apiKey: string, language?: string): Promise<WordJourney> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_INSTRUCTION,
      messages: [
        { role: 'user', content: buildPrompt(word, language) }
      ]
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Anthropic API error');
  }

  const data = await response.json();
  const text = data.content[0].text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No valid JSON in Anthropic response');
  return JSON.parse(jsonMatch[0]);
}

// ============== Ollama ==============
export async function fetchWordJourneyOllama(
  word: string,
  baseUrl: string = 'http://localhost:11434',
  model: string = 'llama3',
  language?: string
): Promise<WordJourney> {
  const response = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt: buildPrompt(word, language),
      system: SYSTEM_INSTRUCTION,
      stream: false,
      format: 'json'
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.statusText}`);
  }

  const data = await response.json();
  const text = data.response;

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No valid JSON in Ollama response');
  }

  return JSON.parse(jsonMatch[0]);
}

// ============== CLI Agents ==============
export async function fetchWordJourneyCLI(
  word: string,
  provider: AIProvider,
  timeout = 60,
  language?: string
): Promise<WordJourney> {
  const response = await fetch('/api/cli-agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: provider,
      prompt: buildPrompt(word, language),
      timeout
    })
  });

  if (!response.ok) {
    throw new Error(`CLI agent error: ${response.statusText}`);
  }

  const data = await response.json();

  // Extract JSON from response (models might include markdown)
  const jsonMatch = data.output.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No valid JSON in response');
  }

  return JSON.parse(jsonMatch[0]);
}

// ============== Mock Data ==============
export async function fetchWordJourneyMock(word: string): Promise<WordJourney> {
  const mockData: Record<string, WordJourney> = {
    coffee: {
      word: "coffee",
      currentMeaning: "A dark brown stimulating drink made from roasted and ground seeds of the coffee plant",
      origin: {
        word: "qahwah",
        language: "Arabic",
        meaning: "Wine; a stimulating dark beverage",
        location: { name: "Mokha, Yemen", countryCode: "YE", coordinates: [43.25, 13.32] },
        century: "15th Century"
      },
      journey: [
        { order: 1, word: "kahve", language: "Ottoman Turkish", location: { name: "Istanbul, Turkey", countryCode: "TR", coordinates: [28.98, 41.01] }, century: "16th Century", routeType: "land", notes: "Spread through Ottoman Empire trade routes" },
        { order: 2, word: "caffè", language: "Italian", location: { name: "Venice, Italy", countryCode: "IT", coordinates: [12.34, 45.44] }, century: "17th Century", routeType: "sea", notes: "Venetian merchants brought coffee from Ottoman ports" },
        { order: 3, word: "café", language: "French", location: { name: "Paris, France", countryCode: "FR", coordinates: [2.35, 48.86] }, century: "17th Century", routeType: "land", notes: "French coffeehouses became cultural centers" },
        { order: 4, word: "coffee", language: "English", location: { name: "London, England", countryCode: "GB", coordinates: [-0.12, 51.51] }, century: "17th Century", routeType: "sea", notes: "First London coffeehouse opened 1652" }
      ],
      narrative: "The word 'coffee' embarks on a rich linguistic and geographic journey...",
      routeSummary: "MARITIME_TRADE",
      funFact: "The first European coffeehouse opened in Venice in 1629."
    },
    tea: {
      word: "tea",
      currentMeaning: "An aromatic beverage prepared by pouring hot water over cured leaves of the Camellia sinensis plant",
      origin: {
        word: "茶 (chá)",
        language: "Chinese (Mandarin)",
        meaning: "The tea plant and beverage",
        location: { name: "Fujian Province, China", countryCode: "CN", coordinates: [118.0, 26.0] },
        century: "3rd Century BCE"
      },
      journey: [
        { order: 1, word: "tê", language: "Min Chinese (Hokkien)", pronunciation: "te", location: { name: "Xiamen, China", countryCode: "CN", coordinates: [118.08, 24.48] }, century: "16th Century", routeType: "land", notes: "Maritime trade variant pronunciation" },
        { order: 2, word: "thee", language: "Dutch", location: { name: "Amsterdam, Netherlands", countryCode: "NL", coordinates: [4.9, 52.37] }, century: "17th Century", routeType: "sea", notes: "Dutch East India Company brought tea from Fujian" },
        { order: 3, word: "tea", language: "English", location: { name: "London, England", countryCode: "GB", coordinates: [-0.12, 51.51] }, century: "17th Century", routeType: "sea", notes: "Borrowed from Dutch traders" }
      ],
      narrative: "The word 'tea' follows the maritime Silk Road from China to Europe...",
      routeSummary: "MARITIME_SILK_ROAD",
      funFact: "'Tea'-like words indicate maritime trade, 'cha'-like words indicate overland Silk Road trade."
    }
  };

  await new Promise(resolve => setTimeout(resolve, 1500));

  const normalizedWord = word.toLowerCase();
  if (mockData[normalizedWord]) {
    return mockData[normalizedWord];
  }

  throw new Error(`Mock data not available for "${word}". Use a real AI provider or try: coffee, tea`);
}

// ============== Main Entry Point ==============
export async function fetchWordJourney(
  word: string,
  config: AIProviderConfig
): Promise<WordJourney> {
  const { provider, apiKey, baseUrl, model, timeout, responseLanguage } = config;

  switch (provider) {
    case 'gemini-api':
      if (!apiKey) throw new Error('API key required for Gemini API');
      return fetchWordJourneyGeminiAPI(word, apiKey, responseLanguage);

    case 'openai-api':
      if (!apiKey) throw new Error('API key required for OpenAI API');
      return fetchWordJourneyOpenAI(word, apiKey, responseLanguage);

    case 'anthropic-api':
      if (!apiKey) throw new Error('API key required for Anthropic API');
      return fetchWordJourneyAnthropic(word, apiKey, responseLanguage);

    case 'ollama':
      return fetchWordJourneyOllama(word, baseUrl || 'http://localhost:11434', model || 'llama3', responseLanguage);

    case 'gemini':
    case 'claude':
    case 'codex':
    case 'qwen':
      return fetchWordJourneyCLI(word, provider, timeout || 60, responseLanguage);

    default:
      return fetchWordJourneyMock(word);
  }
}
