import React, { useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import {
  useMotionValue,
  useTransform,
  animate,
  AnimationPlaybackControls,
  MotionValue,
} from 'framer-motion';
import { soundFx } from '../utils/audio';

export type SwipeEdge = 'left' | 'right';

export const EDGE_SWIPE_DEFAULTS = {
  edgeWidth: 28,
  threshold: 60,
  velocityThreshold: 0.3,
  minFlickDistance: 30,
  directionLockPx: 8,
} as const;

export interface UseEdgeSwipeBackOptions {
  /** Callback invoked when edge swipe meets dismiss distance or velocity */
  onBack: () => void;
  /** Which edge of the window triggers back ('left' swipes right; 'right' swipes left) */
  edge?: SwipeEdge;
  /** Active touch zone width in px inward from the window edge (default 28px) */
  edgeWidth?: number;
  /** Minimum swipe distance in px to trigger dismiss (default 60px) */
  threshold?: number;
  /** Enable or disable gesture tracking */
  enabled?: boolean;
}

export interface UseEdgeSwipeBackResult {
  x: MotionValue<number>;
  backdropOpacity: MotionValue<number>;
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
    onTouchCancel: (e: React.TouchEvent) => void;
  };
  style: {
    x: MotionValue<number>;
    willChange: string;
  };
}

/**
 * Window-edge-bounded swipe-back gesture hook for iOS mobile drawers and stacked views.
 * Only touches originating within edgeWidth (default 28px) of the window's own
 * left or right edge are captured; touches on inputs/sliders are ignored.
 */
export function useEdgeSwipeBack({
  onBack,
  edge = 'left',
  edgeWidth = EDGE_SWIPE_DEFAULTS.edgeWidth,
  threshold = EDGE_SWIPE_DEFAULTS.threshold,
  enabled = true,
}: UseEdgeSwipeBackOptions): UseEdgeSwipeBackResult {
  const x = useMotionValue(0);
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  const backdropOpacity = useTransform(
    x,
    edge === 'left' ? [0, 250] : [0, -250],
    [1, 0.15]
  );

  const isSwipingRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startTimeRef = useRef(0);
  const containerWidthRef = useRef(450);
  const isHorizontalRef = useRef<boolean | null>(null);
  const animControlsRef = useRef<AnimationPlaybackControls | null>(null);

  useLayoutEffect(() => {
    if (animControlsRef.current) {
      animControlsRef.current.stop();
    }
    if (enabled) {
      // Reset cleanly when a persistent drawer re-opens; never reset on disable to avoid unmount flicker
      x.set(0);
    }
  }, [enabled, x]);

  useEffect(() => {
    return () => {
      if (animControlsRef.current) {
        animControlsRef.current.stop();
      }
    };
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || e.touches.length !== 1) return;

      const target = e.target as HTMLElement | null;
      if (target?.closest('input, select, textarea')) return;

      const touch = e.touches[0];
      const rect = e.currentTarget.getBoundingClientRect();
      containerWidthRef.current = rect.width || window.innerWidth || 450;

      const inZone =
        edge === 'left'
          ? touch.clientX - rect.left >= 0 && touch.clientX - rect.left <= edgeWidth
          : rect.right - touch.clientX >= -20 && rect.right - touch.clientX <= edgeWidth;

      if (!inZone) return;

      if (animControlsRef.current) {
        animControlsRef.current.stop();
      }
      x.set(0);
      isSwipingRef.current = true;
      startXRef.current = touch.clientX;
      startYRef.current = touch.clientY;
      startTimeRef.current = Date.now();
      isHorizontalRef.current = null;
    },
    [enabled, edge, edgeWidth, x]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isSwipingRef.current || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - startXRef.current;
      const deltaY = touch.clientY - startYRef.current;

      if (isHorizontalRef.current === null) {
        if (
          Math.abs(deltaX) > EDGE_SWIPE_DEFAULTS.directionLockPx ||
          Math.abs(deltaY) > EDGE_SWIPE_DEFAULTS.directionLockPx
        ) {
          const isIntendedDirection = edge === 'left' ? deltaX > 0 : deltaX < 0;
          if (Math.abs(deltaX) > Math.abs(deltaY) * 1.2 && isIntendedDirection) {
            isHorizontalRef.current = true;
          } else {
            isHorizontalRef.current = false;
            isSwipingRef.current = false;
            return;
          }
        } else {
          return;
        }
      }

      if (isHorizontalRef.current) {
        const clamped = edge === 'left' ? Math.max(0, deltaX) : Math.min(0, deltaX);
        x.set(clamped);
      }
    },
    [edge, x]
  );

  const handleTouchEnd = useCallback(() => {
    if (!isSwipingRef.current || !isHorizontalRef.current) {
      isSwipingRef.current = false;
      isHorizontalRef.current = null;
      return;
    }

    isSwipingRef.current = false;
    const distance = Math.abs(x.get());
    const deltaTime = Date.now() - startTimeRef.current;
    const velocity = distance / Math.max(deltaTime, 1);

    if (
      distance >= threshold ||
      (distance >= EDGE_SWIPE_DEFAULTS.minFlickDistance &&
        velocity > EDGE_SWIPE_DEFAULTS.velocityThreshold)
    ) {
      soundFx.playTabClick();
      const targetX =
        edge === 'left' ? containerWidthRef.current : -containerWidthRef.current;

      animControlsRef.current = animate(x, targetX, {
        duration: 0.18,
        ease: [0.32, 0.72, 0, 1],
        onComplete: () => {
          onBackRef.current();
        },
      });
    } else {
      animControlsRef.current = animate(x, 0, {
        duration: 0.14,
        ease: [0.25, 1, 0.5, 1],
      });
    }

    isHorizontalRef.current = null;
  }, [edge, x, threshold]);

  return {
    x,
    backdropOpacity,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchEnd,
    },
    style: {
      x,
      willChange: 'transform',
    },
  };
}
