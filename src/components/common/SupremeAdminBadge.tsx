import React, { useEffect, useId, useRef, useState } from 'react';
import { Crown, Sparkles, ShieldCheck } from 'lucide-react';
import { Language, TRANSLATIONS } from '../../utils/i18n';
import { adminSoundFx } from '../../utils/adminAudio';
import { resolveAdminBadgeLabel } from '../../services/profileApi';

export { resolveAdminBadgeLabel };

export interface SupremeAdminBadgeProps {
  variant?: 'pill' | 'floating' | 'card';
  lang?: Language;
  adminTitle?: string;
  justLanded?: boolean;
  godModeEnabled?: boolean;
  onToggleGodMode?: (enabled: boolean) => void;
  className?: string;
  onClick?: () => void;
}

export const CelestialSovereignCrest: React.FC<{ className?: string }> = ({
  className = 'w-4 h-4',
}) => {
  const uid = useId();
  const goldGradId = `sovereignGold-${uid}`;
  const coreGemId = `sovereignGem-${uid}`;

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={goldGradId} x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF7CC" />
          <stop offset="38%" stopColor="#FACC15" />
          <stop offset="72%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <radialGradient id={coreGemId} cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#FFFBEB" />
          <stop offset="45%" stopColor="#C4B5FD" />
          <stop offset="100%" stopColor="#7C3AED" />
        </radialGradient>
      </defs>

      {/* Outer Sovereign Orbit Ring */}
      <circle
        cx="32"
        cy="34"
        r="24"
        stroke={`url(#${goldGradId})`}
        strokeWidth="1.6"
        strokeOpacity="0.6"
        strokeDasharray="3 3"
      />

      {/* Sculpted Imperial Crown */}
      <path
        d="M12 43L16.5 23L25.5 31L32 14L38.5 31L47.5 23L52 43H12Z"
        fill={`url(#${goldGradId})`}
        stroke="#FFF7CC"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />

      {/* Sovereign Crown Base Band */}
      <rect
        x="12"
        y="44.5"
        width="40"
        height="6"
        rx="3"
        fill={`url(#${goldGradId})`}
        stroke="#FFF7CC"
        strokeWidth="1.1"
      />

      {/* Starlight Crown Tip Orbs */}
      <circle cx="32" cy="11" r="2.6" fill="#FFF7CC" />
      <circle cx="15.5" cy="20.5" r="2" fill="#FACC15" />
      <circle cx="48.5" cy="20.5" r="2" fill="#FACC15" />

      {/* Central Cosmic Violet Sovereign Jewel */}
      <path
        d="M32 27.5L36.2 34L32 40.5L27.8 34L32 27.5Z"
        fill={`url(#${coreGemId})`}
        stroke="#FFF7CC"
        strokeWidth="1.1"
      />
    </svg>
  );
};

export const FourPointSparkle: React.FC<{ className?: string }> = ({
  className = 'w-2.5 h-2.5',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M12 1L14.6 9.4L23 12L14.6 14.6L12 23L9.4 14.6L1 12L9.4 9.4L12 1Z"
      fill="#FFF7CC"
    />
  </svg>
);

export const SupremeAdminBadge: React.FC<SupremeAdminBadgeProps> = ({
  variant = 'pill',
  lang = 'vi',
  adminTitle,
  justLanded = false,
  godModeEnabled,
  onToggleGodMode,
  className = '',
  onClick,
}) => {
  const t = TRANSLATIONS[lang];
  const [isExpanded, setIsExpanded] = useState(false);
  const floatingRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (variant !== 'floating' || !isExpanded) return;

    const handlePointerDown = (e: PointerEvent) => {
      if (floatingRef.current && !floatingRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsExpanded(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [variant, isExpanded]);

  const resolvedTitle = resolveAdminBadgeLabel(adminTitle);
  const landedClass = justLanded ? 'admin-landing-pulse' : '';

  if (variant === 'pill') {
    const Wrapper = onClick ? 'button' : 'div';
    const handlePillClick = onClick
      ? () => {
          adminSoundFx.playAdminBadgeClick();
          onClick();
        }
      : undefined;

    return (
      <Wrapper
        {...(handlePillClick ? { type: 'button' as const, onClick: handlePillClick } : {})}
        onMouseEnter={() => adminSoundFx.playAdminBadgeHover()}
        data-admin-logo-target="header"
        title={`${resolvedTitle} — ${t.supremeAdminSubtitle}`}
        className={`imperial-conic-rim imperial-halo-glow rounded-full p-[1.5px] inline-flex items-center select-none shrink-0 ${landedClass} ${
          onClick ? 'cursor-pointer active:scale-95 transition-transform' : ''
        } ${className}`.trim()}
      >
        <span className="imperial-shimmer-sweep relative z-[1] flex items-center gap-1 md:gap-1.5 px-2 md:px-2.5 py-[3px] md:py-1 rounded-full bg-gradient-to-r from-[#170b33] via-[#27124f] to-[#190c36]">
          <CelestialSovereignCrest className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
          <span className="imperial-gold-text font-extrabold tracking-[0.08em] uppercase text-[9.5px] md:text-[10.5px] leading-none whitespace-nowrap">
            {resolvedTitle}
          </span>
          <FourPointSparkle className="w-2.5 h-2.5 imperial-sparkle shrink-0" />
        </span>
      </Wrapper>
    );
  }

  if (variant === 'floating') {
    const handleToggle = () => {
      adminSoundFx.playAdminBadgeClick();
      if (onClick) {
        onClick();
      } else {
        setIsExpanded((prev) => !prev);
      }
    };

    return (
      <div
        ref={floatingRef}
        className={`relative inline-flex flex-col items-start select-none ${className}`.trim()}
      >
        <button
          type="button"
          onClick={handleToggle}
          onMouseEnter={() => adminSoundFx.playAdminBadgeHover()}
          aria-expanded={isExpanded}
          aria-label={resolvedTitle}
          className={`imperial-conic-rim imperial-halo-glow rounded-full p-[1.5px] inline-flex items-center cursor-pointer active:scale-95 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${landedClass}`.trim()}
        >
          <span className="imperial-shimmer-sweep relative z-[1] flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#140a2b] via-[#26124f] to-[#180b33]">
            <CelestialSovereignCrest className="w-4 h-4 shrink-0" />
            <span className="imperial-gold-text font-extrabold tracking-[0.08em] uppercase text-[10.5px] md:text-[11px] leading-none whitespace-nowrap">
              {resolvedTitle}
            </span>
            <FourPointSparkle className="w-2.5 h-2.5 imperial-sparkle shrink-0" />
          </span>
        </button>

        {isExpanded && (
          <div
            role="status"
            className="mt-2 w-64 rounded-2xl p-[1px] bg-gradient-to-br from-amber-300/70 via-purple-500/50 to-amber-500/60 shadow-[0_14px_34px_rgba(4,2,16,0.9)]"
          >
            <div className="rounded-[15px] bg-[#0e0722]/95 backdrop-blur-xl px-3.5 py-2.5 space-y-1">
              <div className="flex items-center gap-1.5 text-amber-200 font-semibold text-xs">
                <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span className="truncate">{t.supremeAdminFloatingDesc}</span>
              </div>
              <p className="text-[11px] leading-relaxed text-purple-200/85">
                {t.supremeAdminBlackHoleHint}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // variant === 'card'
  return (
    <div
      onMouseEnter={() => adminSoundFx.playAdminBadgeHover()}
      onClick={
        onClick
          ? () => {
              adminSoundFx.playAdminBadgeClick();
              onClick();
            }
          : undefined
      }
      className={`imperial-conic-rim imperial-halo-glow rounded-2xl p-[1.5px] select-none ${landedClass} ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`.trim()}
    >
      <div className="imperial-shimmer-sweep relative z-[1] rounded-[15px] bg-gradient-to-br from-[#160a32] via-[#24114c] to-[#110826] px-4 py-3.5 overflow-hidden">
        {/* Subtle radial cosmic highlight inside the sovereign card */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-10 -right-10 w-36 h-36 rounded-full bg-amber-400/15 blur-2xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-12 -left-8 w-36 h-36 rounded-full bg-violet-600/25 blur-2xl"
        />

        <div className="relative z-[3] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-3.5 flex-1 min-w-0">
            <div
              data-admin-logo-target="profile"
              className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-amber-400/20 via-purple-700/35 to-amber-600/20 border border-amber-300/50 flex items-center justify-center shrink-0 shadow-[0_6px_16px_rgba(0,0,0,0.5)] ${landedClass}`.trim()}
            >
              <CelestialSovereignCrest className="w-7 h-7 sm:w-8 sm:h-8" />
              <FourPointSparkle className="w-3 h-3 absolute -top-1 -right-1 imperial-sparkle" />
              <FourPointSparkle className="w-2 h-2 absolute -bottom-0.5 -left-0.5 imperial-sparkle-delayed" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="imperial-gold-text text-sm md:text-base font-extrabold tracking-[0.1em] uppercase leading-tight truncate">
                  {resolvedTitle}
                </h3>
                <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0 imperial-sparkle" />
              </div>

              <p className="text-xs text-amber-100/85 mt-0.5 font-medium truncate">
                {t.supremeAdminSubtitle}
              </p>

              <div className="flex items-center gap-1.5 sm:gap-2 mt-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-400/15 text-amber-200 border border-amber-300/35">
                  <ShieldCheck className="w-3 h-3 text-amber-300 shrink-0" />
                  <span className="truncate">{t.supremeAdminCloudVerified}</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/20 text-purple-200 border border-purple-400/35">
                  <span>{t.supremeAdminRoleLabel}</span>
                </span>
              </div>
            </div>
          </div>

          {typeof godModeEnabled === 'boolean' && onToggleGodMode && (
            <div className="flex flex-col items-end justify-center shrink-0 gap-1 pl-1">
              <span className="text-[10px] font-bold tracking-[0.06em] uppercase text-amber-200/90 whitespace-nowrap leading-none">
                {t.godModeLabel}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={godModeEnabled}
                aria-label={t.godModeToggleAria}
                data-testid="admin-godmode-toggle"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleGodMode(!godModeEnabled);
                }}
                className={`relative w-[64px] h-7 rounded-full p-0.5 flex items-center transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                  godModeEnabled
                    ? 'bg-gradient-to-r from-amber-500/45 via-yellow-400/35 to-purple-600/55 border border-amber-300/80 shadow-[0_0_14px_rgba(250,204,21,0.42)]'
                    : 'bg-[#0b061a]/95 border border-purple-400/35 shadow-inner'
                }`}
              >
                {godModeEnabled ? (
                  <span className="text-[9.5px] font-extrabold tracking-wider text-amber-100 pl-2 select-none leading-none">
                    ON
                  </span>
                ) : (
                  <span className="text-[9.5px] font-bold tracking-wider text-purple-200/75 pr-2 ml-auto select-none leading-none">
                    OFF
                  </span>
                )}
                <span
                  aria-hidden="true"
                  className={`absolute left-[3px] top-1/2 -translate-y-1/2 w-[20px] h-[20px] rounded-full transition-transform duration-200 ${
                    godModeEnabled
                      ? 'translate-x-[36px] bg-gradient-to-br from-[#fffbeb] via-[#facc15] to-[#d97706] shadow-[0_2px_6px_rgba(0,0,0,0.5),0_0_10px_rgba(250,204,21,0.8)]'
                      : 'translate-x-0 bg-gradient-to-br from-slate-300 to-slate-500 shadow-[0_1px_4px_rgba(0,0,0,0.6)]'
                  }`}
                />
              </button>
              <span
                className={`text-[9.5px] font-medium leading-none whitespace-nowrap ${
                  godModeEnabled ? 'text-amber-200/85' : 'text-purple-200/65'
                }`}
              >
                {godModeEnabled ? t.godModeOn : t.godModeOff}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
