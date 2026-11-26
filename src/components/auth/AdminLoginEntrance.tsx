import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Language, TRANSLATIONS } from '../../utils/i18n';
import { adminSoundFx } from '../../utils/adminAudio';
import {
  CelestialSovereignCrest,
  FourPointSparkle,
} from '../common/SupremeAdminBadge';

export interface AdminLoginEntranceProps {
  isOpen: boolean;
  lang?: Language;
  onLand?: () => void;
  onComplete: () => void;
}

type EntrancePhase = 'reveal' | 'fly' | 'land';

interface FlyTargetVector {
  dx: number;
  dy: number;
  scale: number;
  landX: number;
  landY: number;
}

const REVEAL_DURATION_MS = 1350;
const FLY_DURATION_MS = 750;
const LAND_DURATION_MS = 350;
const REDUCED_MOTION_DURATION_MS = 650;

const ORBITING_SPARKLES = [
  { top: '-12%', left: '18%', size: 'w-4 h-4', delayed: false },
  { top: '12%', right: '-14%', size: 'w-3.5 h-3.5', delayed: true },
  { bottom: '6%', left: '-12%', size: 'w-3 h-3', delayed: true },
  { bottom: '-10%', right: '14%', size: 'w-4 h-4', delayed: false },
];

function findFirstVisibleTarget(selector: string): HTMLElement | null {
  const nodes = document.querySelectorAll<HTMLElement>(selector);
  for (const el of nodes) {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return el;
    }
  }
  return null;
}

function measureLandingVector(medallionEl: HTMLElement | null): FlyTargetVector {
  const viewportCenterX = window.innerWidth / 2;
  const viewportCenterY = window.innerHeight / 2;
  const heroRect = medallionEl?.getBoundingClientRect();
  const heroCenterX = heroRect ? heroRect.left + heroRect.width / 2 : viewportCenterX;
  const heroCenterY = heroRect ? heroRect.top + heroRect.height / 2 : viewportCenterY;
  const heroSize = heroRect && heroRect.width > 0 ? heroRect.width : window.innerWidth >= 640 ? 176 : 144;

  const targetEl =
    findFirstVisibleTarget('[data-admin-logo-target="profile"]') ||
    findFirstVisibleTarget('[data-admin-logo-target="header"]');

  if (!targetEl) {
    const fallbackY = Math.max(48, viewportCenterY * 0.28);
    return {
      dx: 0,
      dy: fallbackY - heroCenterY,
      scale: 0.28,
      landX: heroCenterX,
      landY: fallbackY,
    };
  }

  const targetRect = targetEl.getBoundingClientRect();
  const targetCenterX = targetRect.left + targetRect.width / 2;
  const targetCenterY = targetRect.top + targetRect.height / 2;
  const rawScale = targetRect.width / heroSize;
  const clampedScale = Math.max(0.18, Math.min(1.0, rawScale));

  return {
    dx: targetCenterX - heroCenterX,
    dy: targetCenterY - heroCenterY,
    scale: clampedScale,
    landX: targetCenterX,
    landY: targetCenterY,
  };
}

export const AdminLoginEntrance: React.FC<AdminLoginEntranceProps> = ({
  isOpen,
  lang = 'vi',
  onLand,
  onComplete,
}) => {
  const t = TRANSLATIONS[lang];
  const [phase, setPhase] = useState<EntrancePhase>('reveal');
  const [flyVector, setFlyVector] = useState<FlyTargetVector>({
    dx: 0,
    dy: 0,
    scale: 1,
    landX: 0,
    landY: 0,
  });
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  const medallionRef = useRef<HTMLDivElement | null>(null);
  const completedRef = useRef(false);
  const landedRef = useRef(false);
  const onLandRef = useRef(onLand);
  const onCompleteRef = useRef(onComplete);
  onLandRef.current = onLand;
  onCompleteRef.current = onComplete;

  const finishImmediately = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    if (typeof window !== 'undefined' && (window.scrollX !== 0 || window.scrollY !== 0)) {
      window.scrollTo(0, 0);
    }
    if (!landedRef.current) {
      landedRef.current = true;
      onLandRef.current?.();
    }
    onCompleteRef.current();
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    completedRef.current = false;
    landedRef.current = false;
    setPhase('reveal');
    setFlyVector({
      dx: 0,
      dy: 0,
      scale: 1,
      landX: typeof window !== 'undefined' ? window.innerWidth / 2 : 0,
      landY: typeof window !== 'undefined' ? window.innerHeight / 2 : 0,
    });

    const reduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setIsReducedMotion(reduced);

    adminSoundFx.setAdminActive(true);
    adminSoundFx.unlock();
    adminSoundFx.playAdminEntranceReveal();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        finishImmediately();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    if (reduced) {
      const landTimer = window.setTimeout(() => {
        setPhase('land');
        if (!landedRef.current) {
          landedRef.current = true;
          adminSoundFx.playAdminEntranceLand();
          onLandRef.current?.();
        }
      }, REDUCED_MOTION_DURATION_MS - 150);

      const doneTimer = window.setTimeout(() => {
        finishImmediately();
      }, REDUCED_MOTION_DURATION_MS);

      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.clearTimeout(landTimer);
        window.clearTimeout(doneTimer);
      };
    }

    let landRafId = 0;
    const flyTimer = window.setTimeout(() => {
      const measured = measureLandingVector(medallionRef.current);
      setFlyVector(measured);
      landRafId = window.requestAnimationFrame(() => {
        adminSoundFx.playAdminEntranceFly();
        setPhase('fly');
      });
    }, REVEAL_DURATION_MS);

    const landTimer = window.setTimeout(() => {
      setPhase('land');
      if (!landedRef.current) {
        landedRef.current = true;
        adminSoundFx.playAdminEntranceLand();
        onLandRef.current?.();
      }
    }, REVEAL_DURATION_MS + FLY_DURATION_MS);

    const completeTimer = window.setTimeout(() => {
      finishImmediately();
    }, REVEAL_DURATION_MS + FLY_DURATION_MS + LAND_DURATION_MS);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.cancelAnimationFrame(landRafId);
      window.clearTimeout(flyTimer);
      window.clearTimeout(landTimer);
      window.clearTimeout(completeTimer);
    };
  }, [isOpen, finishImmediately]);

  if (!isOpen) return null;

  const isReveal = phase === 'reveal';
  const isFly = phase === 'fly';
  const isLand = phase === 'land';

  const medallionTransform =
    isFly || isLand
      ? `translate3d(${flyVector.dx}px, ${flyVector.dy}px, 0) scale(${flyVector.scale})`
      : 'translate3d(0px, 0px, 0) scale(1)';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.supremeAdminTitle}
      onClick={finishImmediately}
      style={{ height: 'var(--app-height, 100dvh)' }}
      className="fixed inset-0 z-[120] w-full h-full max-w-[100vw] overflow-hidden select-none cursor-pointer touch-none [contain:layout_paint]"
    >
      {/* Phase 1 Backdrop + Radial Sovereign Bloom */}
      <div
        aria-hidden="true"
        style={{
          transition: 'opacity 550ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className={`absolute inset-0 bg-[#030712]/92 backdrop-blur-md ${
          isReveal ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 48%, rgba(250, 204, 21, 0.2) 0%, rgba(124, 58, 237, 0.24) 30%, rgba(3, 7, 18, 0) 68%)',
          }}
        />
      </div>

      {/* Volumetric Rotating Golden God-Rays & Expanding Shockwave Rings */}
      {!isReducedMotion && (
        <div
          aria-hidden="true"
          style={{ transition: 'opacity 420ms ease-out' }}
          className={`pointer-events-none absolute inset-0 overflow-hidden flex items-center justify-center ${
            isReveal ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div
            className="imperial-godrays-spin w-[min(140vw,620px)] h-[min(140vw,620px)] sm:w-[760px] sm:h-[760px] shrink-0 rounded-full opacity-55"
            style={{
              background:
                'conic-gradient(from 0deg, transparent 0deg 16deg, rgba(250, 204, 21, 0.2) 24deg, transparent 34deg 62deg, rgba(168, 85, 247, 0.18) 74deg, transparent 88deg 120deg, rgba(255, 247, 204, 0.22) 132deg, transparent 144deg 184deg, rgba(245, 158, 11, 0.2) 196deg, transparent 210deg 252deg, rgba(124, 58, 237, 0.18) 264deg, transparent 278deg 315deg, rgba(250, 204, 21, 0.22) 326deg, transparent 340deg 360deg)',
              maskImage:
                'radial-gradient(circle, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.5) 45%, transparent 72%)',
              WebkitMaskImage:
                'radial-gradient(circle, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.5) 45%, transparent 72%)',
            }}
          />

          <span className="imperial-shockwave-expand absolute left-1/2 top-1/2 w-48 h-48 rounded-full border-2 border-amber-300/70 shadow-[0_0_24px_rgba(250,204,21,0.55)]" />
          <span
            className="imperial-shockwave-expand absolute left-1/2 top-1/2 w-56 h-56 rounded-full border border-purple-400/60 shadow-[0_0_24px_rgba(124,58,237,0.45)]"
            style={{ animationDelay: '220ms' }}
          />
        </div>
      )}

      {/* Hero Medallion centered cleanly at 50vw / 50vh for pixel-accurate fly */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden flex items-center justify-center">
        <div
          ref={medallionRef}
          style={{
            transform: medallionTransform,
            transition: isReducedMotion
              ? 'opacity 250ms ease-out'
              : `transform ${FLY_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease-out`,
            willChange: 'transform, opacity',
          }}
          className={`relative w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center ${
            isLand ? 'opacity-0' : 'opacity-100'
          }`}
        >
          {/* Orbiting 4-Point Diamond Sparkles */}
          {isReveal &&
            ORBITING_SPARKLES.map((sp, idx) => (
              <span
                key={idx}
                style={{
                  top: sp.top,
                  bottom: sp.bottom,
                  left: sp.left,
                  right: sp.right,
                }}
                className="absolute pointer-events-none"
              >
                <FourPointSparkle
                  className={`${sp.size} ${
                    sp.delayed ? 'imperial-sparkle-delayed' : 'imperial-sparkle'
                  }`}
                />
              </span>
            ))}

          <div className="imperial-conic-rim imperial-halo-glow w-full h-full rounded-full p-[3px] flex items-center justify-center">
            <div className="imperial-shimmer-sweep relative z-[1] w-full h-full rounded-full bg-gradient-to-br from-[#160a32] via-[#26124f] to-[#0d0620] flex items-center justify-center border border-amber-300/35">
              <CelestialSovereignCrest className="w-24 h-24 sm:w-28 sm:h-28 drop-shadow-[0_0_18px_rgba(250,204,21,0.55)]" />
            </div>
          </div>
        </div>
      </div>

      {/* Gleaming Metallic Gold ADMIN Title & Subtitle positioned below centered medallion */}
      <div
        style={{
          transition: 'opacity 320ms ease-out, transform 320ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className={`pointer-events-none absolute inset-x-0 top-1/2 mt-24 sm:mt-28 flex flex-col items-center text-center px-6 ${
          isReveal
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 -translate-y-2 scale-90'
        }`}
      >
        <h2 className="imperial-gold-text text-3xl sm:text-4xl font-extrabold tracking-[0.22em] uppercase leading-none">
          {t.supremeAdminTitle}
        </h2>
        <p className="text-xs sm:text-sm text-amber-100/85 mt-2.5 font-medium tracking-wide max-w-xs">
          {t.adminEntranceSubtitle}
        </p>
      </div>

      {/* Phase 3 Landing Golden Starburst Ring at Exact Target Coordinates */}
      {isLand && !isReducedMotion && (
        <span
          aria-hidden="true"
          style={{
            left: `${flyVector.landX}px`,
            top: `${flyVector.landY}px`,
            animationDuration: '360ms',
          }}
          className="imperial-shockwave-expand pointer-events-none absolute w-20 h-20 rounded-full border-2 border-amber-300/90 shadow-[0_0_26px_rgba(250,204,21,0.85)]"
        />
      )}
    </div>
  );
};
