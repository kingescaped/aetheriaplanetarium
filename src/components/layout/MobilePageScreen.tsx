import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IOSNavigationBar } from './IOSNavigationBar';
import { useEdgeSwipeBack } from '../../hooks/useEdgeSwipeBack';

export interface MobilePageScreenProps {
  /** Screen Title displayed in Navigation Bar */
  title?: string;
  /** Back button handler (triggers edge-swipe or back button click) */
  onBack?: () => void;
  /** Back button label */
  backLabel?: string;
  /** Trailing content (e.g., Close button, Done, Actions) */
  trailing?: React.ReactNode;
  /** Close handler (if separate from onBack) */
  onClose?: () => void;
  /** Whether the screen is currently open/visible (defaults to true) */
  isOpen?: boolean;
  /** Enable edge swipe to go back gesture (defaults to true) */
  enableEdgeSwipe?: boolean;
  /** Additional wrapper classes */
  className?: string;
  /** Additional body/content classes */
  contentClassName?: string;
  /** Child content rendered in the scrollable view */
  children: React.ReactNode;
}

/**
 * MobilePageScreen: Unified standard iOS layout wrapper for mobile full-screen modal/drawer views.
 * - Forces safe-area top inset for notch / Dynamic Island
 * - Houses standard IOSNavigationBar with centered title and left-aligned back button
 * - Scrollable body with safe-area bottom inset for Home Indicator
 * - Built-in 120fps Edge-swipe to go back gesture
 */
export const MobilePageScreen: React.FC<MobilePageScreenProps> = ({
  title,
  onBack,
  backLabel = 'Quay lại',
  trailing,
  onClose,
  isOpen = true,
  enableEdgeSwipe = true,
  className = '',
  contentClassName = '',
  children,
}) => {
  const handleBackAction = onBack || onClose;

  const { handlers: swipeHandlers, style: swipeStyle, backdropOpacity } = useEdgeSwipeBack({
    onBack: handleBackAction || (() => {}),
    edgeWidth: 32,
    threshold: 60,
    enabled: isOpen && enableEdgeSwipe && Boolean(handleBackAction),
  });

  if (!isOpen) return null;

  return (
    <motion.div
      style={{ opacity: backdropOpacity }}
      className={`fixed inset-0 z-50 flex flex-col bg-[#030712] w-screen h-[100dvh] overflow-hidden select-none ${className}`}
    >
      <motion.div
        {...swipeHandlers}
        style={{ ...swipeStyle }}
        className="w-full h-full flex flex-col overflow-hidden bg-[#030712]"
      >
        {/* iOS Standard Navigation Bar */}
        <IOSNavigationBar
          title={title}
          onBack={onBack}
          backLabel={backLabel}
          trailing={trailing}
          onClose={onClose}
        />

        {/* Scrollable Content Area with Safe Area Bottom Padding */}
        <div
          className={`flex-1 overflow-y-auto w-full overscroll-contain ${contentClassName}`}
          style={{
            paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), 16px) + 24px)',
          }}
        >
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default MobilePageScreen;
