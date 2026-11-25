import { useState, useEffect, useCallback } from 'react';
import { registerSW } from 'virtual:pwa-register';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface UsePWAResult {
  isInstalled: boolean;
  canInstall: boolean;
  isIOS: boolean;
  isOfflineReady: boolean;
  needRefresh: boolean;
  promptInstall: () => Promise<boolean>;
  updateServiceWorker: () => void;
}

export function usePWA(): UsePWAResult {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isOfflineReady, setIsOfflineReady] = useState<boolean>(false);
  const [needRefresh, setNeedRefresh] = useState<boolean>(false);
  const [updateSWFn, setUpdateSWFn] = useState<(() => Promise<void>) | null>(null);

  // 1. Detect Standalone / Installed state and OS
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if running as installed PWA (Standalone mode)
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      ((window.navigator as unknown as { standalone?: boolean }).standalone === true) ||
      document.referrer.includes('android-app://');

    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isTouchMac =
      window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1;
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent) || isTouchMac;
    setIsIOS(isAppleDevice);

    // Listen to changes in display mode
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayChange = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches);
    };
    mediaQuery.addEventListener('change', handleDisplayChange);

    return () => {
      mediaQuery.removeEventListener('change', handleDisplayChange);
    };
  }, []);

  // 2. Listen to beforeinstallprompt on Chromium / Android / Desktop
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || import.meta.env.DEV) {
      return;
    }

    try {
      const update = registerSW({
        onNeedRefresh() {
          setNeedRefresh(true);
        },
        onOfflineReady() {
          setIsOfflineReady(true);
        },
      });

      setUpdateSWFn(() => () => update(true));
    } catch (err) {
      console.warn('PWA ServiceWorker registration notice:', err);
    }
  }, []);

  // 4. Trigger install prompt
  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Error during PWA installation:', err);
      return false;
    }
  }, [deferredPrompt]);

  const updateServiceWorker = useCallback(() => {
    if (updateSWFn) {
      updateSWFn();
    }
  }, [updateSWFn]);

  return {
    isInstalled,
    canInstall: !isInstalled && (deferredPrompt !== null || isIOS),
    isIOS,
    isOfflineReady,
    needRefresh,
    promptInstall,
    updateServiceWorker,
  };
}
