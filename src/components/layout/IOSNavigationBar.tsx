import React from 'react';
import { ChevronLeft, X } from 'lucide-react';
import { soundFx } from '../../utils/audio';

export interface IOSNavigationBarProps {
  /** Tiêu đề của màn hình hiện tại (căn chính giữa màn hình chuẩn iOS) */
  title?: string;
  /** Nhãn của nút quay lại (mặc định ngắn gọn: 'Cài đặt' hoặc 'Quay lại', không để cụm từ quá dài) */
  backLabel?: string;
  /** Sự kiện khi nhấn nút quay lại */
  onBack?: () => void;
  /** Nút hoặc hành động ở góc phải (Close, Done, v.v.) */
  trailing?: React.ReactNode;
  /** Sự kiện khi nhấn nút đóng (X) mặc định */
  onClose?: () => void;
  /** Hiển thị dạng tiêu đề lớn (Large Title) cho trang gốc */
  largeTitle?: boolean;
  /** Lớp CSS bổ sung */
  className?: string;
  /** Style bổ sung */
  style?: React.CSSProperties;
}

/**
 * iOS Standard Navigation Bar (UINavigationBar)
 * Tuân thủ đúng chuẩn Apple Human Interface Guidelines:
 * - Bù lề an toàn: paddingTop: 'env(safe-area-inset-top)', minHeight: 'calc(56px + env(safe-area-inset-top))'
 * - Leading: Chevron Left + Back label ngắn gọn với hiệu ứng active:opacity-40
 * - Center: Tiêu đề được căn giữa tuyệt đối (absolute centering), không bị xô lệch hay dính vào nút Back
 * - Trailing: Nút hành động hoặc nút đóng (X)
 */
export const IOSNavigationBar: React.FC<IOSNavigationBarProps> = ({
  title,
  backLabel = 'Quay lại',
  onBack,
  trailing,
  onClose,
  className = '',
  style = {},
}) => {
  const handleBack = () => {
    soundFx.playTabClick();
    if (onBack) onBack();
  };

  const handleClose = () => {
    soundFx.playTabClick();
    if (onClose) onClose();
  };

  return (
    <header
      className={`w-full shrink-0 bg-[#030712]/80 backdrop-blur-xl border-b border-white/10 z-40 select-none ${className}`}
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        ...style,
      }}
    >
      <div className="w-full h-[56px] flex items-center justify-between px-3 md:px-4 relative">
        {/* 1. Leading Area: Nút trở về (nếu có onBack) HOẶC Tiêu đề căn trái (nếu không có onBack và không căn giữa) */}
        <div className="flex items-center min-w-[70px] z-10">
          {onBack ? (
            <button
              onClick={handleBack}
              className="flex items-center text-cyan-400 hover:text-cyan-300 active:opacity-40 transition-opacity -ml-1 text-[15px] font-medium tracking-tight group cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5 -mr-0.5 group-active:-translate-x-0.5 transition-transform" />
              <span className="truncate max-w-[120px]">{backLabel}</span>
            </button>
          ) : (
            title && (
              <h1 className="text-[17px] md:text-lg font-bold text-white tracking-tight font-sans text-left">
                {title}
              </h1>
            )
          )}
        </div>

        {/* 2. Center Area: Tiêu đề căn giữa tuyệt đối CHỈ HIỂN THỊ KHI CÓ nút trở về (onBack) */}
        {onBack && title && (
          <div className="ios-nav-center absolute inset-x-0 top-0 h-full flex items-center justify-center pointer-events-none px-20">
            <h1 className="text-[16px] md:text-[17px] font-bold text-white tracking-tight truncate font-sans text-center">
              {title}
            </h1>
          </div>
        )}

        {/* 3. Trailing Area (Actions hoặc Nút Đóng hoặc Spacer cân bằng) */}
        <div className="flex items-center justify-end min-w-[70px] z-10 space-x-2">
          {trailing ? (
            trailing
          ) : onClose ? (
            <button
              onClick={handleClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:opacity-60 text-slate-300 hover:text-white transition-all flex items-center justify-center cursor-pointer"
              title="Đóng (Close)"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-6" />
          )}
        </div>
      </div>
    </header>
  );
};
