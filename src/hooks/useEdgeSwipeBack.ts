import React, { useRef, useEffect, useCallback } from 'react';
import { useMotionValue, animate, AnimationPlaybackControls } from 'framer-motion';
import { soundFx } from '../utils/audio';

export interface UseEdgeSwipeBackOptions {
  /** Callback được gọi khi vuốt mép trái thành công (đóng modal hoặc quay lại) */
  onBack: () => void;
  /** Độ rộng vùng cảm ứng tính từ cạnh trái màn hình (px), mặc định 30px */
  edgeWidth?: number;
  /** Khoảng cách vuốt tối thiểu để kích hoạt (px), mặc định 100px */
  threshold?: number;
  /** Bật/tắt cử chỉ, mặc định true */
  enabled?: boolean;
}

export interface UseEdgeSwipeBackResult {
  x: ReturnType<typeof useMotionValue<number>>;
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
    onTouchCancel: (e: React.TouchEvent) => void;
  };
  style: {
    x: ReturnType<typeof useMotionValue<number>>;
  };
}

/**
 * Custom Hook: Cử chỉ vuốt mép trái (Edge-swipe to go back) chuẩn iOS
 * - Chỉ kích hoạt khi touchstart trong khoảng `edgeWidth` (mặc định <= 30px).
 * - Khóa hướng vuốt để không xung đột với cuộn danh sách dọc.
 * - Hỗ trợ hiệu ứng kéo bám tay (interactive translation) và spring animation khi thả tay.
 */
export function useEdgeSwipeBack({
  onBack,
  edgeWidth = 30,
  threshold = 100,
  enabled = true,
}: UseEdgeSwipeBackOptions): UseEdgeSwipeBackResult {
  const x = useMotionValue(0);
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  const isSwipingRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startTimeRef = useRef(0);
  const isHorizontalRef = useRef<boolean | null>(null);
  const animControlsRef = useRef<AnimationPlaybackControls | null>(null);

  // Dọn dẹp animation khi unmount
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
      const touch = e.touches[0];

      // 1. Chỉ kích hoạt nếu điểm chạm bắt đầu trong khoảng edgeWidth tính từ mép trái màn hình
      if (touch.clientX <= edgeWidth) {
        if (animControlsRef.current) {
          animControlsRef.current.stop();
        }
        isSwipingRef.current = true;
        startXRef.current = touch.clientX;
        startYRef.current = touch.clientY;
        startTimeRef.current = Date.now();
        isHorizontalRef.current = null;
      }
    },
    [enabled, edgeWidth]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isSwipingRef.current || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - startXRef.current;
      const deltaY = touch.clientY - startYRef.current;

      // 2. Khóa hướng vuốt ban đầu: Nếu vuốt dọc nhiều hơn thì hủy để cho phép cuộn bình thường
      if (isHorizontalRef.current === null) {
        if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
          if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 0) {
            isHorizontalRef.current = true;
          } else {
            // Là cuộn dọc hoặc vuốt sang trái -> Hủy cử chỉ mép trái
            isHorizontalRef.current = false;
            isSwipingRef.current = false;
            return;
          }
        } else {
          return;
        }
      }

      if (isHorizontalRef.current && deltaX > 0) {
        // Cập nhật vị trí trượt theo ngón tay
        x.set(deltaX);
      }
    },
    [x]
  );

  const handleTouchEnd = useCallback(
    () => {
      if (!isSwipingRef.current || !isHorizontalRef.current) {
        isSwipingRef.current = false;
        isHorizontalRef.current = null;
        return;
      }

      isSwipingRef.current = false;
      const currentX = x.get();
      const deltaTime = Date.now() - startTimeRef.current;
      const velocityX = currentX / Math.max(deltaTime, 1); // px/ms

      // 3. Nếu kéo qua ngưỡng threshold (100px) hoặc vung tay nhanh (flick) sang phải
      if (currentX >= threshold || (currentX >= 40 && velocityX > 0.45)) {
        soundFx.playTabClick();
        const targetX = typeof window !== 'undefined' ? window.innerWidth : 500;

        animControlsRef.current = animate(x, targetX, {
          type: 'spring',
          damping: 26,
          stiffness: 280,
          onComplete: () => {
            x.set(0);
            onBackRef.current();
          },
        });
      } else {
        // Chưa đủ khoảng cách -> Bật đàn hồi (spring back) trở lại vị trí cũ
        animControlsRef.current = animate(x, 0, {
          type: 'spring',
          damping: 28,
          stiffness: 350,
        });
      }

      isHorizontalRef.current = null;
    },
    [x, threshold]
  );

  return {
    x,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchEnd,
    },
    style: {
      x,
    },
  };
}
