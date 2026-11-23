import React, { useRef, useEffect, useCallback } from 'react';
import { useMotionValue, useTransform, animate, AnimationPlaybackControls, MotionValue } from 'framer-motion';
import { soundFx } from '../utils/audio';

export interface UseEdgeSwipeBackOptions {
  /** Callback được gọi khi vuốt mép trái thành công (đóng modal hoặc quay lại) */
  onBack: () => void;
  /** Độ rộng vùng cảm ứng tính từ cạnh trái màn hình (px), mặc định 32px */
  edgeWidth?: number;
  /** Khoảng cách vuốt tối thiểu để kích hoạt (px), hạ xuống 60px để phản hồi tức thì */
  threshold?: number;
  /** Bật/tắt cử chỉ, mặc định true */
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
 * Custom Hook: Cử chỉ vuốt mép trái (Edge-swipe to go back) chuẩn iOS Native
 * - Phản hồi siêu tốc 120fps, không delay, không khựng.
 * - Backdrop mờ dần để lộ màn hình phía sau ngay trong lúc vuốt.
 * - Sử dụng đường cong gia tốc Apple Cubic-Bezier [0.32, 0.72, 0, 1] thay cho spring chậm.
 */
export function useEdgeSwipeBack({
  onBack,
  edgeWidth = 32,
  threshold = 60,
  enabled = true,
}: UseEdgeSwipeBackOptions): UseEdgeSwipeBackResult {
  const x = useMotionValue(0);
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  // Backdrop opacity: giảm mượt mà từ 1 xuống 0 khi vuốt từ 0 đến 250px
  const backdropOpacity = useTransform(x, [0, 250], [1, 0.15]);

  const isSwipingRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startTimeRef = useRef(0);
  const isHorizontalRef = useRef<boolean | null>(null);
  const animControlsRef = useRef<AnimationPlaybackControls | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (animControlsRef.current) {
        animControlsRef.current.stop();
      }
      // TUYỆT ĐỐI KHÔNG gọi x.set(0) ở đây!
      // Khi component unmount (hoặc activeSection chuyển sang null), enabled đổi thành false.
      // Nếu gọi x.set(0), MotionValue sẽ ngay lập tức kéo phần tử trở lại vị trí 0px trên DOM
      // trước khi React kịp gỡ bỏ phần tử, gây ra hiện tượng NHÁY KHUNG HÌNH!
    }
  }, [enabled]);

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

      // 1. Chỉ kích hoạt nếu chạm trong phạm vi edgeWidth từ mép trái màn hình
      if (touch.clientX <= edgeWidth) {
        if (animControlsRef.current) {
          animControlsRef.current.stop();
        }
        x.set(0);
        isSwipingRef.current = true;
        startXRef.current = touch.clientX;
        startYRef.current = touch.clientY;
        startTimeRef.current = Date.now();
        isHorizontalRef.current = null;
      }
    },
    [enabled, edgeWidth, x]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isSwipingRef.current || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - startXRef.current;
      const deltaY = touch.clientY - startYRef.current;

      // 2. Khóa hướng vuốt ban đầu
      if (isHorizontalRef.current === null) {
        if (Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6) {
          if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX > 0) {
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

      if (isHorizontalRef.current && deltaX > 0) {
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

      // 3. Nếu kéo qua ngưỡng 60px hoặc vẩy tay nhanh sang phải
      if (currentX >= threshold || (currentX >= 30 && velocityX > 0.3)) {
        soundFx.playTabClick();
        const targetX = typeof window !== 'undefined' ? window.innerWidth : 450;

        // Hoàn tất animation lướt ra cực nhanh (180ms), chuẩn tốc độ Apple UINavigationController
        animControlsRef.current = animate(x, targetX, {
          duration: 0.18,
          ease: [0.32, 0.72, 0, 1],
          onComplete: () => {
            // Kích hoạt onBack để đóng modal / unmount sub-view
            // Không dùng setTimeout reset x tại đây để tránh gây giật/nháy 1 frame
            onBackRef.current();
          },
        });
      } else {
        // Chưa đủ ngưỡng -> trả về vị trí ban đầu trong 120ms
        animControlsRef.current = animate(x, 0, {
          duration: 0.14,
          ease: [0.25, 1, 0.5, 1],
        });
      }

      isHorizontalRef.current = null;
    },
    [x, threshold]
  );

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
