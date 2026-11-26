import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ADMIN_NORMAL_ZOOM,
  ADMIN_REFINING_ZOOM,
  applyMultiplicativeZoom,
  clampZoom,
  computeSkyMapLod,
  getAdminQuickZoomTarget,
  getZoomBounds,
} from '../src/utils/skyMapLod.ts';
import {
  SOVEREIGN_ARTWORK_LANDMARKS,
  computeSovereignArtworkLayout,
} from '../src/components/planetarium/supremeCultivatorOverlay2D.ts';

describe('skyMapLod zoom bounds & clamping', () => {
  it('returns distinct min/max zoom bounds for non-admin and admin users', () => {
    assert.deepEqual(getZoomBounds(false), { min: 0.35, max: 4.0 });
    assert.deepEqual(getZoomBounds(true), { min: 0.14, max: 4.0 });
  });

  it('clamps out-of-range and non-finite zoom inputs safely per role', () => {
    assert.equal(clampZoom(0.1, false), 0.35);
    assert.equal(clampZoom(0.1, true), 0.14);
    assert.equal(clampZoom(6.5, false), 4.0);
    assert.equal(clampZoom(6.5, true), 4.0);
    assert.equal(clampZoom(Number.NaN, true), 1.0);
  });

  it('supports smooth multiplicative zoom down to min and up to max', () => {
    let zoom = 4.0;
    for (let i = 0; i < 40; i++) {
      zoom = applyMultiplicativeZoom(zoom, 0.85, true);
    }
    assert.equal(zoom, 0.14);

    let nonAdminZoom = 1.0;
    for (let i = 0; i < 20; i++) {
      nonAdminZoom = applyMultiplicativeZoom(nonAdminZoom, 0.85, false);
    }
    assert.equal(nonAdminZoom, 0.35);
  });

  it('toggles cleanly between 1.0x normal view and 0.18x supreme refining view', () => {
    assert.equal(getAdminQuickZoomTarget(ADMIN_NORMAL_ZOOM), ADMIN_REFINING_ZOOM);
    assert.equal(getAdminQuickZoomTarget(0.55), ADMIN_REFINING_ZOOM);
    assert.equal(getAdminQuickZoomTarget(ADMIN_REFINING_ZOOM), ADMIN_NORMAL_ZOOM);
    assert.equal(getAdminQuickZoomTarget(0.14), ADMIN_NORMAL_ZOOM);
  });
});

describe('computeSkyMapLod for non-admin users', () => {
  it('keeps stars full opacity and disables all black hole & cultivator effects across all zoom levels', () => {
    for (const zoom of [4.0, 1.0, 0.78, 0.65, 0.56, 0.35]) {
      const lod = computeSkyMapLod(zoom, false);
      assert.equal(lod.starsAlpha, 1);
      assert.equal(lod.blackHoleCoreDarkness, 0);
      assert.equal(lod.blackHoleDiskForeground, 0);
      assert.equal(lod.blackHoleCoronaAlpha, 0);
      assert.equal(lod.cultivatorReveal, 0);
    }
  });

  it('smoothly fades annotations from 1 at >=0.78 down to 0 at <=0.56', () => {
    assert.equal(computeSkyMapLod(1.0, false).annotationsAlpha, 1);
    assert.equal(computeSkyMapLod(0.78, false).annotationsAlpha, 1);

    const mid = computeSkyMapLod(0.67, false).annotationsAlpha;
    assert.ok(mid > 0.49 && mid < 0.51, `Expected ~0.5 midpoint at 0.67, got ${mid}`);

    assert.equal(computeSkyMapLod(0.56, false).annotationsAlpha, 0);
    assert.equal(computeSkyMapLod(0.35, false).annotationsAlpha, 0);
  });
});

describe('computeSkyMapLod for admin black hole & supreme cultivator thresholds', () => {
  it('keeps normal stargazing clear at 1.0x while displaying black hole corona/lensing', () => {
    const normal = computeSkyMapLod(1.0, true);
    assert.equal(normal.annotationsAlpha, 1);
    assert.equal(normal.starsAlpha, 1);
    assert.equal(normal.blackHoleCoreDarkness, 0);
    assert.equal(normal.blackHoleDiskForeground, 0);
    assert.ok(normal.blackHoleCoronaAlpha >= 0.85 && normal.blackHoleCoronaAlpha <= 1.0);
    assert.equal(normal.cultivatorReveal, 0);
  });

  it('hides all annotations at zoom <= 0.56 while stars remain visible', () => {
    const midZoomOut = computeSkyMapLod(0.55, true);
    assert.equal(midZoomOut.annotationsAlpha, 0);
    assert.equal(midZoomOut.starsAlpha, 1);
    assert.equal(midZoomOut.blackHoleCoreDarkness, 0);
    assert.ok(midZoomOut.blackHoleDiskForeground > 0 && midZoomOut.blackHoleDiskForeground < 1);
    assert.equal(midZoomOut.cultivatorReveal, 0);
  });

  it('transitions foreground accretion disk from 0 at >=0.68 to 1 at <=0.34', () => {
    assert.equal(computeSkyMapLod(0.68, true).blackHoleDiskForeground, 0);
    const midDisk = computeSkyMapLod(0.51, true).blackHoleDiskForeground;
    assert.ok(midDisk > 0.49 && midDisk < 0.51, `Expected ~0.5 at 0.51, got ${midDisk}`);
    assert.equal(computeSkyMapLod(0.34, true).blackHoleDiskForeground, 1);
  });

  it('fades stars from 1 at >=0.46 to 0 at <=0.28 while darkening event horizon from 0 at >=0.50 to 1 at <=0.28', () => {
    const at50 = computeSkyMapLod(0.50, true);
    assert.equal(at50.starsAlpha, 1);
    assert.equal(at50.blackHoleCoreDarkness, 0);

    const at46 = computeSkyMapLod(0.46, true);
    assert.equal(at46.starsAlpha, 1);
    assert.ok(at46.blackHoleCoreDarkness > 0 && at46.blackHoleCoreDarkness < 1);

    const at37 = computeSkyMapLod(0.37, true);
    assert.ok(at37.starsAlpha > 0.49 && at37.starsAlpha < 0.51);
    assert.ok(at37.blackHoleCoreDarkness > 0.5 && at37.blackHoleCoreDarkness < 1);

    const at28 = computeSkyMapLod(0.28, true);
    assert.equal(at28.starsAlpha, 0);
    assert.equal(at28.blackHoleCoreDarkness, 1);
    assert.equal(at28.blackHoleCoronaAlpha, 1);
  });

  it('reveals Supreme Cultivator smoothly from 0 at >=0.44 to 1.0 at <=0.20', () => {
    assert.equal(computeSkyMapLod(0.44, true).cultivatorReveal, 0);

    const at32 = computeSkyMapLod(0.32, true).cultivatorReveal;
    assert.ok(at32 > 0.49 && at32 < 0.51, `Expected ~0.5 at 0.32, got ${at32}`);

    const at20 = computeSkyMapLod(0.20, true);
    assert.equal(at20.cultivatorReveal, 1);

    const at18 = computeSkyMapLod(0.18, true);
    assert.equal(at18.annotationsAlpha, 0);
    assert.equal(at18.starsAlpha, 0);
    assert.equal(at18.blackHoleCoreDarkness, 1);
    assert.equal(at18.blackHoleDiskForeground, 1);
    assert.equal(at18.blackHoleCoronaAlpha, 1);
    assert.equal(at18.cultivatorReveal, 1);
  });
});

describe('computeSovereignArtworkLayout desktop & mobile alignment', () => {
  it('clears the header, fits viewport width, and frames the Black Hole cleanly on desktop and 390px mobile', () => {
    const viewports = [
      { name: 'desktop-1280x720', width: 1280, height: 720 },
      { name: 'desktop-1440x900', width: 1440, height: 900 },
      { name: 'mobile-390x742', width: 390, height: 742 },
      { name: 'mobile-375x565', width: 375, height: 565 },
    ];

    for (const vp of viewports) {
      const bhX = vp.width / 2;
      const bhY = vp.height / 2;
      const bhRadius = Math.min(vp.width, vp.height) * 0.44 * ADMIN_REFINING_ZOOM;
      const layout = computeSovereignArtworkLayout({
        width: vp.width,
        height: vp.height,
        bhX,
        bhY,
        bhRadius,
        reveal: 1.0,
        timeSec: 0,
      });

      assert.ok(layout.imgSize <= vp.width * 0.98 + 0.001, `${vp.name}: imgSize exceeds width`);
      assert.ok(
        SOVEREIGN_ARTWORK_LANDMARKS.palmCenterY * layout.imgSize <= bhY - 25.9,
        `${vp.name}: artwork top overlaps header`
      );
      assert.ok(
        layout.imgSize >= bhRadius * 5.2 - 0.001,
        `${vp.name}: imgSize too small relative to bhRadius`
      );
      assert.ok(layout.leftSealX > 0 && layout.rightSealX < vp.width, `${vp.name}: palm seals clipped`);
      assert.ok(
        bhX - layout.leftSealX > bhRadius * 1.15 && layout.rightSealX - bhX > bhRadius * 1.15,
        `${vp.name}: palm seals intrude inside Black Hole core`
      );
      assert.ok(layout.haloY - layout.haloR >= 0, `${vp.name}: halo clipped above canvas`);
      assert.equal(SOVEREIGN_ARTWORK_LANDMARKS.eyeY, 0.2435);
      assert.equal(SOVEREIGN_ARTWORK_LANDMARKS.eyeOffsetX, 0.0318);
      assert.equal(SOVEREIGN_ARTWORK_LANDMARKS.haloCenterY, 0.225);
    }
  });
});
