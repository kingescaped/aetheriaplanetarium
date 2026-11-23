import React from 'react';
import { soundFx } from '../../utils/audio';

export interface IOSSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  color?: 'cyan' | 'emerald' | 'purple' | 'red' | 'blue';
  disabled?: boolean;
  className?: string;
}

/**
 * iOS Standard UISwitch
 * Chuẩn thiết kế Apple iOS:
 * - Dạng viên thuốc mềm mại (pill shape 48px x 28px)
 * - Nút trượt (thumb) tròn màu trắng nổi bóng (shadow-md)
 * - Hoạt ảnh trượt mượt mà (smooth spring transition)
 * - Âm thanh phản hồi xúc giác nhẹ nhàng khi gạt
 */
export const IOSSwitch: React.FC<IOSSwitchProps> = ({
  checked,
  onChange,
  color = 'cyan',
  disabled = false,
  className = '',
}) => {
  const activeColorMap: Record<string, string> = {
    cyan: 'bg-cyan-500 shadow-glow-cyan',
    emerald: 'bg-emerald-500',
    purple: 'bg-purple-500 shadow-glow-purple',
    red: 'bg-red-500 shadow-glow-red',
    blue: 'bg-blue-500',
  };

  const activeBg = activeColorMap[color] || activeColorMap.cyan;

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    const nextVal = !checked;
    soundFx.playToggle(nextVal);
    onChange(nextVal);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={handleToggle}
      className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-250 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
        checked ? activeBg : 'bg-slate-700/80 border border-white/10'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'} ${className}`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition duration-250 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
};
