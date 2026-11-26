export interface ViewportMetricsInput {
  innerHeight: number;
  screenWidth: number;
  screenHeight: number;
  isLandscape: boolean;
  isIOS: boolean;
  isStandalone: boolean;
  safeAreaTopPx: number;
  visualViewportHeight?: number | null;
  visualViewportOffsetTop?: number | null;
  visualViewportScale?: number | null;
}

export interface ViewportMetrics {
  appHeight: number;
  visualVh: number;
  isKeyboardOpen: boolean;
  isPagePinchZoomed: boolean;
}

const PINCH_SCALE_EPSILON = 0.02;
const KEYBOARD_THRESHOLD_PX = 120;

/**
 * Computes shell height metrics while ignoring transient native pinch-zoom
 * scale changes so `--app-height` never shrinks during multi-touch gestures.
 */
export function computeViewportMetrics(input: ViewportMetricsInput): ViewportMetrics {
  const {
    innerHeight,
    screenWidth,
    screenHeight,
    isLandscape,
    isIOS,
    isStandalone,
    safeAreaTopPx,
    visualViewportHeight,
    visualViewportOffsetTop,
    visualViewportScale,
  } = input;

  const isPagePinchZoomed =
    typeof visualViewportScale === 'number' &&
    Number.isFinite(visualViewportScale) &&
    Math.abs(visualViewportScale - 1) > PINCH_SCALE_EPSILON;

  const hasVvH =
    typeof visualViewportHeight === 'number' &&
    Number.isFinite(visualViewportHeight) &&
    visualViewportHeight > 0;
  const vvH = hasVvH ? visualViewportHeight : innerHeight;

  const screenH = isLandscape
    ? Math.min(screenWidth, screenHeight)
    : Math.max(screenWidth, screenHeight);

  let appHeight = innerHeight;
  if (isIOS && isStandalone && safeAreaTopPx > 0) {
    appHeight = Math.abs(screenH - innerHeight) <= 110 ? screenH : innerHeight;
  } else if (!isStandalone && !isPagePinchZoomed && hasVvH) {
    appHeight = Math.round(vvH);
  }

  const isKeyboardOpen = !isPagePinchZoomed && appHeight - vvH > KEYBOARD_THRESHOLD_PX;
  const visualVh = isKeyboardOpen
    ? Math.round(vvH + (visualViewportOffsetTop ?? 0))
    : appHeight;

  return {
    appHeight,
    visualVh,
    isKeyboardOpen,
    isPagePinchZoomed,
  };
}

/**
 * Synchronize --app-height and --visual-vh on the root document element to
 * counteract WebKit standalone status-bar height truncation and keyboard shrink,
 * lock down page-level iOS Safari/PWA pinch-zoom gestures, and run the iOS
 * standalone top-blur composite clearing sweep when edge-to-edge.
 */
export function initViewportCalibration(): () => void {
  if (typeof window === 'undefined' || !document.body) {
    return () => {};
  }

  const ua = navigator.userAgent || '';
  const isIOS =
    /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;

  let satProbe: HTMLDivElement | null = null;
  let pinchRecoveryTimer = 0;

  const ensureSatProbe = (): HTMLDivElement => {
    if (!satProbe) {
      satProbe = document.createElement('div');
      satProbe.setAttribute('aria-hidden', 'true');
      satProbe.style.cssText =
        'position:fixed;top:0;left:0;width:0;height:0;padding-top:env(safe-area-inset-top,0px);visibility:hidden;pointer-events:none;';
      document.body.appendChild(satProbe);
    }
    return satProbe;
  };

  const readSafeAreaTopPx = (): number => {
    if (!isIOS || !isStandalone) return 0;
    return parseFloat(window.getComputedStyle(ensureSatProbe()).paddingTop) || 0;
  };

  const syncViewport = () => {
    const doc = document.documentElement;
    const satPx = readSafeAreaTopPx();

    const innerH = window.innerHeight;
    const vv = window.visualViewport;
    const isLandscape = window.matchMedia('(orientation: landscape)').matches;

    const metrics = computeViewportMetrics({
      innerHeight: innerH,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      isLandscape,
      isIOS,
      isStandalone,
      safeAreaTopPx: satPx,
      visualViewportHeight: vv?.height ?? null,
      visualViewportOffsetTop: vv?.offsetTop ?? null,
      visualViewportScale: vv?.scale ?? null,
    });

    doc.classList.toggle('ios-standalone', isIOS && isStandalone && satPx > 0);
    doc.style.setProperty('--app-height', `${metrics.appHeight}px`);
    doc.style.setProperty('--visual-vh', `${metrics.visualVh}px`);

    if (metrics.isPagePinchZoomed) {
      window.clearTimeout(pinchRecoveryTimer);
      pinchRecoveryTimer = window.setTimeout(syncViewport, 180);
      window.scrollTo(0, 0);
    } else if (isIOS && (window.scrollY !== 0 || window.scrollX !== 0)) {
      window.scrollTo(0, 0);
    }
  };

  syncViewport();
  const rafId = requestAnimationFrame(syncViewport);

  const timers: number[] = [];
  const scheduleSync = (delayMs: number) => {
    timers.push(window.setTimeout(syncViewport, delayMs));
  };

  let isSweeping = false;
  let lastSweepAt = 0;
  let sweepRaf = 0;
  let readySweepRaf = 0;
  let blurCover: HTMLDivElement | null = null;
  let blurPanel: HTMLDivElement | null = null;

  const ensureBlurElements = () => {
    if (!blurCover) {
      blurCover = document.createElement('div');
      blurCover.id = 'ios-blur-cover';
      blurCover.setAttribute('aria-hidden', 'true');
      blurCover.style.cssText =
        'position:fixed;inset:0;z-index:2147483646;background:rgba(255,255,255,0.01);pointer-events:none;display:none;';
      document.body.appendChild(blurCover);
    }
    if (!blurPanel) {
      blurPanel = document.createElement('div');
      blurPanel.id = 'ios-blur-panel';
      blurPanel.setAttribute('aria-hidden', 'true');
      blurPanel.style.cssText =
        'position:fixed;top:0;right:0;bottom:0;width:90%;height:100%;z-index:2147483647;background:rgba(255,255,255,0.01);pointer-events:none;transform:translateX(110%);transition:transform 300ms ease;';
      document.body.appendChild(blurPanel);
    }
  };

  const clearIOSTopBlurComposite = (force = false) => {
    if (!isIOS || !isStandalone || readSafeAreaTopPx() <= 0) return;
    if (isSweeping) return;

    const now = Date.now();
    if (!force && now - lastSweepAt < 2000) return;

    isSweeping = true;
    lastSweepAt = now;
    ensureBlurElements();

    const cover = blurCover;
    const panel = blurPanel;
    if (!cover || !panel) {
      isSweeping = false;
      return;
    }

    void panel.offsetWidth;
    sweepRaf = requestAnimationFrame(() => {
      if (blurCover !== cover || blurPanel !== panel) return;
      cover.style.display = 'block';
      panel.style.transform = 'translateX(0%)';
    });

    timers.push(
      window.setTimeout(() => {
        if (blurCover !== cover || blurPanel !== panel) return;
        cover.style.display = 'none';
        panel.style.transform = 'translateX(110%)';
      }, 450)
    );

    timers.push(
      window.setTimeout(() => {
        isSweeping = false;
      }, 800)
    );
  };

  const preventNativeGesture = (e: Event) => {
    if (e.cancelable) {
      e.preventDefault();
    }
  };

  const preventMultiTouchPageZoom = (e: TouchEvent) => {
    if (e.touches.length >= 2 && e.cancelable) {
      e.preventDefault();
    }
  };

  const preventCtrlWheelZoom = (e: WheelEvent) => {
    if (e.ctrlKey && e.cancelable) {
      e.preventDefault();
    }
  };

  const handleLoad = () => {
    syncViewport();
    clearIOSTopBlurComposite(true);
  };

  const handleOrientationChange = () => {
    syncViewport();
    scheduleSync(150);
    scheduleSync(350);
  };

  const handleFocusOut = () => {
    scheduleSync(120);
  };

  const handlePageShow = () => {
    syncViewport();
    clearIOSTopBlurComposite(false);
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      syncViewport();
      clearIOSTopBlurComposite(false);
    }
  };

  if (document.readyState === 'complete') {
    readySweepRaf = requestAnimationFrame(() => clearIOSTopBlurComposite(true));
  } else {
    window.addEventListener('load', handleLoad);
  }

  // Re-run once right after AetheriaSplashScreen (850ms + 450ms fade) exits
  timers.push(
    window.setTimeout(() => {
      clearIOSTopBlurComposite(true);
    }, 1450)
  );

  document.addEventListener('gesturestart', preventNativeGesture, { passive: false });
  document.addEventListener('gesturechange', preventNativeGesture, { passive: false });
  document.addEventListener('gestureend', preventNativeGesture, { passive: false });
  document.addEventListener('touchstart', preventMultiTouchPageZoom, { passive: false });
  document.addEventListener('touchmove', preventMultiTouchPageZoom, { passive: false });
  document.addEventListener('wheel', preventCtrlWheelZoom, { passive: false });

  window.addEventListener('resize', syncViewport);
  window.addEventListener('orientationchange', handleOrientationChange);
  window.addEventListener('focusout', handleFocusOut);
  window.addEventListener('pageshow', handlePageShow);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.visualViewport?.addEventListener('resize', syncViewport);
  window.visualViewport?.addEventListener('scroll', syncViewport);

  return () => {
    cancelAnimationFrame(rafId);
    cancelAnimationFrame(sweepRaf);
    cancelAnimationFrame(readySweepRaf);
    window.clearTimeout(pinchRecoveryTimer);
    for (const id of timers) {
      clearTimeout(id);
    }
    isSweeping = false;
    blurCover?.remove();
    blurCover = null;
    blurPanel?.remove();
    blurPanel = null;
    satProbe?.remove();
    satProbe = null;
    document.removeEventListener('gesturestart', preventNativeGesture);
    document.removeEventListener('gesturechange', preventNativeGesture);
    document.removeEventListener('gestureend', preventNativeGesture);
    document.removeEventListener('touchstart', preventMultiTouchPageZoom);
    document.removeEventListener('touchmove', preventMultiTouchPageZoom);
    document.removeEventListener('wheel', preventCtrlWheelZoom);
    window.removeEventListener('load', handleLoad);
    window.removeEventListener('resize', syncViewport);
    window.removeEventListener('orientationchange', handleOrientationChange);
    window.removeEventListener('focusout', handleFocusOut);
    window.removeEventListener('pageshow', handlePageShow);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.visualViewport?.removeEventListener('resize', syncViewport);
    window.visualViewport?.removeEventListener('scroll', syncViewport);
  };
}
