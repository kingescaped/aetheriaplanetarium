import React, { useState, useEffect, useRef } from 'react';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  Mail,
  RefreshCw,
  Scale,
  Send,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';
import { AetheriaStarLogo } from '../common/AetheriaLogo';
import { UsePWAResult } from '../../hooks/usePWA';
import { soundFx } from '../../utils/audio';
import { Language } from '../../utils/i18n';

interface AboutSectionProps {
  lang: Language;
  pwa?: UsePWAResult;
  installLabel: string;
}

interface LicenseItem {
  name: string;
  license: string;
}

const OPEN_SOURCE_LICENSES: LicenseItem[] = [
  { name: 'React 18', license: 'MIT License' },
  { name: 'Three.js', license: 'MIT License' },
  { name: 'React Three Fiber & Drei', license: 'MIT License' },
  { name: 'Framer Motion', license: 'MIT License' },
  { name: 'Lucide Icons', license: 'ISC License' },
  { name: 'Tailwind CSS & Vite', license: 'MIT License' },
];

const APP_VERSION = '2.5.0';
const VERSION_COPY_TEXT = `Aetheria Planetarium v${APP_VERSION} (Zenith 3D Edition)`;

export const AboutSection: React.FC<AboutSectionProps> = ({
  lang,
  pwa,
  installLabel,
}) => {
  const [copiedVersion, setCopiedVersion] = useState(false);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [isLicensesOpen, setIsLicensesOpen] = useState(false);
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const handleCopyVersion = async () => {
    soundFx.playTabClick();
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(VERSION_COPY_TEXT);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = VERSION_COPY_TEXT;
        textarea.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }
      setCopiedVersion(true);
      if (copyTimerRef.current !== null) {
        clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => {
        setCopiedVersion(false);
        copyTimerRef.current = null;
      }, 1800);
    } catch {
      // Clipboard access can be denied in restricted webviews
    }
  };

  const changelogItems = lang === 'vi'
    ? [
        'Vòm thiên cầu 3D Zenith kết hợp la bàn AR thời gian thực.',
        'Tối ưu toàn màn hình & Safe Area cho ứng dụng iOS Home Screen.',
        'Chế độ nhìn đêm bảo vệ mắt và Nhật ký quan sát cá nhân.',
      ]
    : [
        'Interactive 3D Zenith Dome with real-time AR compass tracking.',
        'Full-screen iOS Home Screen Safe Area and smooth navigation shell.',
        'Dark-adapted Night Vision mode and personal Observation Journal.',
      ];

  return (
    <div className="space-y-5 pb-2">
      {/* 1. Centered Hero Branding */}
      <div className="flex flex-col items-center text-center pt-2 pb-1">
        <div className="w-16 h-16 rounded-[20px] bg-gradient-to-tr from-cyan-950 via-slate-900 to-indigo-950 border border-cyan-400/50 md:shadow-glow-cyan flex items-center justify-center mb-3">
          <AetheriaStarLogo className="w-11 h-11 animate-pulse-subtle" />
        </div>
        <h3 className="text-base font-bold text-white tracking-tight">
          Aetheria Planetarium
        </h3>
        <p className="text-xs text-slate-400 mt-1 max-w-[280px] leading-relaxed">
          {lang === 'vi'
            ? 'Đài thiên văn bỏ túi với mô phỏng vòm 3D Zenith và cơ học thiên văn chuẩn quốc tế.'
            : 'Pocket observatory featuring 3D Zenith Dome simulation and precision celestial mechanics.'}
        </p>
        <button
          type="button"
          onClick={handleCopyVersion}
          className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-cyan-500/30 text-[11px] font-mono text-cyan-300 hover:border-cyan-400/60 active:scale-95 transition-all cursor-pointer"
          title={lang === 'vi' ? 'Chạm để sao chép phiên bản' : 'Tap to copy version'}
        >
          {copiedVersion ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-300">
                {lang === 'vi' ? 'Đã sao chép phiên bản' : 'Version copied'}
              </span>
            </>
          ) : (
            <>
              <span>Zenith 3D • v{APP_VERSION}</span>
              <Copy className="w-3 h-3 text-cyan-400/70" />
            </>
          )}
        </button>
      </div>

      {/* 2. Scientific Data Sources & Offline Status */}
      <section className="space-y-1.5">
        <h4 className="px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {lang === 'vi' ? 'Nguồn dữ liệu khoa học' : 'Scientific Data Sources'}
        </h4>
        <div className="rounded-2xl bg-slate-900/55 border border-white/[0.07] divide-y divide-white/[0.06] text-xs overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            <span className="text-slate-400">
              {lang === 'vi' ? 'Danh mục sao' : 'Star Catalog'}
            </span>
            <span className="text-slate-100 font-mono text-right">
              ESA Hipparcos (5.200+ {lang === 'vi' ? 'sao' : 'stars'})
            </span>
          </div>
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            <span className="text-slate-400">
              {lang === 'vi' ? 'Chòm sao' : 'Constellations'}
            </span>
            <span className="text-slate-100 font-mono text-right">
              {lang === 'vi' ? 'IAU 88 chòm sao' : 'IAU 88 Constellations'}
            </span>
          </div>
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            <span className="text-slate-400">
              {lang === 'vi' ? 'Hệ quy chiếu' : 'Reference Frame'}
            </span>
            <span className="text-slate-100 font-mono text-right">
              J2000.0 • WGS84
            </span>
          </div>
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            <span className="text-slate-400">
              {lang === 'vi' ? 'Chế độ ngoại tuyến' : 'Offline Mode'}
            </span>
            {pwa?.needRefresh ? (
              <button
                type="button"
                onClick={() => {
                  soundFx.playTabClick();
                  pwa.updateServiceWorker();
                }}
                className="inline-flex items-center gap-1 text-cyan-300 font-medium hover:text-cyan-200 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{lang === 'vi' ? 'Cập nhật bản mới' : 'Update Available'}</span>
              </button>
            ) : (
              <span className="text-emerald-400 font-medium inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {pwa?.isOfflineReady
                  ? (lang === 'vi' ? 'Sẵn sàng ngoại tuyến' : 'Offline Ready')
                  : (lang === 'vi' ? 'Đã đồng bộ cục bộ' : 'Synced Locally')}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* 3. What's New (Collapsible) */}
      <section className="space-y-1.5">
        <h4 className="px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {lang === 'vi' ? 'Cập nhật phiên bản' : 'Release Notes'}
        </h4>
        <div className="rounded-2xl bg-slate-900/55 border border-white/[0.07] overflow-hidden">
          <button
            type="button"
            onClick={() => {
              soundFx.playTabClick();
              setIsChangelogOpen((prev) => !prev);
            }}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <span className="text-xs font-medium text-white">
                {lang === 'vi' ? 'Có gì mới' : "What's New"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                v{APP_VERSION}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isChangelogOpen ? 'rotate-180' : ''}`}
              />
            </div>
          </button>

          {isChangelogOpen && (
            <ul className="px-4 pb-3.5 pt-2 border-t border-white/[0.06] space-y-2 text-xs text-slate-300">
              {changelogItems.map((item) => (
                <li key={item} className="flex items-start gap-2 leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* 4. Local-First Privacy */}
      <section className="space-y-1.5">
        <h4 className="px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {lang === 'vi' ? 'Quyền riêng tư cục bộ' : 'Local-First Privacy'}
        </h4>
        <div className="rounded-2xl bg-slate-900/55 border border-white/[0.07] p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-950/70 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {lang === 'vi'
              ? 'Toàn bộ tọa độ GPS, cảm biến la bàn AR, mục yêu thích và nhật ký quan sát được tính toán và lưu trữ trực tiếp trên thiết bị của bạn, không theo dõi hay gửi dữ liệu ra máy chủ ngoài.'
              : 'All GPS coordinates, AR compass orientation, favorites, and observation logs are computed and stored strictly on your device with zero external tracking.'}
          </p>
        </div>
      </section>

      {/* 5. Author & Contact */}
      <section className="space-y-1.5">
        <h4 className="px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {lang === 'vi' ? 'Tác giả & Liên hệ' : 'Author & Contact'}
        </h4>
        <div className="rounded-2xl bg-slate-900/55 border border-white/[0.07] divide-y divide-white/[0.06] text-xs overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-slate-400">
              <User className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <span>{lang === 'vi' ? 'Tác giả' : 'Developer'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-white">Quang Vo</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-white/10">
                LVQ Std
              </span>
            </div>
          </div>

          <a
            href="mailto:kingescaped.dev@gmail.com"
            className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-white/[0.03] active:bg-cyan-500/10 transition-colors"
          >
            <div className="flex items-center gap-2.5 text-slate-400">
              <Mail className="w-4 h-4 text-purple-400 flex-shrink-0" />
              <span>Gmail</span>
            </div>
            <span className="text-cyan-300 font-mono truncate">
              kingescaped.dev@gmail.com
            </span>
          </a>

          <a
            href="https://t.me/kingescaped"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-white/[0.03] active:bg-cyan-500/10 transition-colors"
          >
            <div className="flex items-center gap-2.5 text-slate-400">
              <Send className="w-4 h-4 text-sky-400 flex-shrink-0" />
              <span>Telegram</span>
            </div>
            <span className="text-cyan-300 font-mono">@kingescaped</span>
          </a>
        </div>
      </section>

      {/* 6. Open Source Licenses (Collapsible) */}
      <section className="space-y-1.5">
        <h4 className="px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {lang === 'vi' ? 'Pháp lý & Mã nguồn' : 'Legal & Credits'}
        </h4>
        <div className="rounded-2xl bg-slate-900/55 border border-white/[0.07] overflow-hidden">
          <button
            type="button"
            onClick={() => {
              soundFx.playTabClick();
              setIsLicensesOpen((prev) => !prev);
            }}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Scale className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span className="text-xs font-medium text-white">
                {lang === 'vi' ? 'Giấy phép mã nguồn mở' : 'Open Source Licenses'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-400">
                {lang === 'vi'
                  ? `${OPEN_SOURCE_LICENSES.length} thư viện`
                  : `${OPEN_SOURCE_LICENSES.length} packages`}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isLicensesOpen ? 'rotate-180' : ''}`}
              />
            </div>
          </button>

          {isLicensesOpen && (
            <div className="divide-y divide-white/[0.05] border-t border-white/[0.06] text-[11px]">
              {OPEN_SOURCE_LICENSES.map((pkg) => (
                <div
                  key={pkg.name}
                  className="px-4 py-2.5 flex items-center justify-between"
                >
                  <span className="text-slate-200 font-medium">{pkg.name}</span>
                  <span className="text-slate-400 font-mono">{pkg.license}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* PWA Install Button when available */}
      {pwa && !pwa.isInstalled && pwa.canInstall && (
        <button
          type="button"
          onClick={() => {
            soundFx.playToggle(true);
            pwa.promptInstall();
          }}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-xs shadow-glow-cyan active:scale-95 hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>{installLabel}</span>
        </button>
      )}

      {/* 7. Centered Copyright Footer */}
      <footer className="pt-2 pb-1 text-center">
        <p className="text-[11px] font-mono text-slate-500">
          © 2026 Aetheria Planetarium - LVQ Std
        </p>
      </footer>
    </div>
  );
};
