import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Sparkles, Filter, ChevronLeft } from 'lucide-react';
import { Star } from '../../types/celestial';
import { Language, TRANSLATIONS } from '../../utils/i18n';
import { soundFx } from '../../utils/audio';

interface SearchBarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStar: (star: Star) => void;
  starsCatalog: Star[];
  lang?: Language;
}

export const SearchBarModal: React.FC<SearchBarModalProps> = ({
  isOpen,
  onClose,
  onSelectStar,
  starsCatalog,
  lang = 'vi',
}) => {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'bright' | 'constellation'>('all');
  const inputRef = useRef<HTMLInputElement>(null);
  const t = TRANSLATIONS[lang];

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
    } else {
      setQuery('');
      setSelectedCategory('all');
    }
  }, [isOpen]);

  // Global key listener for Ctrl+K and Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredStars = starsCatalog
    .filter((s) => {
      // Category filter
      if (selectedCategory === 'bright' && s.mag > 1.5) return false;
      if (selectedCategory === 'constellation' && !s.con) return false;

      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.properName && s.properName.toLowerCase().includes(q)) ||
        (s.con && s.con.toLowerCase().includes(q)) ||
        (s.bayerFlamsteed && s.bayerFlamsteed.toLowerCase().includes(q))
      );
    })
    .slice(0, 16); // Results

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center md:pt-16 p-0 md:px-4 bg-black/85 md:bg-black/60 backdrop-blur-xl animate-in fade-in duration-200">
      {/* Full screen on mobile (rounded-none h-full), Glassmorphic dialog on desktop (md:rounded-3xl md:h-auto) */}
      <div 
        className="relative w-full h-full md:h-auto md:max-h-[80vh] md:max-w-xl md:rounded-3xl glass-panel md:border border-cyan-500/30 shadow-2xl overflow-hidden flex flex-col safe-top safe-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar with explicit 'X' button instead of 'ESC' */}
        <div className="flex items-center px-4 h-14 md:h-16 border-b border-white/10 bg-[#060c1c]">
          {/* Back button on mobile */}
          <button
            onClick={() => {
              soundFx.playTabClick();
              onClose();
            }}
            className="md:hidden p-1.5 -ml-1 mr-2 rounded-xl text-slate-400 hover:text-white"
          >
            <ChevronLeft className="w-5 h-5 text-cyan-400" />
          </button>

          <Search className="w-5 h-5 text-cyan-400 mr-2.5 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder={t.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none font-sans"
          />

          {query && (
            <button
              onClick={() => {
                soundFx.playTabClick();
                setQuery('');
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-white mr-1.5"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Explicit 'X' button on both Mobile & Desktop */}
          <button
            onClick={() => {
              soundFx.playTabClick();
              onClose();
            }}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors flex items-center justify-center"
            title={t.close}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Filter Chips */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-white/5 bg-slate-950/40 overflow-x-auto text-xs">
          <span className="text-[10px] text-slate-500 font-hud mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-cyan-400" />
            <span>{t.quickFilters}</span>
          </span>

          <button
            onClick={() => {
              soundFx.playTabClick();
              setSelectedCategory('all');
            }}
            className={`px-2.5 py-1 rounded-xl transition-all ${
              selectedCategory === 'all'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            {lang === 'vi' ? 'Tất cả' : 'All'}
          </button>

          <button
            onClick={() => {
              soundFx.playTabClick();
              setSelectedCategory('bright');
            }}
            className={`px-2.5 py-1 rounded-xl transition-all ${
              selectedCategory === 'bright'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.brightestStars} (Mag &lt; 1.5)
          </button>

          <button
            onClick={() => {
              soundFx.playTabClick();
              setSelectedCategory('constellation');
            }}
            className={`px-2.5 py-1 rounded-xl transition-all ${
              selectedCategory === 'constellation'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.majorConstellations}
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2.5 md:p-3 divide-y divide-white/5">
          {filteredStars.length > 0 ? (
            filteredStars.map((star) => (
              <button
                key={star.id}
                onClick={() => {
                  soundFx.playStarSelect();
                  onSelectStar(star);
                  onClose();
                }}
                className="w-full text-left p-3 rounded-2xl hover:bg-cyan-500/10 active:bg-cyan-500/20 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-cyan-950/70 border border-cyan-500/30 flex items-center justify-center group-hover:scale-105 group-hover:border-cyan-400 transition-transform">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white group-hover:text-cyan-300">
                      {star.name || star.properName || `Star #${star.id}`}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {star.con ? `${star.con} ${t.constellation}` : 'Deep Sky'} • {t.apparentMagnitude}: <span className="text-cyan-300">{star.mag}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right text-[11px] font-mono text-slate-400">
                  {star.alt !== undefined && (
                    <span className="text-emerald-400 font-bold">Alt: {star.alt.toFixed(1)}°</span>
                  )}
                  <br />
                  <span>{star.dist ? `${star.dist} ly` : ''}</span>
                </div>
              </button>
            ))
          ) : (
            <div className="py-16 text-center text-xs text-slate-400">
              {t.noResults} "{query}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
