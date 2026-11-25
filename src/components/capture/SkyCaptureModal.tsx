import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, CheckCircle2, Download, Share2, X } from 'lucide-react';
import type { SkyCaptureMetadata } from '../../types/atmosphere';
import { Language, TRANSLATIONS } from '../../utils/i18n';
import { soundFx } from '../../utils/audio';
import { IOSSwitch } from '../layout/IOSSwitch';
import { useEdgeSwipeBack } from '../../hooks/useEdgeSwipeBack';
import {
  buildCaptureFilename,
  canUseWebShareFiles,
  canvasToPngBlob,
  downloadBlobAsFile,
  formatCaptureWatermarkInfo,
  shareOrDownloadSkyImage,
} from '../../utils/skyCapture';
import { composeSkySnapshotCanvas } from '../../utils/skyCaptureCanvas';

interface SkyCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawCanvas: HTMLCanvasElement | null;
  metadata: SkyCaptureMetadata;
  lang?: Language;
}

type ExportStatus = 'idle' | 'working' | 'saved' | 'shared' | 'cancelled' | 'error';

export const SkyCaptureModal: React.FC<SkyCaptureModalProps> = ({
  isOpen,
  onClose,
  rawCanvas,
  metadata,
  lang = 'vi',
}) => {
  const t = TRANSLATIONS[lang];
  const [includeWatermark, setIncludeWatermark] = useState<boolean>(true);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [status, setStatus] = useState<ExportStatus>('idle');
  const composedCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const canShareFiles = useMemo(() => canUseWebShareFiles(), []);
  const filename = useMemo(
    () => buildCaptureFilename(metadata.location, metadata.date, metadata.viewMode),
    [metadata.location, metadata.date, metadata.viewMode]
  );
  const watermarkSummary = useMemo(
    () => formatCaptureWatermarkInfo(metadata, lang),
    [metadata, lang]
  );

  const { handlers: swipeHandlers, style: swipeStyle, backdropOpacity } = useEdgeSwipeBack({
    onBack: onClose,
    edge: 'left',
    enabled: isOpen,
  });

  useEffect(() => {
    if (!isOpen) return;
    setStatus('idle');
    const composed = composeSkySnapshotCanvas(rawCanvas, metadata, includeWatermark, lang);
    composedCanvasRef.current = composed;
    try {
      setPreviewUrl(composed.toDataURL('image/png'));
    } catch {
      setPreviewUrl('');
      setStatus('error');
    }
  }, [isOpen, rawCanvas, metadata, includeWatermark, lang]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleExport = async (preferShare: boolean) => {
    const canvas = composedCanvasRef.current;
    if (!canvas) {
      setStatus('error');
      return;
    }

    setStatus('working');
    soundFx.playTabClick();

    try {
      const blob = await canvasToPngBlob(canvas);
      if (preferShare && canShareFiles) {
        const shareTitle = `${watermarkSummary.brand} — ${watermarkSummary.modeBadge}`;
        const shareText = watermarkSummary.targetLine
          ? `${watermarkSummary.locationLine} • ${watermarkSummary.timeLine} • ${watermarkSummary.targetLine}`
          : `${watermarkSummary.locationLine} • ${watermarkSummary.timeLine}`;
        const outcome = await shareOrDownloadSkyImage(blob, filename, shareTitle, shareText, true);
        setStatus(outcome === 'shared' ? 'shared' : outcome === 'cancelled' ? 'cancelled' : 'saved');
      } else {
        downloadBlobAsFile(blob, filename);
        setStatus('saved');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <motion.div
      style={{ opacity: backdropOpacity, height: 'var(--visual-vh, 100%)' }}
      className="fixed inset-0 z-[65] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sky-capture-modal-title"
    >
      <motion.div
        {...swipeHandlers}
        style={swipeStyle}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl glass-panel border border-cyan-500/30 shadow-2xl overflow-hidden text-slate-100 pb-[var(--sab)]"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-400/35 flex items-center justify-center text-cyan-300 shrink-0">
              <Camera className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 id="sky-capture-modal-title" className="text-sm font-bold text-white truncate">
                {t.captureSkyTitle}
              </h2>
              <div className="text-[10px] font-mono text-cyan-300/90 truncate">
                {watermarkSummary.modeBadge} • {filename}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundFx.playTabClick();
              onClose();
            }}
            aria-label={t.close}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 overscroll-contain">
          <div className="w-full rounded-2xl bg-[#030712] border border-white/10 overflow-hidden flex items-center justify-center min-h-[180px] max-h-[48vh]">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={t.captureSkyTitle}
                data-testid="capture-preview-img"
                className="max-w-full max-h-[46vh] w-auto h-auto object-contain block"
              />
            ) : (
              <div className="p-6 text-xs text-slate-400 font-mono">{t.captureEmptyError}</div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/65 border border-white/10">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white">{t.captureWatermarkLabel}</div>
              <div className="text-[11px] text-slate-400 truncate">{t.captureWatermarkDesc}</div>
            </div>
            <IOSSwitch
              checked={includeWatermark}
              onChange={(checked) => {
                setIncludeWatermark(checked);
                setStatus('idle');
              }}
              color="cyan"
              ariaLabel={t.captureWatermarkLabel}
            />
          </div>

          {status !== 'idle' && status !== 'working' && (
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono border ${
                status === 'error'
                  ? 'bg-red-950/50 border-red-500/40 text-red-200'
                  : status === 'cancelled'
                    ? 'bg-slate-900/70 border-white/10 text-slate-300'
                    : 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                {status === 'shared'
                  ? t.captureSharedStatus
                  : status === 'saved'
                    ? t.captureSavedStatus
                    : status === 'cancelled'
                      ? t.captureCancelledStatus
                      : t.captureEmptyError}
              </span>
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-white/10 bg-slate-950/60 flex flex-wrap items-center justify-end gap-2.5 shrink-0">
          {canShareFiles ? (
            <>
              <button
                type="button"
                disabled={!previewUrl || status === 'working'}
                onClick={() => handleExport(false)}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-semibold text-slate-200 hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Download className="w-4 h-4 text-cyan-400" aria-hidden="true" />
                <span>{t.captureDownloadBtn}</span>
              </button>
              <button
                type="button"
                disabled={!previewUrl || status === 'working'}
                onClick={() => handleExport(true)}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-xs font-semibold text-white shadow-glow-cyan transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Share2 className="w-4 h-4" aria-hidden="true" />
                <span>{t.captureShareBtn}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={!previewUrl || status === 'working'}
              onClick={() => handleExport(false)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-xs font-semibold text-white shadow-glow-cyan transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span>{t.captureDownloadBtn}</span>
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
