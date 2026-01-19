import React from 'react';
import { Play, Pause, FastForward, Rewind, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';

interface PlaybackControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onReset: () => void;
  playbackSpeed: number;
  onSetSpeed: (speed: number) => void;
  progress: number;
  canGoNext: boolean;
  canGoPrev: boolean;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPlaying,
  onTogglePlay,
  onNext,
  onPrev,
  onReset,
  playbackSpeed,
  onSetSpeed,
  progress,
  canGoNext,
  canGoPrev,
}) => {
  return (
    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-4 font-mono">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white/90 border border-black p-2 flex items-center gap-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
      >
        {/* Playback buttons */}
        <div className="flex items-center gap-1 border-r border-black/20 pr-3">
          <button
            onClick={onReset}
            className="p-1.5 text-black hover:bg-black hover:text-white transition-colors"
            title="Reset"
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={onPrev}
            disabled={!canGoPrev}
            className={`p-1.5 transition-colors ${
              !canGoPrev ? 'text-gray-300' : 'text-black hover:bg-black hover:text-white'
            }`}
          >
            <Rewind size={18} />
          </button>
          <button
            onClick={onTogglePlay}
            className="p-2 bg-black text-white hover:bg-gray-800 transition-all active:translate-x-[1px] active:translate-y-[1px]"
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button
            onClick={onNext}
            disabled={!canGoNext}
            className={`p-1.5 transition-colors ${
              !canGoNext ? 'text-gray-300' : 'text-black hover:bg-black hover:text-white'
            }`}
          >
            <FastForward size={18} />
          </button>
        </div>

        {/* Speed controls */}
        <div className="flex gap-1">
          {[0.5, 1, 2].map((speed) => (
            <button
              key={speed}
              onClick={() => onSetSpeed(speed)}
              className={`px-2 py-0.5 text-[9px] font-black transition-all border ${
                playbackSpeed === speed
                  ? 'bg-black text-white border-black'
                  : 'text-black border-transparent hover:border-black'
              }`}
            >
              {speed}X
            </button>
          ))}
        </div>
      </motion.div>

      {/* Progress bar */}
      <div className="w-64 h-1 border border-black bg-white overflow-hidden">
        <motion.div
          className="h-full bg-black"
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  );
};
