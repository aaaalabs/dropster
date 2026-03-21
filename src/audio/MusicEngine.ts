export class MusicEngine {
  private ctx: AudioContext | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private step = 0;
  private bpm = 90;
  private _muted = false;
  private dangerPct = 0;
  private masterGain: GainNode | null = null;

  // A minor pentatonic: A3=220, C4=261.6, D4=293.7, E4=329.6, G4=392
  private pattern = [
    220, 329.6, 392, 329.6, 261.6, 392, 329.6, 220,
    293.7, 392, 329.6, 261.6, 220, 261.6, 329.6, 392,
  ];

  get muted(): boolean {
    return this._muted;
  }

  set muted(val: boolean) {
    this._muted = val;
    if (this.masterGain) {
      this.masterGain.gain.value = val ? 0 : 0.15;
    }
  }

  start(): void {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this._muted ? 0 : 0.15;
      this.masterGain.connect(this.ctx.destination);
    }
    this.scheduleInterval();
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
      this.masterGain = null;
    }
    this.step = 0;
  }

  setLevel(level: number): void {
    this.bpm = Math.min(90 + level * 8, 150);
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.scheduleInterval();
    }
  }

  setBpm(bpm: number): void {
    this.bpm = bpm;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.scheduleInterval();
    }
  }

  setDanger(pct: number): void {
    this.dangerPct = pct;
  }

  private scheduleInterval(): void {
    const ms = (60000 / this.bpm) / 2; // 8th notes (more relaxed groove)
    this.intervalId = setInterval(() => this.playStep(), ms);
  }

  private playStep(): void {
    if (!this.ctx || !this.masterGain) return;

    const stepDuration = (60 / this.bpm) / 2; // 8th note duration
    const noteDuration = stepDuration * 0.5; // staccato
    const freq = this.pattern[this.step];

    // Main arp note (square = retro)
    this.playNote(freq, 'square', 0.3, noteDuration);

    // Danger: add octave above for tension
    if (this.dangerPct > 0.7) {
      this.playNote(freq * 2, 'square', 0.2, noteDuration);
    }

    // Danger: double-step (extra note offset by half a step)
    if (this.dangerPct > 0.85) {
      const halfStep = stepDuration * 0.5;
      setTimeout(() => {
        if (!this.ctx) return;
        this.playNote(freq, 'square', 0.25, noteDuration * 0.5);
      }, halfStep * 1000);
    }

    // Every 4 steps: bass + kick
    if (this.step % 4 === 0) {
      this.playNote(110, 'sawtooth', 0.5, stepDuration * 2); // bass: A2
      this.playKick();
    }

    this.step = (this.step + 1) % 16;
  }

  private playNote(
    freq: number,
    type: OscillatorType,
    gain: number,
    duration: number,
  ): void {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;

    const now = this.ctx.currentTime;
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(gain, now + 0.005); // quick attack
    env.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(env);
    env.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  private playKick(): void {
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    // Sine sweep: 80 → 40 Hz over 0.1s
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
    env.gain.setValueAtTime(0.8, now);
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(env);
    env.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.11);

    // Noise burst: 0.05s
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.05);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    const noiseEnv = this.ctx.createGain();
    noise.buffer = buffer;
    noiseEnv.gain.setValueAtTime(0.3, now);
    noiseEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    noise.connect(noiseEnv);
    noiseEnv.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + 0.06);
  }
}
