export interface Coordinates {
  name: string;
  countryCode: string;
  coordinates: [number, number]; // [longitude, latitude]
}

export interface Origin {
  word: string;
  language: string;
  meaning: string;
  location: Coordinates;
  century: string;
}

export interface JourneyStep {
  order: number;
  word: string;
  language: string;
  pronunciation?: string;
  location: Coordinates;
  century: string;
  routeType: 'land' | 'sea';
  notes: string;
}

export interface WordJourney {
  word: string;
  currentMeaning: string;
  origin: Origin;
  journey: JourneyStep[];
  narrative: string;
  routeSummary: string;
  funFact?: string;
}

export type AIProvider =
  | 'gemini' | 'claude' | 'codex' | 'qwen'  // CLI agents
  | 'gemini-api' | 'openai-api' | 'anthropic-api'  // Direct APIs
  | 'ollama';  // Local Ollama

export interface AIProviderConfig {
  provider: AIProvider;
  apiKey?: string;
  baseUrl?: string;  // For Ollama custom endpoint
  model?: string;    // Model name (e.g., llama3, mistral)
  timeout?: number;
  responseLanguage?: string;  // Language for AI response (e.g., "English", "Русский")
}
