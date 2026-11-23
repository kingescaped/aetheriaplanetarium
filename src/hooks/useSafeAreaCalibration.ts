import { useEffect } from 'react';

/**
 * Apple hardware safe-area fallbacks for iPhones with notch / Dynamic Island.
 * Used when env() returns 0px (iOS hasn't computed insets yet at CSS parse time).
 */
const APPLE_FALLBACKS = {
  top: 47,    // Notch / Dynamic Island minimum height
  bottom: 34, // Home Indicator minimum height
  left: 0,
  right: 0,
} as const;

/**
 * Read the actual env(safe-area-inset-*) values by injecting a probe element
 * and reading computed padding. This is more reliable than reading CSS custom
 * properties directly because iOS updates env() values after the first layout
 * pass, but CSS custom properties declared in :root are frozen at parse time.
 */
function readEnvInsets(): { top: number; right: number; bottom: number; left: number } {
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;top:0;left:0;width:0;height:0;' +
    'visibility:hidden;pointer-events:none;' +
    'padding-top:env(safe-area-inset-top,0px);' +
    'padding-right:env(safe-area-inset-right,0px);' +
    'padding-bottom:env(safe-area-inset-bottom,0px);' +
    'padding-left:env(safe-area-inset-left,0px);';
  document.body.appendChild(probe);
  const cs = window.getComputedStyle(probe);
  const result = {
    top: parseFloat(cs.paddingTop) || 0,
    right: parseFloat(cs.paddingRight) || 0,
    bottom: parseFloat(cs.paddingBottom) || 0,
    left: parseFloat(cs.paddingLeft) || 0,
  };
  document.body.removeChild(probe);
  return result;
}

/**
 * Override the CSS custom properties on :root with JS-read values.
 * Falls back to Apple hardware constants if env() still returns 0.
 */
function applySafeAreaVars(insets: ReturnType<typeof readEnvInsets>) {
  const root = document.documentElement;
  root.style.setProperty('--sat', `${insets.top > 0 ? insets.top : APPLE_FALLBACKS.top}px`);
  root.style.setProperty('--sab', `${insets.bottom > 0 ? insets.bottom : APPLE_FALLBACKS.bottom}px`);
  root.style.setProperty('--sal', `${insets.left || APPLE_FALLBACKS.left}px`);
  root.style.setProperty('--sar', `${insets.right || APPLE_FALLBACKS.right}px`);
}

/**
 * useSafeAreaCalibration
 *
 * WHY THIS EXISTS:
 * CSS env(safe-area-inset-top, 47px) has a critical limitation on iOS PWA:
 * the fallback value only activates when the browser does NOT support env() at all.
 * iOS Safari DOES support env() but returns 0px at CSS parse time (before WebKit
 * has calculated safe area insets for the viewport). Once set to 0px, the CSS
 * custom property --sat stays frozen at 0px for the entire session.
 *
 * FIX:
 * After React mounts, we re-read env() values via a JS probe element. By the time
 * requestAnimationFrame fires (after the first browser paint), iOS has already
 * computed the correct insets. We then call style.setProperty() to override the
 * frozen CSS custom properties with the correct runtime values.
 */
export function useSafeAreaCalibration(): void {
  useEffect(() => {
    // Pass 1: immediate read (may still be 0 on some devices, sets fallback)
    applySafeAreaVars(readEnvInsets());

    // Pass 2: after first browser paint — iOS env() values are now correct
    const rafId = requestAnimationFrame(() => {
      applySafeAreaVars(readEnvInsets());
    });

    // Pass 3: orientation change recalculates safe areas (portrait ↔ landscape)
    const onOrientationChange = () => {
      // 150ms delay: iOS needs time to update env() after rotation
      const tid = setTimeout(() => applySafeAreaVars(readEnvInsets()), 150);
      return () => clearTimeout(tid);
    };

    window.addEventListener('orientationchange', onOrientationChange);
    // Modern API (Chrome, some iOS)
    if (window.screen?.orientation) {
      window.screen.orientation.addEventListener('change', onOrientationChange);
    }

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('orientationchange', onOrientationChange);
      if (window.screen?.orientation) {
        window.screen.orientation.removeEventListener('change', onOrientationChange);
      }
    };
  }, []);
}
