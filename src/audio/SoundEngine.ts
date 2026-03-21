const MUTE_KEY = 'dropster-muted';

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private _muted: boolean;
  private softDropLastMs = 0;
  private cachedVoice: SpeechSynthesisVoice | null = null;
  private voiceResolved = false;
  private delayNode: DelayNode | null = null;
  private feedbackNode: GainNode | null = null;
  private compNode: DynamicsCompressorNode | null = null;

  constructor() {
    this._muted = localStorage.getItem(MUTE_KEY) === 'true';
  }

  get muted(): boolean { return this._muted; }
  set muted(val: boolean) {
    this._muted = val;
    localStorage.setItem(MUTE_KEY, String(val));
  }

  toggleMute(): void { this.muted = !this._muted; }

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.compNode = this.ctx.createDynamicsCompressor();
      this.compNode.connect(this.ctx.destination);
      this.delayNode = this.ctx.createDelay(0.2);
      this.delayNode.delayTime.value = 0.08;
      this.feedbackNode = this.ctx.createGain();
      this.feedbackNode.gain.value = 0.3;
      this.delayNode.connect(this.feedbackNode);
      this.feedbackNode.connect(this.delayNode);
      this.delayNode.connect(this.compNode);
    }
    return this.ctx;
  }

  private layeredOsc(type: OscillatorType, freq: number, gain: number, duration: number, opts?: {
    detune?: number; layers?: number; freqEnd?: number; filterFreq?: number; reverb?: boolean;
  }): void {
    const ctx = this.getCtx();
    const t = ctx.currentTime;
    const detune = opts?.detune ?? 6;
    const layers = opts?.layers ?? 2;
    const filterFreq = opts?.filterFreq ?? 3000;
    const useReverb = opts?.reverb ?? false;

    const dest = useReverb ? this.delayNode! : this.compNode!;
    const mix = ctx.createGain();
    mix.gain.setValueAtTime(gain, t);
    mix.gain.setValueAtTime(gain, t + 0.005);
    mix.gain.exponentialRampToValueAtTime(0.001, t + duration);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    filter.connect(mix);
    mix.connect(this.compNode!);
    if (useReverb) mix.connect(dest);

    for (let i = 0; i < layers; i++) {
      const osc = ctx.createOscillator();
      osc.type = type;
      const spread = layers === 1 ? 0 : (i / (layers - 1) * 2 - 1) * detune;
      osc.frequency.setValueAtTime(freq, t);
      osc.detune.setValueAtTime(spread, t);
      if (opts?.freqEnd !== undefined) osc.frequency.linearRampToValueAtTime(opts.freqEnd, t + duration);
      osc.connect(filter);
      osc.start(t);
      osc.stop(t + duration);
    }
  }

  private noise(gain: number, duration: number, filterFreq?: number, useReverb?: boolean): void {
    const ctx = this.getCtx();
    const t = ctx.currentTime;
    const bufSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);

    if (filterFreq) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = filterFreq;
      src.connect(f);
      f.connect(g);
    } else {
      src.connect(g);
    }
    g.connect(this.compNode!);
    if (useReverb) g.connect(this.delayNode!);
    src.start(t);
    src.stop(t + duration);
  }

  move(): void {
    if (this._muted) return;
    this.layeredOsc('square', 440, 0.08, 0.03, { filterFreq: 2000 });
  }

  rotate(): void {
    if (this._muted) return;
    this.layeredOsc('square', 500, 0.1, 0.05, { freqEnd: 800, filterFreq: 2500 });
  }

  hardDrop(): void {
    if (this._muted) return;
    this.layeredOsc('sawtooth', 80, 0.35, 0.15, {
      freqEnd: 40, detune: 15, layers: 3, filterFreq: 1200, reverb: true,
    });
    this.noise(0.12, 0.1, 800, true);
  }

  softDrop(): void {
    if (this._muted) return;
    const now = performance.now();
    if (now - this.softDropLastMs < 50) return;
    this.softDropLastMs = now;
    this.layeredOsc('square', 300, 0.05, 0.02, { filterFreq: 1500 });
  }

  lineClear(count: number): void {
    if (this._muted) return;

    // Explosion sound: bass impact sweep DOWN + heavy filtered noise burst
    // More lines = bigger explosion

    const dur = 0.3 + count * 0.15;
    const bassFreq = 120 + count * 20;
    const noiseGain = 0.1 + count * 0.05;
    const noiseDur = 0.15 + count * 0.08;

    // Bass impact: sweeps DOWN (explosion feel)
    this.layeredOsc('sawtooth', bassFreq, 0.4, dur, {
      freqEnd: 30, layers: 3, detune: 15, filterFreq: 600, reverb: true,
    });

    // Heavy noise burst (filtered low = rumble, not hiss)
    this.noise(noiseGain, noiseDur, 500 + count * 100, true);

    if (count >= 2) {
      // Second bass layer, slightly delayed for thickness
      this.layeredOsc('sawtooth', bassFreq * 0.7, 0.25, dur * 0.8, {
        freqEnd: 20, layers: 2, detune: 20, filterFreq: 400, reverb: true,
      });
    }

    if (count === 4) {
      // Tetris: massive explosion — extra sub-bass + longer noise + impact transient
      this.layeredOsc('sine', 60, 0.5, 0.6, {
        freqEnd: 20, layers: 2, detune: 8, filterFreq: 200,
      });
      this.noise(0.25, 0.4, 800, true);
      // Sharp transient click for attack
      this.layeredOsc('square', 1000, 0.3, 0.01, { filterFreq: 5000 });
    }
  }

  combo(comboCount: number): void {
    if (this._muted) return;
    const freq = 300 + Math.min(comboCount, 10) * 80;
    const layers = comboCount >= 5 ? 3 : 2;
    this.layeredOsc('square', freq, 0.18, 0.15, {
      freqEnd: freq * 1.25, layers, filterFreq: 2500, reverb: true,
    });
  }

  garbageReceived(): void {
    if (this._muted) return;
    this.layeredOsc('sawtooth', 60, 0.3, 0.25, {
      freqEnd: 30, detune: 12, layers: 3, filterFreq: 800,
    });
    this.noise(0.08, 0.15, 600);
  }

  gameOver(): void {
    if (this._muted) return;
    const ctx = this.getCtx();
    const t = ctx.currentTime;
    const notes = [440, 330, 220];
    notes.forEach((freq, i) => {
      const start = t + i * 0.15;
      for (let l = 0; l < 3; l++) {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, start);
        osc.detune.setValueAtTime((l - 1) * 8, start);
        const g = ctx.createGain();
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 2000;
        g.gain.setValueAtTime(0.2, start);
        g.gain.setValueAtTime(0.2, start + 0.005);
        g.gain.exponentialRampToValueAtTime(0.001, start + 1.2);
        osc.connect(f);
        f.connect(g);
        g.connect(this.compNode!);
        g.connect(this.delayNode!);
        osc.start(start);
        osc.stop(start + 1.2);
      }
    });
  }

  countdown(): void {
    if (this._muted) return;
    this.layeredOsc('square', 660, 0.2, 0.1, { filterFreq: 2000 });
  }

  countdownGo(): void {
    if (this._muted) return;
    this.layeredOsc('square', 1046, 0.25, 0.2, {
      freqEnd: 1320, layers: 3, detune: 10, filterFreq: 4000,
    });
  }

  announce(text: string, opts?: { pitch?: number; rate?: number }): void {
    if (this._muted) return;
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = opts?.pitch ?? 0.1;   // very low = robotic
    utterance.rate = opts?.rate ?? 0.9;     // slow and deliberate
    utterance.volume = 0.8;

    if (!this.voiceResolved) {
      const voices = window.speechSynthesis.getVoices();
      // Prefer a deep English male voice
      const male = voices.find(v => v.lang.startsWith("en") && /male|daniel|james|tom|david/i.test(v.name) && !/female/i.test(v.name));
      this.cachedVoice = male ?? voices.find(v => v.lang.startsWith("en")) ?? null;
      this.voiceResolved = true;
    }
    if (this.cachedVoice) utterance.voice = this.cachedVoice;

    window.speechSynthesis.speak(utterance);
  }

  stopAll(): void {
    window.speechSynthesis?.cancel();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
      this.delayNode = null;
      this.feedbackNode = null;
      this.compNode = null;
    }
  }
}
