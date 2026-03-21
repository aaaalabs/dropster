interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  color: string; size: number;
  gravity?: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private readonly MAX = 200;

  add(p: Omit<Particle, 'maxLife'> & { maxLife?: number }): void {
    if (this.particles.length >= this.MAX) this.particles.shift();
    this.particles.push({ maxLife: p.life, ...p });
  }

  burst(x: number, y: number, count: number, opts: {
    color: string;
    speed?: number;
    size?: number;
    life?: number;
    gravity?: number;
    spread?: number;
    baseAngle?: number;
  }): void {
    const { color, speed = 3, size = 3, life = 20, gravity = 0, spread = Math.PI * 2, baseAngle = 0 } = opts;
    for (let i = 0; i < count; i++) {
      const angle = baseAngle + (Math.random() - 0.5) * spread;
      const s = speed * (0.5 + Math.random() * 0.5);
      this.add({ x, y, vx: Math.cos(angle) * s, vy: Math.sin(angle) * s, life, color, size, gravity });
    }
  }

  burstRow(x: number, y: number, width: number, count: number, opts: {
    color: string;
    speed?: number;
    size?: number;
    life?: number;
    gravity?: number;
  }): void {
    const { color, speed = 3, size = 3, life = 20, gravity = 0 } = opts;
    for (let i = 0; i < count; i++) {
      const px = x + Math.random() * width;
      const vx = (Math.random() < 0.5 ? -1 : 1) * speed * (0.5 + Math.random() * 0.5);
      const vy = (Math.random() - 0.5) * speed * 0.5;
      this.add({ x: px, y, vx, vy, life, color, size, gravity });
    }
  }

  update(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.gravity) p.vy += p.gravity;
      p.life--;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  clear(): void { this.particles = []; }

  get count(): number { return this.particles.length; }
}
