import React, { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, ChevronDown, Cpu, Settings, X, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AIProvider, AIProviderConfig } from '@/types';

const SUGGESTIONS = ["tea", "coffee", "orange", "algorithm", "chocolate", "safari"];

interface CliAgentStatus {
  name: string;
  installed: boolean;
}

interface OllamaModel {
  name: string;
  size?: number;
  modified_at?: string;
}

interface ProviderInfo {
  id: AIProvider;
  name: string;
  desc: string;
  needsKey?: boolean;
  needsConfig?: boolean;
  category: 'cli' | 'api' | 'local';
}

const PROVIDERS: ProviderInfo[] = [
  // CLI Agents (no key needed)
  { id: 'gemini', name: 'Gemini CLI', desc: '1M tokens', category: 'cli' },
  { id: 'claude', name: 'Claude CLI', desc: '200k tokens', category: 'cli' },
  { id: 'codex', name: 'Codex CLI', desc: '128k', category: 'cli' },
  { id: 'qwen', name: 'Qwen CLI', desc: 'General', category: 'cli' },
  // APIs (need key)
  { id: 'gemini-api', name: 'Gemini API', desc: 'Direct API', needsKey: true, category: 'api' },
  { id: 'openai-api', name: 'OpenAI API', desc: 'GPT-4o-mini', needsKey: true, category: 'api' },
  { id: 'anthropic-api', name: 'Anthropic API', desc: 'Claude Sonnet', needsKey: true, category: 'api' },
  // Local
  { id: 'ollama', name: 'Ollama', desc: 'Local LLM', needsConfig: true, category: 'local' },
];

const STORAGE_KEY = 'wanderword_provider_config';

interface SearchInputProps {
  onSearch: (word: string, config: AIProviderConfig) => void;
  isLoading: boolean;
}

export const SearchInput: React.FC<SearchInputProps> = ({ onSearch, isLoading }) => {
  const [value, setValue] = useState('');
  const [provider, setProvider] = useState<AIProvider>('gemini');
  const [showProviders, setShowProviders] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Settings state
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({
    'gemini-api': '',
    'openai-api': '',
    'anthropic-api': '',
  });
  const [ollamaConfig, setOllamaConfig] = useState({
    baseUrl: 'http://localhost:11434',
    model: 'llama3'
  });

  // Dynamic status
  const [cliAgents, setCliAgents] = useState<CliAgentStatus[]>([]);
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([]);
  const [ollamaLoading, setOllamaLoading] = useState(false);
  const [ollamaError, setOllamaError] = useState<string | null>(null);

  // Load saved config
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const config = JSON.parse(saved);
        if (config.apiKeys) setApiKeys(config.apiKeys);
        if (config.ollamaConfig) setOllamaConfig(config.ollamaConfig);
        if (config.provider) setProvider(config.provider);
      }
    } catch {}
  }, []);

  // Check CLI agents on mount
  useEffect(() => {
    fetch('/api/cli-agents/check')
      .then(res => res.json())
      .then(data => setCliAgents(data.agents || []))
      .catch(() => setCliAgents([]));
  }, []);

  // Fetch Ollama models
  const fetchOllamaModels = useCallback(async () => {
    setOllamaLoading(true);
    setOllamaError(null);
    try {
      const res = await fetch(`/api/ollama/tags?baseUrl=${encodeURIComponent(ollamaConfig.baseUrl)}`);
      const data = await res.json();
      if (data.error) {
        setOllamaError(data.message || 'Ollama not available');
        setOllamaModels([]);
      } else {
        setOllamaModels(data.models || []);
        // Auto-select first model if current model not in list
        if (data.models?.length && !data.models.find((m: OllamaModel) => m.name === ollamaConfig.model)) {
          setOllamaConfig(c => ({ ...c, model: data.models[0].name }));
        }
      }
    } catch {
      setOllamaError('Failed to connect to Ollama');
      setOllamaModels([]);
    } finally {
      setOllamaLoading(false);
    }
  }, [ollamaConfig.baseUrl, ollamaConfig.model]);

  // Fetch Ollama models when showing settings or switching to ollama
  useEffect(() => {
    if (showSettings || provider === 'ollama') {
      fetchOllamaModels();
    }
  }, [showSettings, provider, fetchOllamaModels]);

  // Save config
  const saveConfig = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      apiKeys,
      ollamaConfig,
      provider
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !isLoading) {
      handleSearch(value.trim());
    }
  };

  const handleSearch = (word: string) => {
    const providerInfo = PROVIDERS.find(p => p.id === provider)!;
    const config: AIProviderConfig = {
      provider,
      timeout: 90
    };

    if (providerInfo.needsKey) {
      config.apiKey = apiKeys[provider];
    }

    if (provider === 'ollama') {
      config.baseUrl = ollamaConfig.baseUrl;
      config.model = ollamaConfig.model;
    }

    saveConfig();
    onSearch(word, config);
  };

  const handleSuggestion = (suggestion: string) => {
    if (!isLoading) {
      handleSearch(suggestion);
    }
  };

  const selectedProvider = PROVIDERS.find(p => p.id === provider)!;
  const needsSetup = (selectedProvider.needsKey && !apiKeys[provider]) ||
                     (provider === 'ollama' && !ollamaConfig.baseUrl);

  return (
    <div className="w-full max-w-lg relative">
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Search Form */}
        <form onSubmit={handleSubmit} className="relative group">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={isLoading}
            placeholder="ENTER WORD TO TRACE..."
            className="w-full bg-white/40 border border-black focus:bg-white text-black px-10 py-2.5 rounded-none outline-none transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] placeholder:text-gray-600 font-mono uppercase font-bold text-xs"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-black">
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </div>
          <button
            type="submit"
            disabled={isLoading || needsSetup}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-black hover:bg-gray-800 disabled:bg-gray-500 text-white px-3 py-1 rounded-none font-mono font-bold text-[10px] transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
          >
            {isLoading ? "..." : "TRACE"}
          </button>
        </form>

        {/* Provider Selector Row */}
        <div className="flex flex-nowrap items-center gap-2 mt-2">
          {/* Current Provider Button */}
          <button
            onClick={() => setShowProviders(!showProviders)}
            className={`flex items-center gap-1 text-[9px] font-bold uppercase font-mono border px-2 py-0.5 transition-all whitespace-nowrap ${
              needsSetup
                ? 'text-red-600 border-red-400 bg-red-50'
                : 'text-black/60 hover:text-black border-black/10 hover:border-black bg-white/20'
            }`}
          >
            <Cpu size={10} />
            {selectedProvider.name}
            <ChevronDown size={10} className={showProviders ? 'rotate-180' : ''} />
          </button>

          {/* Settings Button */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1 border transition-all ${
              showSettings
                ? 'bg-black text-white border-black'
                : 'text-black/40 hover:text-black border-black/10 hover:border-black'
            }`}
            title="API Settings"
          >
            <Settings size={12} />
          </button>

          {needsSetup && (
            <span className="text-[8px] text-red-500 font-bold">← SETUP REQUIRED</span>
          )}
        </div>

        {/* Provider Dropdown */}
        <AnimatePresence>
          {showProviders && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-50 mt-1 w-full bg-white border border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-h-64 overflow-y-auto"
            >
              {/* CLI Agents */}
              <div className="px-2 py-1 bg-black/5 text-[8px] font-black uppercase tracking-widest text-black/50">
                CLI Agents (Local)
              </div>
              {PROVIDERS.filter(p => p.category === 'cli').map(p => {
                const status = cliAgents.find(a => a.name === p.id);
                const isInstalled = status?.installed ?? false;
                return (
                  <button
                    key={p.id}
                    onClick={() => { if (isInstalled) { setProvider(p.id); setShowProviders(false); } }}
                    disabled={!isInstalled}
                    className={`w-full text-left px-3 py-2 text-[10px] font-mono flex justify-between items-center ${
                      provider === p.id ? 'bg-black text-white' : isInstalled ? 'hover:bg-black/5' : 'opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <span className="font-bold uppercase flex items-center gap-1.5">
                      {isInstalled ? (
                        <CheckCircle2 size={10} className="text-green-600" />
                      ) : (
                        <XCircle size={10} className="text-red-400" />
                      )}
                      {p.name}
                    </span>
                    <span className="text-[8px] opacity-60">
                      {isInstalled ? p.desc : 'Not installed'}
                    </span>
                  </button>
                );
              })}

              {/* APIs */}
              <div className="px-2 py-1 bg-black/5 text-[8px] font-black uppercase tracking-widest text-black/50 border-t border-black/10">
                Direct APIs (Need Key)
              </div>
              {PROVIDERS.filter(p => p.category === 'api').map(p => (
                <button
                  key={p.id}
                  onClick={() => { setProvider(p.id); setShowProviders(false); if (!apiKeys[p.id]) setShowSettings(true); }}
                  className={`w-full text-left px-3 py-2 text-[10px] font-mono hover:bg-black/5 flex justify-between items-center ${
                    provider === p.id ? 'bg-black text-white' : ''
                  }`}
                >
                  <span className="font-bold uppercase">{p.name}</span>
                  <span className="text-[8px] opacity-60">
                    {apiKeys[p.id] ? '✓ ' : '⚠ '}{p.desc}
                  </span>
                </button>
              ))}

              {/* Local */}
              <div className="px-2 py-1 bg-black/5 text-[8px] font-black uppercase tracking-widest text-black/50 border-t border-black/10">
                Local Models
              </div>
              {PROVIDERS.filter(p => p.category === 'local').map(p => (
                <button
                  key={p.id}
                  onClick={() => { setProvider(p.id); setShowProviders(false); setShowSettings(true); }}
                  className={`w-full text-left px-3 py-2 text-[10px] font-mono hover:bg-black/5 flex justify-between items-center ${
                    provider === p.id ? 'bg-black text-white' : ''
                  }`}
                >
                  <span className="font-bold uppercase">{p.name}</span>
                  <span className="text-[8px] opacity-60">{p.desc}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 border border-black bg-white/90 p-3 space-y-3 overflow-hidden"
            >
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase">API Settings</span>
                <button onClick={() => setShowSettings(false)} className="text-black/40 hover:text-black">
                  <X size={14} />
                </button>
              </div>

              {/* API Keys */}
              <div className="space-y-2">
                <div>
                  <label className="text-[9px] font-bold text-black/60 uppercase">Gemini API Key</label>
                  <input
                    type="password"
                    value={apiKeys['gemini-api']}
                    onChange={(e) => setApiKeys({...apiKeys, 'gemini-api': e.target.value})}
                    placeholder="AIza..."
                    className="w-full bg-white border border-black/20 focus:border-black text-black px-2 py-1 text-[10px] font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-black/60 uppercase">OpenAI API Key</label>
                  <input
                    type="password"
                    value={apiKeys['openai-api']}
                    onChange={(e) => setApiKeys({...apiKeys, 'openai-api': e.target.value})}
                    placeholder="sk-..."
                    className="w-full bg-white border border-black/20 focus:border-black text-black px-2 py-1 text-[10px] font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-black/60 uppercase">Anthropic API Key</label>
                  <input
                    type="password"
                    value={apiKeys['anthropic-api']}
                    onChange={(e) => setApiKeys({...apiKeys, 'anthropic-api': e.target.value})}
                    placeholder="sk-ant-..."
                    className="w-full bg-white border border-black/20 focus:border-black text-black px-2 py-1 text-[10px] font-mono outline-none"
                  />
                </div>
              </div>

              {/* Ollama Config */}
              <div className="border-t border-black/10 pt-2 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[9px] font-bold text-black/60 uppercase">Ollama Settings</label>
                  <button
                    onClick={fetchOllamaModels}
                    disabled={ollamaLoading}
                    className="text-[8px] text-black/40 hover:text-black flex items-center gap-1"
                  >
                    <RefreshCw size={10} className={ollamaLoading ? 'animate-spin' : ''} />
                    Refresh
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={ollamaConfig.baseUrl}
                    onChange={(e) => setOllamaConfig({...ollamaConfig, baseUrl: e.target.value})}
                    onBlur={fetchOllamaModels}
                    placeholder="http://localhost:11434"
                    className="flex-1 bg-white border border-black/20 focus:border-black text-black px-2 py-1 text-[10px] font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="text-[8px] text-black/50 uppercase">Model</label>
                  {ollamaError ? (
                    <div className="text-[9px] text-red-500 py-1">{ollamaError}</div>
                  ) : ollamaModels.length > 0 ? (
                    <select
                      value={ollamaConfig.model}
                      onChange={(e) => setOllamaConfig({...ollamaConfig, model: e.target.value})}
                      className="w-full bg-white border border-black/20 focus:border-black text-black px-2 py-1 text-[10px] font-mono outline-none"
                    >
                      {ollamaModels.map(m => (
                        <option key={m.name} value={m.name}>
                          {m.name} {m.size ? `(${(m.size / 1e9).toFixed(1)}GB)` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={ollamaConfig.model}
                      onChange={(e) => setOllamaConfig({...ollamaConfig, model: e.target.value})}
                      placeholder="llama3"
                      className="w-full bg-white border border-black/20 focus:border-black text-black px-2 py-1 text-[10px] font-mono outline-none"
                    />
                  )}
                </div>
                <p className="text-[8px] text-black/40">
                  {ollamaModels.length > 0
                    ? `${ollamaModels.length} models available`
                    : 'Enter base URL and refresh to see models'}
                </p>
              </div>

              <button
                onClick={saveConfig}
                className="w-full bg-black text-white py-1 text-[10px] font-bold uppercase hover:bg-gray-800"
              >
                Save Settings
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Suggestions */}
        <div className="flex flex-nowrap items-center gap-3 mt-2 overflow-x-auto no-scrollbar pb-1">
          <span className="text-black font-bold text-[9px] uppercase font-mono whitespace-nowrap opacity-60">
            Suggestions:
          </span>
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => handleSuggestion(suggestion)}
              disabled={isLoading}
              className="text-black/60 hover:text-black text-[9px] font-bold uppercase font-mono border border-black/10 hover:border-black px-2 py-0.5 transition-all whitespace-nowrap bg-white/20"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
