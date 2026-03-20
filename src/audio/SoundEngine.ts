const MUTE_KEY = 'dropster-muted';

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private _muted: boolean;
  private softDropLastMs = 0;

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
    if (!this.ctx) this.ctx = new AudioContext();
    return this.ctx;
  }

  private osc(
    type: OscillatorType,
    freq: number,
    startGain: number,
    endGain: number,
    duration: number,
    startTime: number,
    freqEnd?: number,
  ): void {
    const ctx = this.getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    if (freqEnd !== undefined) osc.frequency.linearRampToValueAtTime(freqEnd, startTime + duration);

    gain.gain.setValueAtTime(startGain, startTime);
    gain.gain.exponentialRampToValueAtTime(Math.max(endGain, 0.001), startTime + duration);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  private noise(startGain: number, duration: number, startTime: number): void {
    const ctx = this.getCtx();
    const bufSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = buffer;
    src.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(startGain, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    src.start(startTime);
    src.stop(startTime + duration);
  }

  move(): void {
    if (this._muted) return;
    const t = this.getCtx().currentTime;
    this.osc('square', 440, 0.08, 0.001, 0.03, t);
  }

  rotate(): void {
    if (this._muted) return;
    const t = this.getCtx().currentTime;
    this.osc('square', 660, 0.1, 0.001, 0.05, t, 880);
  }

  hardDrop(): void {
    if (this._muted) return;
    const t = this.getCtx().currentTime;
    this.osc('sawtooth', 120, 0.4, 0.001, 0.1, t, 60);
    this.noise(0.15, 0.08, t);
  }

  softDrop(): void {
    if (this._muted) return;
    const now = performance.now();
    if (now - this.softDropLastMs < 50) return;
    this.softDropLastMs = now;
    const t = this.getCtx().currentTime;
    this.osc('square', 300, 0.05, 0.001, 0.02, t);
  }

  lineClear(count: number): void {
    if (this._muted) return;
    const ctx = this.getCtx();
    const t = ctx.currentTime;

    if (count === 4) {
      // Tetris — ascending chord, most epic
      const notes = [261.6, 329.6, 392, 523.2];
      notes.forEach((freq, i) => {
        const start = t + i * 0.06;
        this.osc('sawtooth', freq, 0.25, 0.001, 0.4, start, freq * 2);
      });
      this.noise(0.1, 0.15, t);
    } else {
      // 1-3 lines: rising sweep, longer/higher with more lines
      const baseFreq = 200 + count * 80;
      const endFreq = baseFreq * (1 + count * 0.5);
      const dur = 0.1 + count * 0.07;
      this.osc('sawtooth', baseFreq, 0.3, 0.001, dur, t, endFreq);
      if (count >= 2) this.osc('square', baseFreq * 1.5, 0.1, 0.001, dur, t + 0.04, endFreq * 1.5);
    }
  }

  combo(comboCount: number): void {
    if (this._muted) return;
    const t = this.getCtx().currentTime;
    const freq = 300 + Math.min(comboCount, 10) * 80;
    this.osc('square', freq, 0.18, 0.001, 0.15, t, freq * 1.25);
  }

  garbageReceived(): void {
    if (this._muted) return;
    const t = this.getCtx().currentTime;
    this.osc('sawtooth', 80, 0.35, 0.001, 0.2, t, 40);
    this.noise(0.08, 0.15, t + 0.03);
  }

  gameOver(): void {
    if (this._muted) return;
    const t = this.getCtx().currentTime;
    this.osc('sawtooth', 440, 0.3, 0.001, 0.8, t, 55);
    this.osc('square', 220, 0.15, 0.001, 0.6, t + 0.1, 55);
  }

  stopAll(): void {
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }

  countdown(): void {
    if (this._muted) return;
    const t = this.getCtx().currentTime;
    this.osc('square', 660, 0.2, 0.001, 0.1, t);
  }

  countdownGo(): void {
    if (this._muted) return;
    const t = this.getCtx().currentTime;
    this.osc('square', 1046, 0.3, 0.001, 0.15, t, 1320);
  }
}
