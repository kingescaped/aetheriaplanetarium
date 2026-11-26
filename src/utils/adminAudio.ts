import type { SkyMapLodState } from './skyMapLod.ts';
import {
  computePlanetLifecycleState,
  type PlanetLifecyclePhase,
  type SamsaraState,
  type SwordFormationStage,
  type SwordFormationState,
} from './samsaraChoreography.ts';
import type { FlyingSwordPose } from '../components/planetarium/swordFormation2D.ts';
import { soundFx } from './audio.ts';

export interface PlanetAudioSlotInput {
  id: number;
  orderFrac: number;
  stereoPan: number;
}

export interface AdminVfxTrackerInput {
  isAdmin: boolean;
  isVfxTimeLocked: boolean;
  hidden: boolean;
  timeSec: number;
  lod: SkyMapLodState;
  samsara: SamsaraState | null;
  swordState: SwordFormationState | null;
  swordPoses: readonly FlyingSwordPose[] | null;
  width: number;
  planetSlots: readonly PlanetAudioSlotInput[];
}

export type AdminAudioEvent =
  | { type: 'lod_annotations_fade' }
  | { type: 'blackhole_awaken' }
  | { type: 'sword_swarm_awaken' }
  | { type: 'sword_stream_whoosh'; pan: number; inFront: boolean }
  | { type: 'silhouette_manifest' }
  | { type: 'sword_array_lock' }
  | { type: 'ascension_reveal_burst' }
  | { type: 'samsara_turn_start'; direction: -1 | 1 }
  | { type: 'robe_morph_shimmer'; toYang: boolean }
  | { type: 'samsara_turn_lock'; topRealm: 'white' | 'dark' }
  | { type: 'planet_fracture_tick'; planetId: number; pan: number }
  | { type: 'planet_shatter_burst'; planetId: number; pan: number }
  | { type: 'planet_absorb_whoosh'; planetId: number; pan: number }
  | { type: 'planet_rebirth_chime'; planetId: number; pan: number }
  | { type: 'lightning_crackle'; pan: number }
  | { type: 'palm_seal_chime'; pan: number }
  | { type: 'ember_spark'; pan: number }
  | { type: 'petal_twinkle'; pan: number };

export interface AdminAmbientUpdateParams {
  isAdmin: boolean;
  hidden: boolean;
  lod: SkyMapLodState;
  samsara: SamsaraState | null;
  swordState: SwordFormationState | null;
  timeSec?: number;
}

const ADMIN_SFX_MUTED_KEY = 'aetheria_admin_sfx_muted';
const MAX_ACTIVE_VOICES = 18;
const HERO_VOICE_HARD_CAP = 22;

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  if (value <= min) return min;
  if (value >= max) return max;
  return value;
}

/**
 * Pure deterministic edge-crossing and micro-cadence tracker for Admin 2D VFX events.
 * Emits zero DOM/WebAudio side effects so it runs cleanly under Node `--test`.
 */
export class AdminVfxAudioTracker {
  private wasAnnotationsFaded = false;
  private wasBlackHoleAwake = false;
  private prevSwordStage: SwordFormationStage | null = null;
  private prevLeadSwordZ: number | null = null;
  private wasSilhouetteManifested = false;
  private hasArrayLockedThisRun = false;
  private wasAscensionRevealed = false;
  private prevIsTurning: boolean | null = null;
  private prevYangBlend: number | null = null;
  private prevPlanetPhases = new Map<number, PlanetLifecyclePhase>();
  private lastLightningSlot = -1;
  private lastLightningTimeSec: number | null = null;
  private lastPalmSealTimeSec: number | null = null;
  private palmSealRightNext = false;
  private lastEmberTimeSec: number | null = null;
  private lastPetalTimeSec: number | null = null;

  public reset(): void {
    this.wasAnnotationsFaded = false;
    this.wasBlackHoleAwake = false;
    this.resetSwordSequence();
    this.prevIsTurning = null;
    this.prevYangBlend = null;
    this.prevPlanetPhases.clear();
    this.lastLightningSlot = -1;
    this.lastLightningTimeSec = null;
    this.lastPalmSealTimeSec = null;
    this.palmSealRightNext = false;
    this.lastEmberTimeSec = null;
    this.lastPetalTimeSec = null;
  }

  private resetSwordSequence(): void {
    this.prevSwordStage = null;
    this.prevLeadSwordZ = null;
    this.wasSilhouetteManifested = false;
    this.hasArrayLockedThisRun = false;
    this.wasAscensionRevealed = false;
  }

  public step(input: AdminVfxTrackerInput): AdminAudioEvent[] {
    if (!input.isAdmin || input.hidden) {
      this.reset();
      return [];
    }

    if (input.isVfxTimeLocked) {
      return [];
    }

    const events: AdminAudioEvent[] = [];
    const { lod, samsara, swordState, swordPoses, timeSec, width, planetSlots } = input;

    // 1. Zoom LOD transitions
    if (!this.wasAnnotationsFaded && lod.annotationsAlpha < 0.55) {
      this.wasAnnotationsFaded = true;
      events.push({ type: 'lod_annotations_fade' });
    } else if (this.wasAnnotationsFaded && lod.annotationsAlpha >= 0.72) {
      this.wasAnnotationsFaded = false;
    }

    if (!this.wasBlackHoleAwake && lod.blackHoleCoreDarkness > 0.85) {
      this.wasBlackHoleAwake = true;
      events.push({ type: 'blackhole_awaken' });
    } else if (this.wasBlackHoleAwake && lod.blackHoleCoreDarkness < 0.65) {
      this.wasBlackHoleAwake = false;
    }

    // 2. 36-Sword Kiem Tran choreography edges
    if (!swordState || swordState.lodReveal <= 0.01) {
      this.resetSwordSequence();
    } else {
      if (swordState.stage === 'blackhole_orbit' && this.prevSwordStage !== 'blackhole_orbit') {
        events.push({ type: 'sword_swarm_awaken' });
      }

      if (
        (swordState.stage === 'blackhole_orbit' || swordState.stage === 'sovereign_coil') &&
        swordPoses &&
        swordPoses.length > 0
      ) {
        const leadSword = swordPoses[0];
        if (this.prevLeadSwordZ !== null) {
          const crossedFront = this.prevLeadSwordZ < 0 && leadSword.z >= 0;
          const crossedBack = this.prevLeadSwordZ >= 0 && leadSword.z < 0;
          if (crossedFront || crossedBack) {
            const pan = clamp(((leadSword.x / Math.max(1, width)) - 0.5) * 1.7, -0.85, 0.85);
            events.push({
              type: 'sword_stream_whoosh',
              pan,
              inFront: leadSword.z >= 0,
            });
          }
        }
        this.prevLeadSwordZ = leadSword.z;
      } else {
        this.prevLeadSwordZ = null;
      }

      if (
        !this.wasSilhouetteManifested &&
        swordState.silhouetteOpacity > 0.55 &&
        swordState.trueFormReveal === 0
      ) {
        this.wasSilhouetteManifested = true;
        events.push({ type: 'silhouette_manifest' });
      }

      if (
        !this.hasArrayLockedThisRun &&
        (swordState.stage === 'array_expand' || swordState.stage === 'sword_halo')
      ) {
        this.hasArrayLockedThisRun = true;
        events.push({ type: 'sword_array_lock' });
      }

      if (!this.wasAscensionRevealed && swordState.trueFormReveal > 0.05) {
        this.wasAscensionRevealed = true;
        events.push({ type: 'ascension_reveal_burst' });
      }

      this.prevSwordStage = swordState.stage;
    }

    // 3. Samsara wheel turns, Yin/Yang robe morph & 12-planet destruction/rebirth
    // Gated while Taiji cloud wheel is hidden (samsaraOpacity <= 0.01) during pure #000000 silhouette
    const samsaraVisible = Boolean(samsara && (!swordState || swordState.samsaraOpacity > 0.01));
    if (samsara && samsaraVisible) {
      if (this.prevIsTurning !== null) {
        if (!this.prevIsTurning && samsara.isTurning) {
          events.push({
            type: 'samsara_turn_start',
            direction: samsara.turnDirection === -1 ? -1 : 1,
          });
        } else if (this.prevIsTurning && !samsara.isTurning) {
          events.push({
            type: 'samsara_turn_lock',
            topRealm: samsara.topRealm,
          });
        }
      }
      this.prevIsTurning = samsara.isTurning;

      if (this.prevYangBlend !== null) {
        if (this.prevYangBlend < 0.5 && samsara.yangBlend >= 0.5) {
          events.push({ type: 'robe_morph_shimmer', toYang: true });
        } else if (this.prevYangBlend >= 0.5 && samsara.yangBlend < 0.5) {
          events.push({ type: 'robe_morph_shimmer', toYang: false });
        }
      }
      this.prevYangBlend = samsara.yangBlend;

      for (let i = 0; i < planetSlots.length; i++) {
        const slot = planetSlots[i];
        const lifecycle = computePlanetLifecycleState(samsara, slot.orderFrac);
        const prevPhase = this.prevPlanetPhases.get(slot.id);
        if (prevPhase !== undefined && prevPhase !== lifecycle.phase) {
          if (lifecycle.phase === 'fracturing') {
            events.push({
              type: 'planet_fracture_tick',
              planetId: slot.id,
              pan: clamp(slot.stereoPan, -0.85, 0.85),
            });
          } else if (lifecycle.phase === 'shattering') {
            events.push({
              type: 'planet_shatter_burst',
              planetId: slot.id,
              pan: clamp(slot.stereoPan, -0.85, 0.85),
            });
          } else if (lifecycle.phase === 'absorbing') {
            events.push({
              type: 'planet_absorb_whoosh',
              planetId: slot.id,
              pan: clamp(slot.stereoPan, -0.85, 0.85),
            });
          } else if (lifecycle.phase === 'reborn') {
            events.push({
              type: 'planet_rebirth_chime',
              planetId: slot.id,
              pan: clamp(slot.stereoPan, -0.85, 0.85),
            });
          }
        }
        this.prevPlanetPhases.set(slot.id, lifecycle.phase);
      }
    } else {
      this.prevIsTurning = null;
      this.prevYangBlend = null;
      this.prevPlanetPhases.clear();
    }

    // 4. Micro-detail cadence (deterministic & throttled)
    const trueFormReveal = swordState?.trueFormReveal ?? 0;
    const samsaraOpacity = swordState?.samsaraOpacity ?? 1;
    if (samsaraOpacity > 0.01 && trueFormReveal > 0.4) {
      const lightningSlot = Math.floor(timeSec * 7.5);
      if (
        lightningSlot !== this.lastLightningSlot &&
        (this.lastLightningTimeSec === null ||
          timeSec < this.lastLightningTimeSec ||
          timeSec - this.lastLightningTimeSec >= 0.9 - 1e-6)
      ) {
        this.lastLightningSlot = lightningSlot;
        this.lastLightningTimeSec = timeSec;
        events.push({
          type: 'lightning_crackle',
          pan: clamp(Math.sin(lightningSlot * 1.93) * 0.72, -0.85, 0.85),
        });
      }

      if (
        this.lastPalmSealTimeSec === null ||
        timeSec < this.lastPalmSealTimeSec ||
        timeSec - this.lastPalmSealTimeSec >= 2.4 - 1e-6
      ) {
        this.lastPalmSealTimeSec = timeSec;
        const pan = this.palmSealRightNext ? 0.55 : -0.55;
        this.palmSealRightNext = !this.palmSealRightNext;
        events.push({ type: 'palm_seal_chime', pan });
      }
    }

    if (
      lod.blackHoleCoronaAlpha > 0.35 &&
      (this.lastEmberTimeSec === null ||
        timeSec < this.lastEmberTimeSec ||
        timeSec - this.lastEmberTimeSec >= 0.65 - 1e-6)
    ) {
      this.lastEmberTimeSec = timeSec;
      events.push({
        type: 'ember_spark',
        pan: clamp(Math.sin(timeSec * 1.7) * 0.65, -0.85, 0.85),
      });
    }

    if (
      lod.cultivatorReveal > 0.5 &&
      (this.lastPetalTimeSec === null ||
        timeSec < this.lastPetalTimeSec ||
        timeSec - this.lastPetalTimeSec >= 1.3 - 1e-6)
    ) {
      this.lastPetalTimeSec = timeSec;
      events.push({
        type: 'petal_twinkle',
        pan: clamp(Math.cos(timeSec * 1.3) * 0.6, -0.85, 0.85),
      });
    }

    return events;
  }
}

interface AmbientNodes {
  bhSub1: OscillatorNode;
  bhSub2: OscillatorNode;
  bhNoiseSrc: AudioBufferSourceNode;
  bhNoiseFilter: BiquadFilterNode;
  bhGain: GainNode;
  windSrc: AudioBufferSourceNode;
  windBp1: BiquadFilterNode;
  windBp2: BiquadFilterNode;
  windGain: GainNode;
  haloOscs: OscillatorNode[];
  haloFilter: BiquadFilterNode;
  haloGain: GainNode;
}

const PENTATONIC_REBIRTH_HZ = [587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66];

function readInitialMuteFlag(): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(ADMIN_SFX_MUTED_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeMuteFlag(muted: boolean): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(ADMIN_SFX_MUTED_KEY, muted ? 'true' : 'false');
  } catch {
    // Ignore storage quota or private browsing errors
  }
}

/**
 * Exclusive Web Audio API synthesizer for Admin celestial VFX and UI cues.
 * Strictly gated to authenticated Supreme Admin accounts (`isAdminActive === true`).
 */
class AdminSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private convolver: ConvolverNode | null = null;
  private reverbSend: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private ambient: AmbientNodes | null = null;

  private isAdminActive = false;
  private isMuted = readInitialMuteFlag();
  private hasUserGesture = false;
  private activeVoices = 0;
  private cooldowns = new Map<string, number>();

  public setAdminActive(active: boolean): void {
    this.isAdminActive = active;
    if (!active) {
      this.stopAmbient();
    }
  }

  public isAdminEnabled(): boolean {
    return this.isAdminActive;
  }

  public isAdminMuted(): boolean {
    return this.isMuted;
  }

  public setAdminMuted(muted: boolean): void {
    this.isMuted = muted;
    writeMuteFlag(muted);
    if (muted) {
      this.stopAmbient();
    }
  }

  public toggleAdminMuted(): boolean {
    this.setAdminMuted(!this.isMuted);
    return this.isMuted;
  }

  private canPlay(): boolean {
    return this.isAdminActive && !this.isMuted && soundFx.getEnabled();
  }

  /**
   * Lazily creates/resumes AudioContext and bakes master bus, reverb impulse,
   * and noise buffer strictly on real user interaction.
   */
  public unlock(): boolean {
    if (typeof window === 'undefined' || !this.canPlay()) return false;

    if (!this.ctx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) return false;
      this.ctx = new AudioCtxClass();
      this.initAudioBus(this.ctx);
    }

    this.hasUserGesture = true;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return true;
  }

  private getReadyContext(): AudioContext | null {
    if (typeof window === 'undefined' || !this.canPlay()) return null;
    if (!this.hasUserGesture || !this.ctx || this.ctx.state !== 'running') {
      return null;
    }
    return this.ctx;
  }

  private initAudioBus(ctx: AudioContext): void {
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.82;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-14, ctx.currentTime);
    compressor.knee.setValueAtTime(18, ctx.currentTime);
    compressor.ratio.setValueAtTime(5, ctx.currentTime);
    compressor.attack.setValueAtTime(0.004, ctx.currentTime);
    compressor.release.setValueAtTime(0.22, ctx.currentTime);

    masterGain.connect(compressor);
    compressor.connect(ctx.destination);

    // Pre-bake 1.4s ethereal stereo reverb impulse
    const reverbLen = Math.floor(ctx.sampleRate * 1.4);
    const impulse = ctx.createBuffer(2, reverbLen, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < reverbLen; i++) {
        const decay = Math.pow(1 - i / reverbLen, 2.7);
        data[i] = (Math.random() * 2 - 1) * decay * 0.45;
      }
    }

    const convolver = ctx.createConvolver();
    convolver.buffer = impulse;
    const reverbSend = ctx.createGain();
    reverbSend.gain.value = 0.28;
    reverbSend.connect(convolver);
    convolver.connect(masterGain);

    // Pre-bake 1.5s reusable white noise buffer
    const noiseLen = Math.floor(ctx.sampleRate * 1.5);
    const noiseBuffer = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }

    this.masterGain = masterGain;
    this.compressor = compressor;
    this.convolver = convolver;
    this.reverbSend = reverbSend;
    this.noiseBuffer = noiseBuffer;
  }

  private acquireVoice(
    key: string,
    cooldownMs: number,
    durationSec: number,
    isHero = false
  ): boolean {
    const cap = isHero ? HERO_VOICE_HARD_CAP : MAX_ACTIVE_VOICES;
    if (this.activeVoices >= cap) return false;

    const nowMs =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    const lastMs = this.cooldowns.get(key) ?? -Infinity;
    if (cooldownMs > 0 && nowMs - lastMs < cooldownMs) return false;

    this.cooldowns.set(key, nowMs);
    this.activeVoices += 1;
    const releaseMs = Math.max(40, Math.ceil(durationSec * 1000) + 30);
    setTimeout(() => {
      this.activeVoices = Math.max(0, this.activeVoices - 1);
    }, releaseMs);
    return true;
  }

  private routeOutput(
    ctx: AudioContext,
    source: AudioNode,
    pan: number,
    wetAmount = 0.24
  ): void {
    const master = this.masterGain;
    if (!master) return;

    let dest: AudioNode = source;
    if (typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(clamp(pan, -0.85, 0.85), ctx.currentTime);
      source.connect(panner);
      dest = panner;
    }

    dest.connect(master);
    if (wetAmount > 0 && this.reverbSend) {
      const wet = ctx.createGain();
      wet.gain.setValueAtTime(wetAmount, ctx.currentTime);
      dest.connect(wet);
      wet.connect(this.reverbSend);
    }
  }

  private playTone(
    ctx: AudioContext,
    opts: {
      type: OscillatorType;
      freqStart: number;
      freqEnd?: number;
      duration: number;
      delay?: number;
      gain: number;
      attack?: number;
      pan?: number;
      wet?: number;
    }
  ): void {
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = opts.type;
    osc.frequency.setValueAtTime(Math.max(20, opts.freqStart), t0);
    if (opts.freqEnd && opts.freqEnd !== opts.freqStart) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.freqEnd), t0 + opts.duration);
    }

    const attack = opts.attack ?? Math.min(0.025, opts.duration * 0.25);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(opts.gain, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.duration);

    osc.connect(gain);
    this.routeOutput(ctx, gain, opts.pan ?? 0, opts.wet ?? 0.22);

    osc.start(t0);
    osc.stop(t0 + opts.duration + 0.02);
  }

  private playFilteredNoise(
    ctx: AudioContext,
    opts: {
      filterType: BiquadFilterType;
      freqStart: number;
      freqEnd?: number;
      q?: number;
      duration: number;
      delay?: number;
      gain: number;
      attack?: number;
      pan?: number;
      wet?: number;
    }
  ): void {
    if (!this.noiseBuffer) return;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = opts.filterType;
    filter.Q.setValueAtTime(opts.q ?? 1.2, t0);
    filter.frequency.setValueAtTime(Math.max(30, opts.freqStart), t0);
    if (opts.freqEnd && opts.freqEnd !== opts.freqStart) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(30, opts.freqEnd), t0 + opts.duration);
    }

    const gain = ctx.createGain();
    const attack = opts.attack ?? Math.min(0.04, opts.duration * 0.25);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(opts.gain, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.duration);

    src.connect(filter);
    filter.connect(gain);
    this.routeOutput(ctx, gain, opts.pan ?? 0, opts.wet ?? 0.2);

    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + opts.duration + 0.02);
  }

  // ===================== CONTINUOUS 3-LAYER AMBIENT =====================

  private ensureAmbientNodes(ctx: AudioContext): AmbientNodes | null {
    if (this.ambient) return this.ambient;
    if (!this.masterGain || !this.noiseBuffer) return null;

    const now = ctx.currentTime;

    // Layer A: Black Hole Sub-bass + Accretion Plasma Roar
    const bhSub1 = ctx.createOscillator();
    bhSub1.type = 'sine';
    bhSub1.frequency.setValueAtTime(42, now);

    const bhSub2 = ctx.createOscillator();
    bhSub2.type = 'triangle';
    bhSub2.frequency.setValueAtTime(63, now);

    const bhNoiseSrc = ctx.createBufferSource();
    bhNoiseSrc.buffer = this.noiseBuffer;
    bhNoiseSrc.loop = true;

    const bhNoiseFilter = ctx.createBiquadFilter();
    bhNoiseFilter.type = 'bandpass';
    bhNoiseFilter.frequency.setValueAtTime(210, now);
    bhNoiseFilter.Q.setValueAtTime(1.4, now);

    const bhGain = ctx.createGain();
    bhGain.gain.setValueAtTime(0.0001, now);

    const bhSubGain = ctx.createGain();
    bhSubGain.gain.setValueAtTime(0.55, now);
    const bhNoiseGain = ctx.createGain();
    bhNoiseGain.gain.setValueAtTime(0.28, now);

    bhSub1.connect(bhSubGain);
    bhSub2.connect(bhSubGain);
    bhSubGain.connect(bhGain);
    bhNoiseSrc.connect(bhNoiseFilter);
    bhNoiseFilter.connect(bhNoiseGain);
    bhNoiseGain.connect(bhGain);
    bhGain.connect(this.masterGain);

    bhSub1.start(now);
    bhSub2.start(now);
    bhNoiseSrc.start(now);

    // Layer B: Swirling Taiji Cloud Wind (dual bandpass)
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = this.noiseBuffer;
    windSrc.loop = true;

    const windBp1 = ctx.createBiquadFilter();
    windBp1.type = 'bandpass';
    windBp1.frequency.setValueAtTime(290, now);
    windBp1.Q.setValueAtTime(2.2, now);

    const windBp2 = ctx.createBiquadFilter();
    windBp2.type = 'bandpass';
    windBp2.frequency.setValueAtTime(640, now);
    windBp2.Q.setValueAtTime(2.6, now);

    const windGain = ctx.createGain();
    windGain.gain.setValueAtTime(0.0001, now);

    windSrc.connect(windBp1);
    windSrc.connect(windBp2);
    windBp1.connect(windGain);
    windBp2.connect(windGain);
    windGain.connect(this.masterGain);
    if (this.reverbSend) {
      windGain.connect(this.reverbSend);
    }
    windSrc.start(now, 0.35);

    // Layer C: Crystalline Sword-Qi Resonance + Yin/Yang Dao Pentatonic Pad (D4, A4, E5, A5)
    const haloFreqs = [293.66, 440.0, 659.25, 880.0];
    const haloFilter = ctx.createBiquadFilter();
    haloFilter.type = 'lowpass';
    haloFilter.frequency.setValueAtTime(520, now);
    haloFilter.Q.setValueAtTime(1.1, now);

    const haloGain = ctx.createGain();
    haloGain.gain.setValueAtTime(0.0001, now);

    const haloOscs = haloFreqs.map((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = idx < 2 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      const voiceGain = ctx.createGain();
      voiceGain.gain.setValueAtTime(idx === 0 ? 0.34 : idx === 1 ? 0.28 : 0.14, now);
      osc.connect(voiceGain);
      voiceGain.connect(haloFilter);
      osc.start(now);
      return osc;
    });

    haloFilter.connect(haloGain);
    haloGain.connect(this.masterGain);
    if (this.reverbSend) {
      haloGain.connect(this.reverbSend);
    }

    this.ambient = {
      bhSub1,
      bhSub2,
      bhNoiseSrc,
      bhNoiseFilter,
      bhGain,
      windSrc,
      windBp1,
      windBp2,
      windGain,
      haloOscs,
      haloFilter,
      haloGain,
    };
    return this.ambient;
  }

  public updateAmbient(params: AdminAmbientUpdateParams): void {
    if (!this.canPlay() || params.hidden || !params.isAdmin) {
      this.fadeOutAmbient();
      return;
    }

    const ctx = this.getReadyContext();
    if (!ctx) return;

    const nodes = this.ensureAmbientNodes(ctx);
    if (!nodes) return;

    const now = ctx.currentTime;
    const t = params.timeSec ?? now;
    const { lod, samsara, swordState } = params;

    // Layer A: Black Hole sub-bass & accretion roar
    const bhLevel = clamp(
      lod.blackHoleCoronaAlpha * 0.032 + lod.blackHoleDiskForeground * 0.045,
      0,
      0.085
    );
    nodes.bhGain.gain.setTargetAtTime(Math.max(0.0001, bhLevel), now, 0.14);
    nodes.bhNoiseFilter.frequency.setTargetAtTime(
      180 + lod.blackHoleDiskForeground * 240,
      now,
      0.16
    );

    // Layer B: Taiji Cloud Wind (silent while silhouette hides Taiji wheel; surges on 180deg turns)
    const samsaraOpacity = swordState ? swordState.samsaraOpacity : 0;
    const turnBoost = samsara?.isTurning
      ? 1 + Math.sin(samsara.turnProgress * Math.PI) * 1.15
      : 1;
    const windLevel = clamp(lod.cultivatorReveal * samsaraOpacity * 0.022 * turnBoost, 0, 0.06);
    nodes.windGain.gain.setTargetAtTime(Math.max(0.0001, windLevel), now, 0.14);
    nodes.windBp1.frequency.setTargetAtTime(
      260 + Math.sin(t * 0.8) * 55 + (samsara?.isTurning ? 120 : 0),
      now,
      0.15
    );
    nodes.windBp2.frequency.setTargetAtTime(
      590 + Math.cos(t * 0.65) * 95 + (samsara?.isTurning ? 210 : 0),
      now,
      0.15
    );

    // Layer C: Sword-Qi Resonance + Yin/Yang Dao Pentatonic Pad
    const reveal = swordState?.trueFormReveal ?? 0;
    const arrayPresence = swordState?.arrayRingOpacity ?? 0;
    const swordQiBoost = 0.28 * arrayPresence + 0.72 * reveal;
    const yangBlend = samsara?.yangBlend ?? 0;
    const haloLevel = clamp(swordQiBoost * lod.cultivatorReveal * 0.036, 0, 0.045);
    nodes.haloGain.gain.setTargetAtTime(Math.max(0.0001, haloLevel), now, 0.18);
    nodes.haloFilter.frequency.setTargetAtTime(480 + yangBlend * 1170, now, 0.22);
  }

  private fadeOutAmbient(): void {
    if (!this.ambient || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.ambient.bhGain.gain.setTargetAtTime(0.0001, now, 0.08);
    this.ambient.windGain.gain.setTargetAtTime(0.0001, now, 0.08);
    this.ambient.haloGain.gain.setTargetAtTime(0.0001, now, 0.08);
  }

  public stopAmbient(): void {
    if (!this.ambient) return;
    const nodes = this.ambient;
    this.ambient = null;

    try {
      nodes.bhSub1.stop();
      nodes.bhSub2.stop();
      nodes.bhNoiseSrc.stop();
      nodes.windSrc.stop();
      for (const osc of nodes.haloOscs) {
        osc.stop();
      }
      nodes.bhGain.disconnect();
      nodes.windGain.disconnect();
      nodes.haloGain.disconnect();
    } catch {
      // Safe cleanup even if context already closed
    }
  }

  // ===================== VFX EVENT SYNTHESIZERS =====================

  public dispatchVfxEvents(events: readonly AdminAudioEvent[]): void {
    if (events.length === 0) return;
    const ctx = this.getReadyContext();
    if (!ctx) return;

    for (let i = 0; i < events.length; i++) {
      this.playVfxEvent(ctx, events[i]);
    }
  }

  private playVfxEvent(ctx: AudioContext, event: AdminAudioEvent): void {
    switch (event.type) {
      case 'lod_annotations_fade':
        if (!this.acquireVoice('lod_fade', 250, 0.35)) return;
        this.playTone(ctx, {
          type: 'sine',
          freqStart: 1046.5,
          freqEnd: 523.25,
          duration: 0.32,
          gain: 0.038,
          wet: 0.4,
        });
        break;

      case 'blackhole_awaken':
        if (!this.acquireVoice('bh_awaken', 450, 0.75, true)) return;
        this.playTone(ctx, {
          type: 'sine',
          freqStart: 118,
          freqEnd: 38,
          duration: 0.68,
          gain: 0.14,
          wet: 0.35,
        });
        this.playFilteredNoise(ctx, {
          filterType: 'bandpass',
          freqStart: 620,
          freqEnd: 140,
          q: 2.0,
          duration: 0.55,
          gain: 0.06,
          wet: 0.4,
        });
        break;

      case 'sword_swarm_awaken':
        if (!this.acquireVoice('sword_awaken', 650, 1.05, true)) return;
        // Shimmering metallic 36-blade unsheathe resonance + crystalline sword-hum
        this.playTone(ctx, {
          type: 'triangle',
          freqStart: 220,
          freqEnd: 440,
          duration: 0.78,
          gain: 0.055,
          attack: 0.04,
          wet: 0.5,
        });
        this.playTone(ctx, {
          type: 'sine',
          freqStart: 1760,
          freqEnd: 2349.32,
          duration: 0.85,
          delay: 0.03,
          gain: 0.036,
          attack: 0.015,
          wet: 0.6,
        });
        this.playTone(ctx, {
          type: 'sine',
          freqStart: 2489.02,
          freqEnd: 3135.96,
          duration: 0.72,
          delay: 0.07,
          gain: 0.024,
          attack: 0.01,
          wet: 0.62,
        });
        this.playFilteredNoise(ctx, {
          filterType: 'bandpass',
          freqStart: 1400,
          freqEnd: 4200,
          q: 3.4,
          duration: 0.62,
          gain: 0.052,
          attack: 0.02,
          wet: 0.45,
        });
        break;

      case 'sword_stream_whoosh':
        if (!this.acquireVoice('sword_whoosh', 190, 0.36)) return;
        // Stereo-panned metallic blade-Qi air slash
        this.playFilteredNoise(ctx, {
          filterType: 'bandpass',
          freqStart: event.inFront ? 520 : 340,
          freqEnd: event.inFront ? 1640 : 880,
          q: event.inFront ? 2.8 : 2.1,
          duration: 0.32,
          gain: event.inFront ? 0.052 : 0.03,
          attack: 0.015,
          pan: event.pan,
          wet: 0.36,
        });
        this.playTone(ctx, {
          type: 'sine',
          freqStart: event.inFront ? 1567.98 : 1174.66,
          freqEnd: event.inFront ? 1174.66 : 880,
          duration: 0.24,
          gain: event.inFront ? 0.022 : 0.012,
          attack: 0.008,
          pan: event.pan,
          wet: 0.4,
        });
        break;

      case 'silhouette_manifest':
        if (!this.acquireVoice('silhouette', 500, 0.85, true)) return;
        this.playTone(ctx, {
          type: 'sine',
          freqStart: 146.83,
          duration: 0.8,
          gain: 0.065,
          attack: 0.12,
          wet: 0.5,
        });
        this.playTone(ctx, {
          type: 'sine',
          freqStart: 220,
          duration: 0.75,
          delay: 0.08,
          gain: 0.042,
          attack: 0.1,
          wet: 0.55,
        });
        break;

      case 'sword_array_lock':
        if (!this.acquireVoice('sword_array_lock', 850, 1.45, true)) return;
        // Staggered 6-step crisp metallic blade-lock harmonic chime cascade + gold anchor
        this.playTone(ctx, {
          type: 'sine',
          freqStart: 146.83,
          freqEnd: 110,
          duration: 0.9,
          gain: 0.088,
          attack: 0.015,
          wet: 0.52,
        });
        [587.33, 783.99, 987.77, 1174.66, 1567.98, 2349.32].forEach((freq, idx) => {
          this.playTone(ctx, {
            type: idx % 2 === 0 ? 'sine' : 'triangle',
            freqStart: freq,
            duration: 0.72 - idx * 0.05,
            delay: idx * 0.045,
            gain: 0.032 - idx * 0.003,
            attack: 0.006,
            pan: (idx - 2.5) * 0.22,
            wet: 0.6,
          });
        });
        break;

      case 'ascension_reveal_burst':
        if (!this.acquireVoice('ascension_burst', 900, 1.4, true)) return;
        // White-gold thunderclap + 36-sword radial metallic chime bloom
        this.playTone(ctx, {
          type: 'sine',
          freqStart: 95,
          freqEnd: 38,
          duration: 0.72,
          gain: 0.125,
          attack: 0.008,
          wet: 0.45,
        });
        this.playFilteredNoise(ctx, {
          filterType: 'highpass',
          freqStart: 1200,
          freqEnd: 3800,
          q: 1.4,
          duration: 0.62,
          gain: 0.068,
          attack: 0.005,
          wet: 0.5,
        });
        [440, 587.33, 880, 1318.51, 1760].forEach((freq, idx) => {
          this.playTone(ctx, {
            type: idx < 2 ? 'triangle' : 'sine',
            freqStart: freq,
            duration: 1.15 - idx * 0.1,
            delay: idx * 0.032,
            gain: 0.048 - idx * 0.006,
            attack: 0.008,
            wet: 0.62,
          });
        });
        break;

      case 'samsara_turn_start':
        if (!this.acquireVoice('samsara_turn', 500, 1.1, true)) return;
        this.playTone(ctx, {
          type: 'sine',
          freqStart: 78,
          freqEnd: 52,
          duration: 0.9,
          gain: 0.085,
          pan: -0.35 * event.direction,
          wet: 0.4,
        });
        this.playFilteredNoise(ctx, {
          filterType: 'bandpass',
          freqStart: 220,
          freqEnd: 680,
          q: 1.6,
          duration: 0.95,
          gain: 0.055,
          pan: 0.35 * event.direction,
          wet: 0.45,
        });
        break;

      case 'robe_morph_shimmer':
        if (!this.acquireVoice('robe_morph', 350, 0.75)) return;
        const scale = event.toYang
          ? [587.33, 659.25, 880, 987.77, 1174.66]
          : [880, 659.25, 587.33, 440];
        scale.forEach((freq, idx) => {
          this.playTone(ctx, {
            type: 'sine',
            freqStart: freq,
            duration: 0.35,
            delay: idx * 0.055,
            gain: 0.026,
            wet: 0.55,
          });
        });
        break;

      case 'samsara_turn_lock':
        if (!this.acquireVoice('samsara_lock', 500, 0.65, true)) return;
        this.playTone(ctx, {
          type: 'sine',
          freqStart: 92,
          freqEnd: 46,
          duration: 0.36,
          gain: 0.09,
          wet: 0.3,
        });
        this.playTone(ctx, {
          type: 'sine',
          freqStart: event.topRealm === 'dark' ? 880 : 1046.5,
          duration: 0.55,
          delay: 0.02,
          gain: 0.036,
          wet: 0.55,
        });
        break;

      case 'planet_fracture_tick':
        if (!this.acquireVoice(`pf_${event.planetId}`, 75, 0.12)) return;
        this.playTone(ctx, {
          type: 'triangle',
          freqStart: 1850,
          freqEnd: 940,
          duration: 0.08,
          gain: 0.024,
          attack: 0.003,
          pan: event.pan,
          wet: 0.25,
        });
        break;

      case 'planet_shatter_burst':
        if (!this.acquireVoice('planet_shatter', 60, 0.3)) return;
        this.playFilteredNoise(ctx, {
          filterType: 'bandpass',
          freqStart: 1600,
          freqEnd: 480,
          q: 1.5,
          duration: 0.22,
          gain: 0.042,
          attack: 0.004,
          pan: event.pan,
          wet: 0.32,
        });
        this.playTone(ctx, {
          type: 'sine',
          freqStart: 1320 + (event.planetId % 4) * 140,
          freqEnd: 660,
          duration: 0.2,
          gain: 0.022,
          attack: 0.004,
          pan: event.pan,
          wet: 0.4,
        });
        break;

      case 'planet_absorb_whoosh':
        if (!this.acquireVoice('planet_absorb', 65, 0.32)) return;
        this.playTone(ctx, {
          type: 'sine',
          freqStart: 240,
          freqEnd: 1120,
          duration: 0.28,
          gain: 0.024,
          pan: event.pan,
          wet: 0.35,
        });
        break;

      case 'planet_rebirth_chime':
        if (!this.acquireVoice('planet_rebirth', 65, 0.5)) return;
        this.playTone(ctx, {
          type: 'sine',
          freqStart: PENTATONIC_REBIRTH_HZ[event.planetId % PENTATONIC_REBIRTH_HZ.length],
          duration: 0.46,
          gain: 0.032,
          attack: 0.008,
          pan: event.pan,
          wet: 0.55,
        });
        break;

      case 'lightning_crackle':
        if (!this.acquireVoice('lightning', 550, 0.24)) return;
        this.playFilteredNoise(ctx, {
          filterType: 'highpass',
          freqStart: 3100,
          q: 1.8,
          duration: 0.09,
          gain: 0.042,
          attack: 0.002,
          pan: event.pan,
          wet: 0.3,
        });
        this.playFilteredNoise(ctx, {
          filterType: 'highpass',
          freqStart: 3800,
          q: 2.0,
          duration: 0.07,
          delay: 0.075,
          gain: 0.032,
          attack: 0.002,
          pan: event.pan,
          wet: 0.3,
        });
        break;

      case 'palm_seal_chime':
        if (!this.acquireVoice('palm_seal', 900, 0.6)) return;
        this.playTone(ctx, {
          type: 'sine',
          freqStart: 783.99,
          duration: 0.52,
          gain: 0.028,
          pan: event.pan,
          wet: 0.55,
        });
        this.playTone(ctx, {
          type: 'sine',
          freqStart: 1174.66,
          duration: 0.42,
          delay: 0.03,
          gain: 0.018,
          pan: event.pan,
          wet: 0.55,
        });
        break;

      case 'ember_spark':
        if (!this.acquireVoice('ember', 450, 0.14)) return;
        this.playTone(ctx, {
          type: 'sine',
          freqStart: 2200 + ((Math.abs(event.pan) * 900) % 900),
          freqEnd: 1600,
          duration: 0.09,
          gain: 0.012,
          attack: 0.003,
          pan: event.pan,
          wet: 0.35,
        });
        break;

      case 'petal_twinkle':
        if (!this.acquireVoice('petal', 800, 0.35)) return;
        this.playTone(ctx, {
          type: 'sine',
          freqStart: event.pan >= 0 ? 1760 : 1318.5,
          duration: 0.3,
          gain: 0.015,
          attack: 0.008,
          pan: event.pan,
          wet: 0.5,
        });
        break;
    }
  }

  // ===================== EXCLUSIVE ADMIN UI SFX =====================

  public playAdminEntranceReveal(): void {
    this.unlock();
    const ctx = this.getReadyContext();
    if (!ctx || !this.acquireVoice('ui_entrance_reveal', 200, 1.35, true)) return;

    this.playTone(ctx, {
      type: 'sine',
      freqStart: 110,
      freqEnd: 55,
      duration: 0.9,
      gain: 0.13,
      wet: 0.45,
    });
    [293.66, 440, 587.33, 880].forEach((freq, idx) => {
      this.playTone(ctx, {
        type: idx === 0 ? 'triangle' : 'sine',
        freqStart: freq,
        duration: 1.05,
        delay: idx * 0.07,
        gain: 0.055 - idx * 0.007,
        wet: 0.55,
      });
    });
  }

  public playAdminEntranceFly(): void {
    const ctx = this.getReadyContext();
    if (!ctx || !this.acquireVoice('ui_entrance_fly', 200, 0.75, true)) return;

    this.playTone(ctx, {
      type: 'sine',
      freqStart: 360,
      freqEnd: 1440,
      duration: 0.62,
      gain: 0.055,
      wet: 0.45,
    });
    this.playFilteredNoise(ctx, {
      filterType: 'bandpass',
      freqStart: 340,
      freqEnd: 1850,
      q: 2.0,
      duration: 0.6,
      gain: 0.05,
      wet: 0.4,
    });
  }

  public playAdminEntranceLand(): void {
    const ctx = this.getReadyContext();
    if (!ctx || !this.acquireVoice('ui_entrance_land', 150, 0.7, true)) return;

    this.playTone(ctx, {
      type: 'sine',
      freqStart: 146.83,
      freqEnd: 73.42,
      duration: 0.34,
      gain: 0.11,
      wet: 0.35,
    });
    this.playTone(ctx, {
      type: 'sine',
      freqStart: 880,
      duration: 0.55,
      gain: 0.05,
      wet: 0.6,
    });
    this.playTone(ctx, {
      type: 'sine',
      freqStart: 1318.5,
      duration: 0.5,
      delay: 0.03,
      gain: 0.04,
      wet: 0.6,
    });
  }

  public playAdminBadgeHover(): void {
    const ctx = this.getReadyContext();
    if (!ctx || !this.acquireVoice('ui_badge_hover', 160, 0.22)) return;

    this.playTone(ctx, {
      type: 'sine',
      freqStart: 1318.5,
      freqEnd: 1760,
      duration: 0.18,
      gain: 0.022,
      attack: 0.008,
      wet: 0.45,
    });
  }

  public playAdminBadgeClick(): void {
    this.unlock();
    const ctx = this.getReadyContext();
    if (!ctx || !this.acquireVoice('ui_badge_click', 100, 0.35, true)) return;

    this.playTone(ctx, {
      type: 'triangle',
      freqStart: 587.33,
      duration: 0.24,
      gain: 0.048,
      wet: 0.45,
    });
    this.playTone(ctx, {
      type: 'sine',
      freqStart: 1174.66,
      duration: 0.3,
      delay: 0.025,
      gain: 0.035,
      wet: 0.5,
    });
  }

  public playAdminUiHover(): void {
    const ctx = this.getReadyContext();
    if (!ctx || !this.acquireVoice('ui_hover', 90, 0.08)) return;

    this.playTone(ctx, {
      type: 'sine',
      freqStart: 1046.5,
      freqEnd: 1244.5,
      duration: 0.06,
      gain: 0.014,
      attack: 0.004,
      wet: 0.25,
    });
  }

  public playAdminUiClick(): void {
    this.unlock();
    const ctx = this.getReadyContext();
    if (!ctx || !this.acquireVoice('ui_click', 55, 0.15)) return;

    this.playTone(ctx, {
      type: 'triangle',
      freqStart: 783.99,
      freqEnd: 1046.5,
      duration: 0.1,
      gain: 0.036,
      attack: 0.004,
      wet: 0.35,
    });
  }

  public playAdminZoomTick(zoom: number, isZoomingIn: boolean): void {
    const ctx = this.getReadyContext();
    if (!ctx || !this.acquireVoice('ui_zoom_tick', 55, 0.09)) return;

    const depth = clamp((1.2 - zoom) / 1.06, 0, 1);
    const baseFreq = 260 + depth * 640;
    this.playTone(ctx, {
      type: 'sine',
      freqStart: baseFreq,
      freqEnd: isZoomingIn ? baseFreq * 1.14 : baseFreq * 0.88,
      duration: 0.065,
      gain: 0.018,
      attack: 0.003,
      wet: 0.25,
    });
  }

  public playAdminQuickZoomPortal(enteringRefining: boolean): void {
    this.unlock();
    const ctx = this.getReadyContext();
    if (!ctx || !this.acquireVoice('ui_portal', 220, 0.7, true)) return;

    this.playTone(ctx, {
      type: 'sine',
      freqStart: enteringRefining ? 640 : 120,
      freqEnd: enteringRefining ? 72 : 880,
      duration: 0.62,
      gain: 0.085,
      wet: 0.5,
    });
    this.playFilteredNoise(ctx, {
      filterType: 'bandpass',
      freqStart: enteringRefining ? 1200 : 280,
      freqEnd: enteringRefining ? 180 : 1600,
      q: 1.7,
      duration: 0.55,
      gain: 0.055,
      wet: 0.45,
    });
  }

  public playAdminPanStart(): void {
    this.unlock();
    const ctx = this.getReadyContext();
    if (!ctx || !this.acquireVoice('ui_pan_start', 120, 0.08)) return;

    this.playTone(ctx, {
      type: 'sine',
      freqStart: 420,
      freqEnd: 540,
      duration: 0.055,
      gain: 0.016,
      attack: 0.003,
      wet: 0.2,
    });
  }

  public playAdminPanEnd(): void {
    const ctx = this.getReadyContext();
    if (!ctx || !this.acquireVoice('ui_pan_end', 120, 0.09)) return;

    this.playTone(ctx, {
      type: 'sine',
      freqStart: 540,
      freqEnd: 380,
      duration: 0.065,
      gain: 0.014,
      attack: 0.003,
      wet: 0.25,
    });
  }

  public playAdminStarSelect(): void {
    this.unlock();
    const ctx = this.getReadyContext();
    if (!ctx || !this.acquireVoice('ui_star_select', 70, 0.5, true)) return;

    [587.33, 880, 1174.66, 1760].forEach((freq, idx) => {
      this.playTone(ctx, {
        type: 'sine',
        freqStart: freq,
        freqEnd: freq * 1.03,
        duration: 0.42 - idx * 0.04,
        delay: idx * 0.02,
        gain: 0.045 - idx * 0.007,
        attack: 0.01,
        wet: 0.55,
      });
    });
  }
}

export const adminSoundFx = new AdminSoundEngine();
