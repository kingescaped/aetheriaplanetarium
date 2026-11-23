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
}

/**
 * iOS Standard Navigation Bar (UINavigationBar)
 * Tuân thủ đúng chuẩn Apple Human Interface Guidelines:
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
}) => {
  const handleBack = () => {
    soundFx.playTabClick();
    if (onBack) onBack();
  };

  return (
    <div
      className={`ios-nav-bar relative w-full z-20 flex items-center justify-between px-4 border-b border-white/10 bg-[#060c1c] select-none flex-shrink-0 ${className}`}
    >
      {/* 1. Leading Area: Nút trở về (nếu có onBack) HOẶC Tiêu đề căn trái (nếu không có onBack) */}
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
            <h1 className="text-[18px] md:text-xl font-bold text-white tracking-tight font-sans text-left">
              {title}
            </h1>
          )
        )}
      </div>

      {/* 2. Center Area: Tiêu đề căn giữa tuyệt đối CHỈ HIỂN THỊ KHI CÓ nút trở về (onBack) */}
      {onBack && title && (
        <div className="ios-nav-center absolute inset-x-0 bottom-0 flex items-center justify-center pointer-events-none px-18 md:px-24">
          <h1 className="text-[17px] md:text-xl font-bold text-white tracking-tight truncate font-sans text-center">
            {title}
          </h1>
        </div>
      )}

      {/* 3. Trailing Area (Actions hoặc Spacer cân bằng) */}
      <div className="flex items-center justify-end min-w-[70px] z-10 space-x-2">
        {trailing ? trailing : <div className="w-6" />}
      </div>
    </div>
  );
};
