import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  clampSkyMapPan,
  computePinchAnchoredPan,
  computePinchZoomRatio,
  computeTouchDistance,
  computeTouchMidpoint,
  isTapGesture,
} from '../src/utils/mobileTouch.ts';
import { computeViewportMetrics } from '../src/utils/viewport.ts';

describe('computeViewportMetrics (mobile anti-pinch calibration)', () => {
  it('keeps screen height in iOS standalone mode when visualViewport is normal', () => {
    const metrics = computeViewportMetrics({
      innerHeight: 790,
      screenWidth: 390,
      screenHeight: 844,
      isLandscape: false,
      isIOS: true,
      isStandalone: true,
      safeAreaTopPx: 54,
      visualViewportHeight: 790,
      visualViewportOffsetTop: 0,
      visualViewportScale: 1,
    });
    assert.deepEqual(metrics, {
      appHeight: 844,
      visualVh: 844,
      isKeyboardOpen: false,
      isPagePinchZoomed: false,
    });
  });

  it('prevents appHeight shrinkage when iOS/mobile visualViewport.scale drops below 1', () => {
    const metrics = computeViewportMetrics({
      innerHeight: 844,
      screenWidth: 390,
      screenHeight: 844,
      isLandscape: false,
      isIOS: true,
      isStandalone: false,
      safeAreaTopPx: 0,
      visualViewportHeight: 615,
      visualViewportOffsetTop: 0,
      visualViewportScale: 0.74,
    });
    assert.equal(metrics.isPagePinchZoomed, true);
    assert.equal(metrics.isKeyboardOpen, false);
    assert.equal(metrics.appHeight, 844);
    assert.equal(metrics.visualVh, 844);
  });

  it('prevents appHeight shrinkage when visualViewport.scale rises above 1', () => {
    const metrics = computeViewportMetrics({
      innerHeight: 844,
      screenWidth: 390,
      screenHeight: 844,
      isLandscape: false,
      isIOS: false,
      isStandalone: false,
      safeAreaTopPx: 0,
      visualViewportHeight: 590,
      visualViewportOffsetTop: 40,
      visualViewportScale: 1.43,
    });
    assert.equal(metrics.isPagePinchZoomed, true);
    assert.equal(metrics.isKeyboardOpen, false);
    assert.equal(metrics.appHeight, 844);
    assert.equal(metrics.visualVh, 844);
  });

  it('tracks keyboard height accurately when visualViewport.scale === 1', () => {
    const metrics = computeViewportMetrics({
      innerHeight: 844,
      screenWidth: 390,
      screenHeight: 844,
      isLandscape: false,
      isIOS: true,
      isStandalone: true,
      safeAreaTopPx: 54,
      visualViewportHeight: 510,
      visualViewportOffsetTop: 0,
      visualViewportScale: 1,
    });
    assert.equal(metrics.isPagePinchZoomed, false);
    assert.equal(metrics.isKeyboardOpen, true);
    assert.equal(metrics.appHeight, 844);
    assert.equal(metrics.visualVh, 510);
  });
});

describe('mobileTouch helpers', () => {
  it('computes touch distance and midpoint accurately', () => {
    const d = computeTouchDistance({ x: 100, y: 200 }, { x: 220, y: 360 });
    assert.equal(d, 200);
    assert.deepEqual(computeTouchMidpoint({ x: 100, y: 200 }, { x: 220, y: 360 }), {
      x: 160,
      y: 280,
    });
  });

  it('guards and clamps pinch zoom ratios cleanly', () => {
    assert.equal(computePinchZoomRatio(8, 120), 1);
    assert.equal(computePinchZoomRatio(120, 6), 1);
    assert.equal(computePinchZoomRatio(200, 100), 0.78);
    assert.equal(computePinchZoomRatio(100, 300), 1.28);
    assert.ok(Math.abs(computePinchZoomRatio(200, 180) - 0.9) < 1e-9);
  });

  it('clamps pan tighter in God Mode deep zoom so portrait framing stays centered', () => {
    const standardClamped = clampSkyMapPan({ x: 900, y: -900 }, 390, 720, 1.0, false);
    assert.ok(Math.abs(standardClamped.x - 720 * 0.85) < 1e-6);

    const godDeepClamped = clampSkyMapPan({ x: 500, y: -500 }, 390, 720, 0.22, true);
    const expectedLimit = 390 * 0.28;
    assert.ok(Math.abs(godDeepClamped.x - expectedLimit) < 1e-6);
    assert.ok(Math.abs(godDeepClamped.y + expectedLimit) < 1e-6);
  });

  it('anchors pan to pinch midpoint and gently recenters when zooming into God Mode', () => {
    const anchored = computePinchAnchoredPan({
      pan: { x: 40, y: 20 },
      center: { x: 195, y: 360 },
      prevMid: { x: 195, y: 360 },
      currMid: { x: 195, y: 360 },
      prevZoom: 1.0,
      nextZoom: 0.8,
      width: 390,
      height: 720,
      isGodMode: true,
    });
    assert.ok(Math.abs(anchored.x - 32) < 1e-6);
    assert.ok(Math.abs(anchored.y - 16) < 1e-6);

    const deepDamped = computePinchAnchoredPan({
      pan: { x: 100, y: -80 },
      center: { x: 195, y: 360 },
      prevMid: { x: 195, y: 360 },
      currMid: { x: 195, y: 360 },
      prevZoom: 0.3,
      nextZoom: 0.22,
      width: 390,
      height: 720,
      isGodMode: true,
    });
    assert.ok(Math.abs(deepDamped.x) < 100 * (0.22 / 0.3));
    assert.ok(Math.abs(deepDamped.y) < 80 * (0.22 / 0.3));
  });

  it('never classifies pinch release or drags as taps', () => {
    assert.equal(isTapGesture({ x: 100, y: 100 }, { x: 104, y: 105 }, 120, false), true);
    assert.equal(isTapGesture({ x: 100, y: 100 }, { x: 102, y: 102 }, 120, true), false);
    assert.equal(isTapGesture({ x: 100, y: 100 }, { x: 120, y: 100 }, 120, false), false);
    assert.equal(isTapGesture({ x: 100, y: 100 }, { x: 101, y: 101 }, 420, false), false);
  });
});
