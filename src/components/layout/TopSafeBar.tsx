import React from 'react';

export interface TopSafeBarProps {
  children: React.ReactNode;
  /** Full-width bottom divider across both mobile & desktop (false = desktop only) */
  bordered?: boolean;
  /** Omit top safe-area inset on desktop centered/inset modals (md: and up) */
  disableDesktopSafeTop?: boolean;
  /** Horizontal safe-area padding mode for inner row */
  padding?: 'default' | 'compact' | 'none';
  className?: string;
  innerClassName?: string;
  style?: React.CSSProperties;
}

const PADDING_CLASS_MAP: Record<NonNullable<TopSafeBarProps['padding']>, string> = {
  default: 'safe-px',
  compact: 'safe-px-compact md:px-4',
  none: '',
};

/**
 * Canonical top-bar shell shared by Header, IOSNavigationBar, and SearchBarModal.
 * Reads --top-bar-pt and --top-bar-row-h from CSS so every screen clears
 * iOS Safe Area + blur at one exact, unified vertical offset.
 */
export const TopSafeBar: React.FC<TopSafeBarProps> = ({
  children,
  bordered = true,
  disableDesktopSafeTop = false,
  padding = 'compact',
  className = '',
  innerClassName = '',
  style,
}) => {
  const borderClass = bordered
    ? 'border-b border-white/10'
    : 'md:border-b md:border-white/10';
  const desktopResetClass = disableDesktopSafeTop ? 'md:pt-0 md:h-[56px]' : '';
  const horizontalPadding = PADDING_CLASS_MAP[padding];

  return (
    <header
      className={`sticky top-0 w-full shrink-0 z-40 bg-[#030712] select-none safe-pt safe-h-header ${borderClass} ${desktopResetClass} ${className}`.trim()}
      style={style}
    >
      <div
        className={`w-full h-[var(--top-bar-row-h)] flex items-center relative ${horizontalPadding} ${innerClassName}`.trim()}
      >
        {children}
      </div>
    </header>
  );
};
