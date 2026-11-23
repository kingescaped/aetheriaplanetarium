/**
 * Aetheria Planetarium - Web Audio API Sound FX Engine
 * Pure synthesized sound effects: Zero external assets, 0 latency, 100% offline & PWA ready.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isEnabled: boolean = true;

  constructor() {
    // AudioContext will be lazily initialized on first user interaction
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  public getEnabled(): boolean {
    return this.isEnabled;
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  /**
   * Star Selection: Celestial crystal harmonic chime
   */
  public playStarSelect() {
    if (!this.isEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Primary crystal sine
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now); // A5
      osc1.frequency.exponentialRampToValueAtTime(1760, now + 0.12); // Sweep up to A6

      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.linearRampToValueAtTime(0.08, now + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      // Harmonic resonance
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1320, now); // E6
      osc2.frequency.exponentialRampToValueAtTime(2640, now + 0.12);

      gain2.gain.setValueAtTime(0.001, now);
      gain2.gain.linearRampToValueAtTime(0.04, now + 0.02);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.36);
      osc2.stop(now + 0.41);
    } catch {
      // Audio playback safety
    }
  }

  /**
   * Target & Ray-Trace in 3D Dome: Futuristic sci-fi laser telemetry lock & energy burst
   */
  public playTargetRayTrace() {
    if (!this.isEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Sub-bass thump
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(160, now);
      subOsc.frequency.exponentialRampToValueAtTime(45, now + 0.25);

      subGain.gain.setValueAtTime(0.12, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 0.32);

      // Sci-fi high-speed chirp / laser sweep
      const laserOsc = ctx.createOscillator();
      const laserGain = ctx.createGain();
      laserOsc.type = 'triangle';
      laserOsc.frequency.setValueAtTime(440, now + 0.04);
      laserOsc.frequency.exponentialRampToValueAtTime(2400, now + 0.18);
      laserOsc.frequency.exponentialRampToValueAtTime(880, now + 0.32);

      laserGain.gain.setValueAtTime(0.001, now + 0.04);
      laserGain.gain.linearRampToValueAtTime(0.09, now + 0.08);
      laserGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

      laserOsc.connect(laserGain);
      laserGain.connect(ctx.destination);
      laserOsc.start(now + 0.04);
      laserOsc.stop(now + 0.4);

      // Resonant ping ringout
      const pingOsc = ctx.createOscillator();
      const pingGain = ctx.createGain();
      pingOsc.type = 'sine';
      pingOsc.frequency.setValueAtTime(1760, now + 0.15);

      pingGain.gain.setValueAtTime(0.001, now + 0.15);
      pingGain.gain.linearRampToValueAtTime(0.06, now + 0.17);
      pingGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

      pingOsc.connect(pingGain);
      pingGain.connect(ctx.destination);
      pingOsc.start(now + 0.15);
      pingOsc.stop(now + 0.56);
    } catch {
      // Audio playback safety
    }
  }

  /**
   * UI Tab Navigation / Pill Tap: Soft tactile iOS-style haptic click
   */
  public playTabClick() {
    if (!this.isEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.04);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch {
      // Audio playback safety
    }
  }

  /**
   * Setting Switch / Toggle: Delicate mechanical optical click
   */
  public playToggle(state?: boolean) {
    if (!this.isEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      const baseFreq = state ? 980 : 750;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(state ? 1400 : 500, now + 0.035);

      gain.gain.setValueAtTime(0.035, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.045);
    } catch {
      // Audio playback safety
    }
  }

  /**
   * Modal Open / Sheet Expansion: Smooth cosmic whoosh
   */
  public playModalTransition() {
    if (!this.isEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(640, now + 0.1);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.03, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch {
      // Audio playback safety
    }
  }
}

export const soundFx = new SoundEngine();
