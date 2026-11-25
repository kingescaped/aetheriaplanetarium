import React from 'react';
import { Compass, Navigation } from 'lucide-react';
import { Star, ViewMode } from '../../types/celestial';

interface BottomHUDProps {
  viewMode: ViewMode;
  selectedStar: Star | null;
  cursorCoords: { ra: number; dec: number; alt: number; az: number };
  onResetOrientation: () => void;
  onSetDirection: (azimuth: number) => void;
}

export const BottomHUD: React.FC<BottomHUDProps> = ({
  viewMode,
  selectedStar,
  cursorCoords,
  onResetOrientation,
  onSetDirection,
}) => {
  return (
    <footer className="hidden md:flex absolute bottom-[max(0.75rem,var(--sab))] left-[max(1rem,var(--sal))] right-[max(1rem,var(--sar))] z-20 items-center justify-between pointer-events-none">
      {/* Left: Cardinal Direction Jump Buttons */}
      <div className="flex items-center space-x-1 p-1 rounded-xl glass-panel pointer-events-auto border border-white/10 shadow-glass">
        <button
          onClick={() => onSetDirection(0)}
          className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold text-slate-300 hover:text-cyan-400 hover:bg-white/5 transition-colors"
          title="Face North (0°)"
        >
          N
        </button>
        <button
          onClick={() => onSetDirection(90)}
          className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold text-slate-300 hover:text-cyan-400 hover:bg-white/5 transition-colors"
          title="Face East (90°)"
        >
          E
        </button>
        <button
          onClick={() => onSetDirection(180)}
          className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold text-slate-300 hover:text-cyan-400 hover:bg-white/5 transition-colors"
          title="Face South (180°)"
        >
          S
        </button>
        <button
          onClick={() => onSetDirection(270)}
          className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold text-slate-300 hover:text-cyan-400 hover:bg-white/5 transition-colors"
          title="Face West (270°)"
        >
          W
        </button>
        <div className="w-[1px] h-4 bg-white/10 mx-1" />
        <button
          onClick={onResetOrientation}
          className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-hud text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 hover:bg-cyan-900 transition-colors"
          title="Look straight up at Zenith (Alt 90°)"
        >
          <Navigation className="w-3 h-3 text-cyan-400" />
          <span>ZENITH</span>
        </button>
      </div>

      {/* Center: Selected Object Lock Pill */}
      {selectedStar && (
        <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full glass-panel pointer-events-auto border border-cyan-500/30 shadow-glow-cyan animate-pulse-subtle">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-[11px] font-mono text-cyan-300">
            LOCKED: <strong className="text-white font-bold">{selectedStar.name || `Star #${selectedStar.id}`}</strong>
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            (Mag: {selectedStar.mag})
          </span>
        </div>
      )}

      {/* Right: Real-time Cursor & Horizon Telemetry */}
      <div className="hidden sm:flex items-center space-x-3 px-3 py-1.5 rounded-xl glass-panel pointer-events-auto border border-white/10 font-hud text-xs text-slate-300 shadow-glass">
        <div className="flex items-center space-x-1.5">
          <Compass className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-slate-400 text-[10px]">ALT:</span>
          <span className="font-mono text-cyan-300">{cursorCoords.alt.toFixed(1)}°</span>
          <span className="text-slate-400 text-[10px] ml-1">AZ:</span>
          <span className="font-mono text-cyan-300">{cursorCoords.az.toFixed(1)}°</span>
        </div>

        <div className="w-[1px] h-3.5 bg-white/10" />

        <div className="flex items-center space-x-1.5">
          <span className="text-slate-400 text-[10px]">MODE:</span>
          <span className="font-bold text-[10px] text-purple-300">
            {viewMode === '3D_ZENITH_DOME' ? '3D DOME' : '2D SKY'}
          </span>
        </div>
      </div>
    </footer>
  );
};
