import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Crosshair, 
  Sparkles, 
  Compass, 
  Bookmark, 
  ChevronUp, 
  ChevronDown,
  BookOpen,
  Navigation
} from 'lucide-react';
import { Star } from '../../types/celestial';
import { getSpectralColor } from '../../utils/astronomy';
import { Language, TRANSLATIONS, getConstellationName } from '../../utils/i18n';
import { soundFx } from '../../utils/audio';

interface StarBottomSheetProps {
  star: Star | null;
  isOpen: boolean;
  onClose: () => void;
  onFocusStar: (star: Star) => void;
  isFavorite: boolean;
  onToggleFavorite: (starId: string | number) => void;
  onOpenJournal?: (star: Star) => void;
  onResetOrientation?: () => void;
  onSetDirection?: (azimuth: number) => void;
  lang?: Language;
}

export const StarBottomSheet: React.FC<StarBottomSheetProps> = ({
  star,
  isOpen,
  onClose,
  onFocusStar,
  isFavorite,
  onToggleFavorite,
  onOpenJournal,
  onResetOrientation,
  onSetDirection,
  lang = 'vi',
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const t = TRANSLATIONS[lang];

  if (!isOpen || !star) return null;

  const spectralColor = getSpectralColor(star.spect);
  const constellationName = getConstellationName(star.con, lang);

  const handleFocus = () => {
    soundFx.playTargetRayTrace();
    onFocusStar(star);
  };

  const handleToggleFav = () => {
    soundFx.playToggle(!isFavorite);
    onToggleFavorite(star.id);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={(_, info) => {
          if (info.offset.y > 60) {
            if (isExpanded) {
              soundFx.playModalTransition();
              setIsExpanded(false);
            } else {
              soundFx.playTabClick();
              onClose();
            }
          } else if (info.offset.y < -30) {
            soundFx.playModalTransition();
            setIsExpanded(true);
          }
        }}
        // Thiết kế tinh giản siêu gọn (Ultra-compact), vị trí nổi chuẩn xác phía trên thanh BottomNav
        className="md:hidden fixed star-bottom-sheet left-2.5 right-2.5 z-40 pointer-events-none select-none flex flex-col items-end"
      >
        {/* Anchored AR Star Tracker Slot: Gắn chặt nổi phía trên mép phải thẻ thông tin */}
        <div id="star-sheet-ar-slot" className="pointer-events-auto mb-2 flex justify-end" />

        {/* Card Body Container */}
        <div className="w-full rounded-2xl glass-panel border border-cyan-500/40 shadow-2xl overflow-hidden pointer-events-auto">
          {/* Drag Handle Indicator */}
          <div 
            onClick={() => {
              soundFx.playModalTransition();
              setIsExpanded(!isExpanded);
            }}
            className="w-full pt-1.5 pb-0.5 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing"
          >
            <div className="w-8 h-1 rounded-full bg-cyan-400/40 hover:bg-cyan-400 transition-colors" />
          </div>

        {/* Compact Header: Tên sao, Chòm sao & Nút điều khiển nhanh */}
        <div className="px-3 py-1 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div 
              className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 border border-white/20 shadow-glow-cyan"
              style={{ 
                backgroundColor: `${spectralColor}22`,
                borderColor: spectralColor 
              }}
            >
              <Sparkles className="w-3.5 h-3.5" style={{ color: spectralColor }} />
            </div>

            <div className="min-w-0">
              <h3 className="text-xs font-bold text-white truncate font-sans">
                {star.name || `Star #${star.id}`}
              </h3>
              <p className="text-[10px] text-cyan-400 font-mono truncate">
                {constellationName} • Mag {star.mag.toFixed(1)}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1 flex-shrink-0">
            {/* Nút yêu thích */}
            <button
              onClick={handleToggleFav}
              className={`p-1.5 rounded-lg transition-all ${
                isFavorite 
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40' 
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
            </button>

            {/* Nút thu gọn / mở rộng chi tiết */}
            <button
              onClick={() => {
                soundFx.playModalTransition();
                setIsExpanded(!isExpanded);
              }}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>

            {/* Nút đóng */}
            <button
              onClick={() => {
                soundFx.playTabClick();
                onClose();
              }}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Hàng hành động gộp: La bàn đổi hướng (N, E, S, W, ZENITH) và Nút Chiếu Laser 3D trên cùng một hàng */}
        <div className="px-3 pb-2.5 pt-1 flex items-center justify-between gap-1.5">
          {/* Nhóm điều hướng N, E, S, W, ZENITH */}
          <div className="flex items-center space-x-0.5 p-0.5 rounded-xl bg-slate-900/80 border border-white/5 flex-shrink-0">
            <button
              onClick={() => {
                soundFx.playTabClick();
                onSetDirection?.(0);
              }}
              className="px-1.5 py-1 rounded-md text-[10px] font-mono font-bold text-slate-300 hover:text-cyan-300 active:bg-cyan-500/20"
              title="Hướng Bắc (0°)"
            >
              N
            </button>
            <button
              onClick={() => {
                soundFx.playTabClick();
                onSetDirection?.(90);
              }}
              className="px-1.5 py-1 rounded-md text-[10px] font-mono font-bold text-slate-300 hover:text-cyan-300 active:bg-cyan-500/20"
              title="Hướng Đông (90°)"
            >
              E
            </button>
            <button
              onClick={() => {
                soundFx.playTabClick();
                onSetDirection?.(180);
              }}
              className="px-1.5 py-1 rounded-md text-[10px] font-mono font-bold text-slate-300 hover:text-cyan-300 active:bg-cyan-500/20"
              title="Hướng Nam (180°)"
            >
              S
            </button>
            <button
              onClick={() => {
                soundFx.playTabClick();
                onSetDirection?.(270);
              }}
              className="px-1.5 py-1 rounded-md text-[10px] font-mono font-bold text-slate-300 hover:text-cyan-300 active:bg-cyan-500/20"
              title="Hướng Tây (270°)"
            >
              W
            </button>
            {onResetOrientation && (
              <button
                onClick={() => {
                  soundFx.playTabClick();
                  onResetOrientation();
                }}
                className="flex items-center space-x-1 px-1.5 py-1 rounded-md text-[9px] font-hud text-cyan-300 bg-cyan-950/80 border border-cyan-500/30 hover:bg-cyan-900 active:scale-95"
                title="Ngửa góc nhìn lên đỉnh đầu (Zenith 90°)"
              >
                <Navigation className="w-2.5 h-2.5 text-cyan-400" />
                <span>ZENITH</span>
              </button>
            )}
          </div>

          {/* Nút Chiếu Laser 3D (Rút gọn vừa vặn) */}
          <button
            onClick={handleFocus}
            className="flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-xl bg-gradient-to-r from-cyan-500/25 via-purple-500/25 to-blue-500/25 border border-cyan-400/50 text-cyan-200 active:scale-98 transition-all shadow-glow-cyan text-[11px] font-semibold truncate"
          >
            <Crosshair className="w-3.5 h-3.5 text-cyan-400 animate-pulse flex-shrink-0" />
            <span className="truncate">{t.targetRayTraceShort}</span>
          </button>
        </div>

        {/* Thông tin chi tiết mở rộng (Chỉ hiện khi vuốt lên) */}
        {isExpanded && (
          <div className="px-3 pb-3 pt-1 space-y-2 overflow-y-auto max-h-[45vh] text-xs font-sans animate-in fade-in duration-200 border-t border-white/5">
            {/* Grid thông số vật lý */}
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <div className="p-2 rounded-xl bg-slate-900/70 border border-white/5">
                <div className="text-[9px] text-slate-400 font-hud uppercase">{t.spectralClass}</div>
                <div className="text-[11px] font-bold font-mono text-cyan-300 mt-0.5 flex items-center gap-1.5">
                  <span 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: spectralColor }}
                  />
                  <span>{star.spect || 'Unknown'}</span>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-slate-900/70 border border-white/5">
                <div className="text-[9px] text-slate-400 font-hud uppercase">{t.distance}</div>
                <div className="text-[11px] font-bold font-mono text-purple-300 mt-0.5">
                  {star.dist ? `${star.dist.toLocaleString()} ${t.lightYears}` : constellationName}
                </div>
              </div>
            </div>

            {/* Tọa độ thiên văn */}
            <div className="p-2.5 rounded-xl bg-slate-900/70 border border-white/5 space-y-1 font-mono text-[10px]">
              <div className="text-[9px] text-slate-400 font-hud uppercase flex items-center justify-between">
                <span>{t.celestialCoords}</span>
                <Compass className="w-3 h-3 text-cyan-400" />
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-slate-200">
                <div>RA: <span className="text-white">{star.ra.toFixed(2)}°</span></div>
                <div>DEC: <span className="text-white">{star.dec > 0 ? `+${star.dec.toFixed(2)}` : star.dec.toFixed(2)}°</span></div>
                <div>{t.altitude}: <span className="text-emerald-400 font-bold">{star.alt?.toFixed(1)}°</span></div>
                <div>{t.azimuth}: <span className="text-cyan-300">{star.az?.toFixed(1)}°</span></div>
              </div>
            </div>

            {/* Ghi nhật ký */}
            {onOpenJournal && (
              <button
                onClick={() => {
                  soundFx.playTabClick();
                  onOpenJournal(star);
                }}
                className="w-full flex items-center justify-center space-x-1.5 py-1.5 rounded-xl bg-purple-950/60 border border-purple-500/30 text-purple-300 text-[11px] font-medium"
              >
                <BookOpen className="w-3 h-3 text-purple-400" />
                <span>{t.logToJournal}</span>
              </button>
            )}
          </div>
        )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
