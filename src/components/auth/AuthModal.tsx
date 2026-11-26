import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Compass,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Radio,
  User,
  X,
} from 'lucide-react';
import {
  mapAuthError,
  registerWithEmail,
  signInWithEmail,
} from '../../services/authService';
import { loadUserCloudData, type CloudUserBundle } from '../../services/profileApi';
import { Language, TRANSLATIONS } from '../../utils/i18n';
import { soundFx } from '../../utils/audio';
import { useEdgeSwipeBack } from '../../hooks/useEdgeSwipeBack';
import { IOSNavigationBar } from '../layout/IOSNavigationBar';
import { AetheriaStarLogo } from '../common/AetheriaLogo';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onSuccess?: (bundle?: CloudUserBundle) => void;
}

type AuthMode = 'signin' | 'register';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  lang,
  onSuccess,
}) => {
  const t = TRANSLATIONS[lang];
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [callsign, setCallsign] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const { handlers: swipeHandlers, style: swipeStyle, backdropOpacity } = useEdgeSwipeBack({
    onBack: () => onCloseRef.current(),
    edge: 'left',
    enabled: isOpen,
  });

  // Effect 1: Reset sensitive input state ONLY when modal open state changes
  useEffect(() => {
    if (!isOpen) return;
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setErrorMessage(null);
  }, [isOpen]);

  // Effect 2: Escape key dismissal without resetting active password inputs
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onCloseRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting]);

  if (!isOpen) return null;

  const handleModeChange = (nextMode: AuthMode) => {
    if (nextMode === mode || isSubmitting) return;
    soundFx.playTabClick();
    setMode(nextMode);
    setErrorMessage(null);
  };

  const validateForm = (): string | null => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return t.authValEmailRequired;
    if (!EMAIL_PATTERN.test(trimmedEmail)) return t.authValEmailInvalid;
    if (password.length < 6) return t.authValPasswordMin;

    if (mode === 'register') {
      if (!name.trim()) return t.authValNameRequired;
      if (!callsign.trim()) return t.authValCallsignRequired;
      if (password !== confirmPassword) return t.authValPasswordMismatch;
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    if (typeof window !== 'undefined' && (window.scrollX !== 0 || window.scrollY !== 0)) {
      window.scrollTo(0, 0);
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    soundFx.playTabClick();

    try {
      const firebaseUser =
        mode === 'signin'
          ? await signInWithEmail(email, password)
          : await registerWithEmail({
              email,
              password,
              name,
              callsign,
            });

      const cloudBundle = await loadUserCloudData(firebaseUser);
      soundFx.playToggle(true);
      onSuccess?.(cloudBundle);
      onClose();
    } catch (err) {
      setErrorMessage(mapAuthError(err, lang));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestContinue = () => {
    if (isSubmitting) return;
    soundFx.playTabClick();
    onClose();
  };

  const headingTitle = mode === 'signin' ? t.authSignInTitle : t.authRegisterTitle;
  const headingSubtitle =
    mode === 'signin' ? t.authSignInSubtitle : t.authRegisterSubtitle;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{ opacity: backdropOpacity, height: 'var(--visual-vh, 100%)' }}
      className="fixed inset-0 z-[70] overflow-hidden flex items-center justify-center p-0 md:p-4 bg-[#030712]/90 md:bg-black/75 backdrop-blur-xl"
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-heading"
    >
      <motion.div
        {...swipeHandlers}
        style={{ ...swipeStyle }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full h-full md:h-auto md:max-h-[90vh] md:max-w-md rounded-none md:rounded-3xl bg-[#050a18] border-0 md:border border-cyan-500/30 shadow-[0_24px_64px_rgba(0,0,0,0.78)] overflow-hidden flex flex-col"
      >
        {/* Top bar aligned with app Safe Area shell */}
        <IOSNavigationBar
          disableDesktopSafeTop
          title={mode === 'signin' ? t.authSignInTab : t.authRegisterTab}
          backLabel={t.back}
          onBack={undefined}
          onClose={isSubmitting ? undefined : onClose}
          trailing={
            <button
              type="button"
              onClick={handleGuestContinue}
              disabled={isSubmitting}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:opacity-60 text-slate-300 hover:text-white transition-all flex items-center justify-center cursor-pointer disabled:opacity-40"
              aria-label={t.close}
              title={t.close}
            >
              <X className="w-4 h-4" />
            </button>
          }
        />

        <div className="flex-1 overflow-y-auto px-5 py-6 md:px-7 md:py-6 space-y-5 overscroll-contain touch-pan-y">
          {/* Brand Crest & Primary Heading */}
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500/20 via-indigo-500/25 to-purple-500/20 border border-cyan-400/40 flex items-center justify-center shrink-0 shadow-[0_8px_20px_rgba(2,132,199,0.22)]">
              <AetheriaStarLogo className="w-7 h-7" />
            </div>
            <div className="min-w-0">
              <h2
                id="auth-modal-heading"
                className="text-xl font-bold tracking-tight text-white leading-snug"
              >
                {headingTitle}
              </h2>
              <p className="text-xs leading-relaxed text-slate-300 mt-1">
                {headingSubtitle}
              </p>
            </div>
          </div>

          {/* Segmented Mode Switch */}
          <div
            role="tablist"
            aria-label={mode === 'signin' ? t.authSignInTab : t.authRegisterTab}
            className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-slate-900/90 border border-white/10"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signin'}
              onClick={() => handleModeChange('signin')}
              className={`py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                mode === 'signin'
                  ? 'bg-gradient-to-r from-cyan-500/25 to-blue-600/25 text-white border border-cyan-400/45 shadow-[0_4px_14px_rgba(6,182,212,0.2)]'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              {t.authSignInTab}
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              onClick={() => handleModeChange('register')}
              className={`py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                mode === 'register'
                  ? 'bg-gradient-to-r from-cyan-500/25 to-blue-600/25 text-white border border-cyan-400/45 shadow-[0_4px_14px_rgba(6,182,212,0.2)]'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              {t.authRegisterTab}
            </button>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-950/60 border border-rose-400/40 text-rose-100 text-xs leading-relaxed"
            >
              <AlertCircle className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
            {mode === 'register' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="auth-name"
                    className="block text-xs font-medium text-slate-200 mb-1.5"
                  >
                    {t.authNameLabel}
                  </label>
                  <div className="relative">
                    <User
                      className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      aria-hidden="true"
                    />
                    <input
                      id="auth-name"
                      type="text"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t.authNamePlaceholder}
                      disabled={isSubmitting}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl glass-input text-base md:text-sm placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="auth-callsign"
                    className="block text-xs font-medium text-slate-200 mb-1.5"
                  >
                    {t.authCallsignLabel}
                  </label>
                  <div className="relative">
                    <Radio
                      className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      aria-hidden="true"
                    />
                    <input
                      id="auth-callsign"
                      type="text"
                      autoComplete="nickname"
                      value={callsign}
                      onChange={(e) => setCallsign(e.target.value)}
                      placeholder={t.authCallsignPlaceholder}
                      disabled={isSubmitting}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl glass-input text-base md:text-sm font-mono placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-cyan-400"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="auth-email"
                className="block text-xs font-medium text-slate-200 mb-1.5"
              >
                {t.authEmailLabel}
              </label>
              <div className="relative">
                <Mail
                  className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.authEmailPlaceholder}
                  disabled={isSubmitting}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl glass-input text-base md:text-sm placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-cyan-400"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="auth-password"
                className="block text-xs font-medium text-slate-200 mb-1.5"
              >
                {t.authPasswordLabel}
              </label>
              <div className="relative">
                <Lock
                  className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.authPasswordPlaceholder}
                  disabled={isSubmitting}
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl glass-input text-base md:text-sm placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-cyan-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? t.authHidePassword : t.authShowPassword}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label
                  htmlFor="auth-confirm-password"
                  className="block text-xs font-medium text-slate-200 mb-1.5"
                >
                  {t.authConfirmPasswordLabel}
                </label>
                <div className="relative">
                  <Lock
                    className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="auth-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t.authConfirmPasswordPlaceholder}
                    disabled={isSubmitting}
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl glass-input text-base md:text-sm placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={
                      showConfirmPassword ? t.authHidePassword : t.authShowPassword
                    }
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            <div className="pt-2 space-y-2.5">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:scale-[0.99] text-white font-semibold text-sm shadow-[0_8px_22px_rgba(14,165,233,0.34)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t.authSubmitting}</span>
                  </>
                ) : (
                  <span>{mode === 'signin' ? t.authSubmitSignIn : t.authSubmitRegister}</span>
                )}
              </button>

              <button
                type="button"
                onClick={handleGuestContinue}
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-2xl bg-slate-900/70 hover:bg-slate-800/80 border border-white/10 text-slate-200 hover:text-white text-xs font-medium transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t.authContinueGuest}</span>
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
};
