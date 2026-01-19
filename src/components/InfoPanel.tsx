import React from 'react';
import { motion } from 'framer-motion';
import { X, MapPin, Anchor, Landmark } from 'lucide-react';
import type { WordJourney } from '@/types';

interface InfoPanelProps {
  data: WordJourney;
  onClose: () => void;
  activeWaypointIndex: number;
}

export const InfoPanel: React.FC<InfoPanelProps> = ({ data, onClose, activeWaypointIndex }) => {
  if (!data) return null;

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 200 }}
      className="fixed right-0 top-0 h-full w-[400px] bg-mint/95 border-l border-black backdrop-blur-xl z-30 flex flex-col font-mono"
    >
      {/* Header */}
      <div className="p-6 border-b border-black flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-doto text-black mb-1 capitalize leading-none">
            {data.word}
          </h1>
          <p className="text-[10px] text-black font-bold tracking-widest uppercase">
            / Definition: {data.currentMeaning}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 border border-black hover:bg-black hover:text-white transition-colors text-black"
        >
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        {/* Origin Section */}
        <section className="space-y-4">
          <div className="bg-black text-white px-2 py-1 inline-block text-[10px] font-bold uppercase">
            00_Origin_Point
          </div>
          <div className="border border-black p-4 bg-white/20">
            <p className="text-2xl font-doto text-black">"{data.origin.word}"</p>
            <p className="text-[10px] text-black/60 font-bold mb-2 uppercase">
              {data.origin.language} // {data.origin.century}
            </p>
            <p className="text-black text-xs leading-relaxed border-t border-black/10 pt-2">
              MEANING: <span className="font-bold">{data.origin.meaning}</span>
            </p>
            <div className="flex items-center gap-1 mt-3 text-[10px] text-black/50 font-bold uppercase">
              <MapPin size={10} />
              <span>LOC: {data.origin.location.name}</span>
            </div>
          </div>
        </section>

        {/* Narrative Section */}
        <section className="space-y-4">
          <div className="bg-black text-white px-2 py-1 inline-block text-[10px] font-bold uppercase">
            01_Historical_Narrative
          </div>
          <p className="text-black text-xs leading-relaxed border border-black p-4 bg-black/5 whitespace-pre-line">
            {data.narrative}
          </p>
        </section>

        {/* Migration Log */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="bg-black text-white px-2 py-1 inline-block text-[10px] font-bold uppercase">
              02_Migration_Log
            </div>
            <span className="text-[9px] px-2 py-0.5 border border-black font-black uppercase tracking-tighter">
              {data.routeSummary}_ROUTE
            </span>
          </div>

          <div className="relative pl-6 space-y-6 before:absolute before:left-[3px] before:top-2 before:bottom-2 before:w-[1px] before:bg-black">
            {data.journey.map((step, idx) => (
              <div
                key={idx}
                className={`relative transition-all ${idx <= activeWaypointIndex ? 'opacity-100' : 'opacity-20'}`}
              >
                <div
                  className={`absolute -left-[27px] top-1 w-2 h-2 border border-black transition-colors ${
                    idx <= activeWaypointIndex ? 'bg-black' : 'bg-transparent'
                  }`}
                />
                <div
                  className={`p-4 border transition-all ${
                    activeWaypointIndex === idx
                      ? 'bg-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                      : 'bg-transparent border-black/20 hover:border-black'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-xl font-doto text-black">"{step.word}"</p>
                    {step.routeType === 'sea' ? (
                      <Anchor size={14} className="text-black" />
                    ) : (
                      <Landmark size={14} className="text-black" />
                    )}
                  </div>
                  <p className="text-[9px] text-black/60 font-bold uppercase mb-2">
                    Stage_{idx + 1} // {step.language} // {step.century}
                  </p>
                  {step.pronunciation && (
                    <p className="text-[10px] text-black font-bold mb-2">
                      IPA: [{step.pronunciation}]
                    </p>
                  )}
                  <p className="text-[10px] text-black/80 leading-normal">
                    {step.notes}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Fun Fact */}
        {data.funFact && (
          <section className="border border-dashed border-black p-4">
            <h4 className="text-[9px] uppercase font-black text-black mb-1 tracking-widest">
              _Addendum_
            </h4>
            <p className="text-[11px] text-black/80 italic">
              "{data.funFact}"
            </p>
          </section>
        )}
      </div>
    </motion.div>
  );
};
