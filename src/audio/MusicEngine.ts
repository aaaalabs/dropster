interface Chord { root: number; third: number; fifth: number }

const CHORDS: Chord[] = [
  { root: 220, third: 261.6, fifth: 329.6 },   // Am
  { root: 174.6, third: 220, fifth: 261.6 },    // F
  { root: 130.8, third: 164.8, fifth: 196 },    // C
  { root: 196, third: 246.9, fifth: 293.7 },    // G
];
const ARP_A = [0, 1, 2, 3, 2, 1, 0, 2] as const;
const ARP_B = [3, 2, 1, 0, 1, 2, 3, 2] as const;

function chordTone(c: Chord, i: number): number {
  return [c.root, c.third, c.fifth, c.root * 2][i];
}

export class MusicEngine {
  private ctx: AudioContext | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private step = 0;
  private bpm = 90;
  private _muted = false;
  private dangerPct = 0;
  private masterGain: GainNode | null = null;
  private patternB = false;
  private noiseBuffer: AudioBuffer | null = null;

  get muted(): boolean { return this._muted; }
  set muted(val: boolean) {
    this._muted = val;
    if (this.masterGain) this.masterGain.gain.value = val ? 0 : 0.12;
  }

  start(): void {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this._muted ? 0 : 0.12;
      this.masterGain.connect(this.ctx.destination);
      const sr = this.ctx.sampleRate;
      const len = Math.floor(sr * 0.05);
      this.noiseBuffer = this.ctx.createBuffer(1, len, sr);
      const d = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    this.scheduleInterval();
  }

  stop(): void {
    if (this.intervalId !== null) { clearInterval(this.intervalId); this.intervalId = null; }
    if (this.ctx) { void this.ctx.close(); this.ctx = null; this.masterGain = null; this.noiseBuffer = null; }
    this.step = 0;
    this.patternB = false;
  }

  setLevel(level: number): void {
    this.bpm = Math.min(90 + level * 8, 150);
    this.restartInterval();
  }

  setBpm(bpm: number): void { this.bpm = bpm; this.restartInterval(); }
  setDanger(pct: number): void { this.dangerPct = pct; }

  private restartInterval(): void {
    if (this.intervalId === null) return;
    clearInterval(this.intervalId);
    this.intervalId = null;
    this.scheduleInterval();
  }

  private scheduleInterval(): void {
    this.intervalId = setInterval(() => this.playStep(), (60000 / this.bpm) / 2);
  }

  private playStep(): void {
    if (!this.ctx || !this.masterGain) return;
    const stepDur = (60 / this.bpm) / 2;
    const chordIdx = Math.floor(this.step / 8) % 4;
    const chord = CHORDS[chordIdx];
    const local = this.step % 8;
    const pat = this.patternB ? ARP_B : ARP_A;
    const tense = this.dangerPct > 0.7;
    const extreme = this.dangerPct > 0.85;

    // Arp
    const arpDur = stepDur * (tense ? 0.3 : 0.5);
    this.playNote(chordTone(chord, pat[local]), 'square', 0.3, arpDur);
    if (extreme) {
      const next = CHORDS[(chordIdx + 1) % 4];
      this.playNote(chordTone(next, pat[local]), 'square', 0.15, arpDur * 0.6);
    }

    // Bass — beat 1 (long) and beat 3 (short walking bass)
    if (local === 0) this.playBass(chord.root / 2, stepDur * 4);
    else if (local === 4) this.playBass(chord.root / 2, stepDur * 1.5);

    // Kick — every 4 steps
    if (this.step % 4 === 0) this.playKick();

    // Hi-hat — every 2 steps, accent off-beats
    if (this.step % 2 === 0) this.playHiHat(local % 2 === 1 ? 0.35 : 0.2);
    if (extreme) setTimeout(() => { if (this.ctx) this.playHiHat(0.15); }, stepDur * 500);

    this.step = (this.step + 1) % 32;
    if (this.step === 0) this.patternB = !this.patternB;
  }

  private playNote(freq: number, type: OscillatorType, gain: number, dur: number): void {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const t = this.ctx.currentTime;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(gain, t + 0.005);
    env.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(env).connect(this.masterGain);
    osc.start(t);
    osc.stop(t + dur + 0.01);
  }

  private playBass(freq: number, dur: number): void {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    const lp = this.ctx.createBiquadFilter();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    lp.type = 'lowpass';
    lp.frequency.value = 400;
    const t = this.ctx.currentTime;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.5, t + 0.01);
    env.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(lp).connect(env).connect(this.masterGain);
    osc.start(t);
    osc.stop(t + dur + 0.01);
  }

  private playKick(): void {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    // Body: sine sweep 80->30Hz
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.12);
    env.gain.setValueAtTime(0.8, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(env).connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.13);
    // Click: 1000Hz attack transient
    const click = this.ctx.createOscillator();
    const ce = this.ctx.createGain();
    click.frequency.value = 1000;
    ce.gain.setValueAtTime(0.3, t);
    ce.gain.exponentialRampToValueAtTime(0.001, t + 0.005);
    click.connect(ce).connect(this.masterGain);
    click.start(t);
    click.stop(t + 0.01);
  }

  private playHiHat(gain: number): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    const env = this.ctx.createGain();
    const hp = this.ctx.createBiquadFilter();
    src.buffer = this.noiseBuffer;
    hp.type = 'highpass';
    hp.frequency.value = 8000;
    env.gain.setValueAtTime(gain, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    src.connect(hp).connect(env).connect(this.masterGain);
    src.start(t);
    src.stop(t + 0.04);
  }
}
