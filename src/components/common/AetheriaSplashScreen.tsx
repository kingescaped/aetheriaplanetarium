import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AetheriaStarLogo } from './AetheriaLogo';
import { Radio } from 'lucide-react';
import { Language } from '../../utils/i18n';

interface AetheriaSplashScreenProps {
  isReady: boolean;
  lang?: Language;
}

/**
 * AetheriaSplashScreen: Màn hình chờ khởi tạo hệ thống thiên văn học chuẩn Native.
 * - Khóa chặt toàn màn hình (z-[9999]) trong suốt quá trình tính toán ban đầu.
 * - Cho phép WebKit iOS có đủ thời gian gán env(safe-area-inset-top/bottom).
 * - Chờ Three.js compile shader và tính xong ma trận 5.200+ ngôi sao.
 * - Mờ dần (Fade out) mượt mà 120fps sau khi mọi thành phần đã hoàn toàn ổn định.
 */
export const AetheriaSplashScreen: React.FC<AetheriaSplashScreenProps> = ({
  isReady,
  lang = 'vi',
}) => {
  const [progress, setProgress] = useState<number>(20);
  const [statusText, setStatusText] = useState<string>(
    lang === 'vi' ? 'Nạp danh mục 5.200+ ngôi sao...' : 'Loading 5,200+ celestial catalog...'
  );

  useEffect(() => {
    // Giai đoạn 1: Tính toán ma trận tọa độ thiên văn
    const timer1 = setTimeout(() => {
      setProgress(55);
      setStatusText(
        lang === 'vi'
          ? 'Hiệu chuẩn ma trận tọa độ xích đạo & chân trời...'
          : 'Computing Horizontal & Equatorial coordinate matrix...'
      );
    }, 250);

    // Giai đoạn 2: Đồng bộ Safe Area phần cứng iOS
    const timer2 = setTimeout(() => {
      setProgress(85);
      setStatusText(
        lang === 'vi'
          ? 'Đồng bộ Safe Area & phần cứng hiển thị...'
          : 'Syncing Hardware Safe Area & Viewport...'
      );
    }, 600);

    // Giai đoạn 3: Hệ thống sẵn sàng
    const timer3 = setTimeout(() => {
      setProgress(100);
      setStatusText(lang === 'vi' ? 'Khởi tạo hoàn tất' : 'System Ready');
    }, 900);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [lang]);

  return (
    <AnimatePresence>
      {!isReady && (
        <motion.div
          key="aetheria-splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#060c1c] select-none pointer-events-auto overflow-hidden"
          style={{
            paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)',
            paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)',
          }}
        >
          {/* Cosmic Background Glows */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] rounded-full bg-cyan-600/15 blur-[100px]" />
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[240px] h-[240px] rounded-full bg-indigo-600/15 blur-[80px]" />
          </div>

          {/* Core Insignia with Rotating Celestial Rings */}
          <div className="relative flex items-center justify-center mb-8">
            {/* Outer Orbit Ring */}
            <div className="absolute w-44 h-44 rounded-full border border-cyan-500/20 border-dashed animate-spin-slow" />
            
            {/* Middle Orbit Ring */}
            <div className="absolute w-32 h-32 rounded-full border border-indigo-400/25 animate-reverse-spin" />
            <div className="absolute w-32 h-32 rounded-full border border-cyan-400/30 animate-pulse" />

            {/* Glowing Logo Plaque */}
            <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-tr from-cyan-950 via-slate-900 to-indigo-950 border-2 border-cyan-400/60 shadow-glow-cyan flex items-center justify-center">
              <AetheriaStarLogo className="w-10 h-10 animate-pulse-subtle" />
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-[#030712] animate-ping" />
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-[#030712]" />
            </div>
          </div>

          {/* Typography */}
          <div className="text-center space-y-1 mb-8 z-10">
            <div className="flex items-center justify-center space-x-2">
              <h1 className="text-xl md:text-2xl font-bold tracking-widest text-white uppercase font-sans">
                AETHERIA
              </h1>
              <span className="text-[10px] md:text-xs font-mono font-bold px-1.5 py-0.5 rounded-md bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
                PRO
              </span>
            </div>
            <p className="text-[11px] font-mono tracking-widest text-cyan-400/80 uppercase">
              Planetarium & Celestial Observatory
            </p>
          </div>

          {/* Progress Bar & Status Readout */}
          <div className="w-64 max-w-[80vw] space-y-3 z-10">
            {/* Progress Track */}
            <div className="w-full h-1.5 rounded-full bg-slate-900 border border-white/10 overflow-hidden p-0.5">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 shadow-glow-cyan"
                initial={{ width: '15%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              />
            </div>

            {/* Status Text & Percentage */}
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <div className="flex items-center space-x-1.5 truncate max-w-[190px]">
                <Radio className="w-3 h-3 text-cyan-400 animate-pulse flex-shrink-0" />
                <span className="truncate">{statusText}</span>
              </div>
              <span className="font-bold text-cyan-300 font-mono">{progress}%</span>
            </div>
          </div>

          {/* Bottom Telemetry Footer */}
          <div className="absolute bottom-6 left-0 right-0 text-center text-[10px] font-mono text-slate-600 select-none">
            WGS84 • HIPPARCOS 118K • 120FPS NATIVE
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
