import React, { useState, useEffect, useCallback, useRef } from 'react';
import { WorldMap } from '@/components/WorldMap';
import { SearchInput } from '@/components/SearchInput';
import { InfoPanel } from '@/components/InfoPanel';
import { PlaybackControls } from '@/components/PlaybackControls';
import { fetchWordJourney } from '@/services/aiProvider';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Languages, FastForward, Terminal } from 'lucide-react';
import type { WordJourney, AIProviderConfig } from '@/types';

const LOADING_MESSAGES = [
  "RESEARCHING_LINGUISTIC_ROOTS...",
  "言葉の葉のルーツを辿っています...",
  "正在研究语言根源...",
  "RECHERCHE DES RACINES LINGUISTIQUES...",
  "ΕΡΕΥΝΩΝΤΑΣ ΤΙΣ ΓΛΩΣΣΙΚΕΣ ΡΙΖΕΣ...",
  "INVESTIGANDO RAÍCES LINGÜÍSTICAS...",
  "ИССЛЕДОВАНИЕ ЛИНГВИСТИЧЕСКИХ КОРНЕЙ...",
  "ভাষাগত শিকড় অনুসন্ধান করা হচ্ছে...",
];

const App: React.FC = () => {
  const [journeyData, setJourneyData] = useState<WordJourney | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeWaypointIndex, setActiveWaypointIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showPanel, setShowPanel] = useState(false);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const timerRef = useRef<number | null>(null);

  // Cycle loading messages
  useEffect(() => {
    let interval: number;
    if (isLoading) {
      interval = window.setInterval(() => {
        setLoadingMsgIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
      }, 1200);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleSearch = async (word: string, config: AIProviderConfig) => {
    setIsLoading(true);
    setError(null);
    setIsPlaying(false);
    setActiveWaypointIndex(-1);
    setShowPanel(false);

    try {
      const data = await fetchWordJourney(word, config);
      setJourneyData(data);
      setShowPanel(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'RESEARCH_FAILED_RETRY_QUERY';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePlay = () => setIsPlaying(prev => !prev);

  const handleReset = () => {
    setIsPlaying(false);
    setActiveWaypointIndex(-1);
  };

  const handleNext = useCallback(() => {
    if (!journeyData) return;
    setActiveWaypointIndex(prev => Math.min(prev + 1, journeyData.journey.length - 1));
  }, [journeyData]);

  const handlePrev = useCallback(() => {
    setActiveWaypointIndex(prev => Math.max(prev - 1, -1));
  }, []);

  // Auto-play logic
  useEffect(() => {
    if (isPlaying && journeyData) {
      if (activeWaypointIndex < journeyData.journey.length - 1) {
        timerRef.current = window.setTimeout(() => {
          handleNext();
        }, 1500 / playbackSpeed);
      } else {
        setIsPlaying(false);
      }
    }
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [isPlaying, activeWaypointIndex, journeyData, handleNext, playbackSpeed]);

  const progress = journeyData ? (activeWaypointIndex + 1) / journeyData.journey.length : 0;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-mint font-mono">
      {/* Header */}
      <header className="flex items-center justify-between px-10 py-6 bg-mint border-b border-black z-30 shrink-0">
        <div className="flex flex-col gap-1 shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-black text-white p-1">
              <Terminal size={20} />
            </div>
            <h2 className="text-2xl font-doto font-bold tracking-tight text-black leading-none">
              WANDERWORD
            </h2>
          </div>
          <div className="bg-black text-white text-[9px] px-2 py-0.5 w-fit font-black uppercase tracking-widest">
            System.Research.Global_Lithomology
          </div>
        </div>

        <SearchInput onSearch={handleSearch} isLoading={isLoading} />

        <div className="hidden lg:flex flex-col items-end shrink-0 pointer-events-none text-[8px] font-bold text-black/40 uppercase">
          <span>sys_id: 802405 (R00674)</span>
          <span>proj: natural_earth_1</span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 relative overflow-hidden">
        <WorldMap
          journeyData={journeyData}
          activeWaypointIndex={activeWaypointIndex}
          isPanelOpen={showPanel && !!journeyData}
        />

        <AnimatePresence>
          {/* Loading overlay */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 bg-mint/40 backdrop-blur-sm flex flex-col items-center justify-center"
            >
              <div className="w-20 h-20 bg-black flex items-center justify-center animate-pulse">
                <Languages size={40} className="text-white" />
              </div>
              <motion.p
                key={loadingMsgIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 text-black font-black uppercase tracking-tighter bg-white px-5 py-2 border border-black min-w-[320px] text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-xs"
              >
                {LOADING_MESSAGES[loadingMsgIndex]}
              </motion.p>
            </motion.div>
          )}

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="absolute top-10 left-1/2 -translate-x-1/2 z-50 bg-black text-white p-4 flex items-center gap-3 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] max-w-md"
            >
              <AlertCircle size={18} />
              <p className="text-[10px] font-black uppercase tracking-widest">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Playback controls and info panel */}
        {journeyData && !isLoading && (
          <>
            <PlaybackControls
              isPlaying={isPlaying}
              onTogglePlay={handleTogglePlay}
              onNext={handleNext}
              onPrev={handlePrev}
              onReset={handleReset}
              playbackSpeed={playbackSpeed}
              onSetSpeed={setPlaybackSpeed}
              progress={progress}
              canGoNext={activeWaypointIndex < journeyData.journey.length - 1}
              canGoPrev={activeWaypointIndex > -1}
            />

            <AnimatePresence>
              {showPanel && (
                <InfoPanel
                  data={journeyData}
                  onClose={() => setShowPanel(false)}
                  activeWaypointIndex={activeWaypointIndex}
                />
              )}
            </AnimatePresence>

            {!showPanel && (
              <button
                onClick={() => setShowPanel(true)}
                className="absolute right-6 top-1/2 -translate-y-1/2 bg-black text-white p-3 rounded-none border border-white hover:bg-gray-900 transition-colors z-20 shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
              >
                <FastForward size={24} className="-rotate-180" />
              </button>
            )}
          </>
        )}

        {/* Empty state legend */}
        {!journeyData && !isLoading && (
          <div className="absolute bottom-20 left-10 text-black max-w-xs space-y-4 pointer-events-none font-mono">
            <div className="border-l-4 border-black pl-4">
              <p className="text-[11px] font-bold leading-tight uppercase">
                Migration_History: Trace evolution stages across global coordinates.
              </p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5 border border-black px-2 py-0.5 bg-white/50">
                <div className="w-2 h-2 bg-black" />
                <span className="text-[9px] font-black uppercase">Land_Route</span>
              </div>
              <div className="flex items-center gap-1.5 border border-black px-2 py-0.5 bg-white/50">
                <div className="w-2 h-2 bg-transparent border border-black" />
                <span className="text-[9px] font-black uppercase">Sea_Route</span>
              </div>
            </div>
          </div>
        )}

        {/* Coordinate labels */}
        <div className="absolute top-1/2 left-2 -translate-y-1/2 flex flex-col gap-20 text-[10px] font-bold text-black/60 pointer-events-none">
          <span>40N</span>
          <span>38N</span>
          <span>36N</span>
        </div>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-20 text-[10px] font-bold text-black/60 pointer-events-none">
          <span>124E</span>
          <span>128E</span>
          <span>132E</span>
        </div>
      </main>
    </div>
  );
};

export default App;
