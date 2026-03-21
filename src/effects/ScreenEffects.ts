interface TextPopup {
  text: string;
  x: number;
  y: number;
  color: string;
  font: string;
  startTime: number;
  duration: number;
  vy: number;
  centered?: boolean;
}

interface Flash {
  color: string;
  startTime: number;
  duration: number;
}

interface Trail {
  x: number;
  y1: number;
  y2: number;
  color: string;
  width: number;
  startTime: number;
  duration: number;
}

interface ImpactLine {
  x: number;
  y: number;
  width: number;
  color: string;
  startTime: number;
  duration: number;
}

export class ScreenEffects {
  private popups: TextPopup[] = [];
  private flash: Flash | null = null;
  private dangerLevel = 0;
  private trails: Trail[] = [];
  private impactLines: ImpactLine[] = [];

  flashScreen(color: string, durationMs: number): void {
    this.flash = { color, startTime: performance.now(), duration: durationMs };
  }

  addPopup(text: string, x: number, y: number, opts?: {
    color?: string;
    font?: string;
    duration?: number;
    vy?: number;
    centered?: boolean;
  }): void {
    this.popups.push({
      text, x, y,
      color: opts?.color ?? "#fff",
      font: opts?.font ?? "bold 16px Orbitron, monospace",
      startTime: performance.now(),
      duration: opts?.duration ?? 1000,
      vy: opts?.vy ?? -1.5,
      centered: opts?.centered ?? false,
    });
  }

  addWarning(text: string, duration: number = 2000): void {
    this.addPopup(text, 0, 80, {
      color: "#ff0044",
      font: "bold 24px Orbitron, monospace",
      duration,
      vy: 0,
      centered: true,
    });
  }

  setDanger(level: number): void {
    this.dangerLevel = Math.max(0, Math.min(1, level));
  }

  addTrail(x: number, y1: number, y2: number, color: string, width: number, duration: number): void {
    this.trails.push({ x, y1, y2, color, width, startTime: performance.now(), duration });
  }

  addImpactLine(x: number, y: number, width: number, color: string, duration: number): void {
    this.impactLines.push({ x, y, width, color, startTime: performance.now(), duration });
  }

  draw(ctx: CanvasRenderingContext2D, now: number, boardX: number, boardY: number, boardW: number, boardH: number): void {
    const canvas = ctx.canvas;

    // Flash overlay
    if (this.flash) {
      const elapsed = now - this.flash.startTime;
      const remaining = this.flash.duration - elapsed;
      if (remaining <= 0) {
        this.flash = null;
      } else {
        ctx.save();
        ctx.globalAlpha = (remaining / this.flash.duration) * 0.4;
        ctx.fillStyle = this.flash.color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }
    }

    // Danger overlay
    if (this.dangerLevel >= 0.7) {
      const isCritical = this.dangerLevel >= 0.85;
      const pulseSpeed = 0.003 + this.dangerLevel * 0.006;
      const pulse = (Math.sin(now * pulseSpeed) + 1) / 2; // 0-1
      const alpha = 0.1 + pulse * 0.3;

      ctx.save();

      if (isCritical) {
        // Dark vignette on board
        const grad = ctx.createRadialGradient(
          boardX + boardW / 2, boardY + boardH / 2, boardH * 0.2,
          boardX + boardW / 2, boardY + boardH / 2, boardH * 0.75,
        );
        grad.addColorStop(0, "rgba(0,0,0,0)");
        grad.addColorStop(1, `rgba(80,0,0,${(alpha * 0.6).toFixed(3)})`);
        ctx.fillStyle = grad;
        ctx.fillRect(boardX, boardY, boardW, boardH);
      }

      // Red border pulse
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = "#ff2020";
      ctx.lineWidth = isCritical ? 6 : 4;
      ctx.strokeRect(boardX, boardY, boardW, boardH);

      ctx.restore();
    }

    // Trails
    this.trails = this.trails.filter((t) => {
      const remaining = t.duration - (now - t.startTime);
      if (remaining <= 0) return false;
      ctx.save();
      ctx.globalAlpha = (remaining / t.duration) * 0.6;
      ctx.fillStyle = t.color;
      ctx.fillRect(t.x - t.width / 2, t.y1, t.width, t.y2 - t.y1);
      ctx.restore();
      return true;
    });

    // Impact lines
    this.impactLines = this.impactLines.filter((il) => {
      const elapsed = now - il.startTime;
      const remaining = il.duration - elapsed;
      if (remaining <= 0) return false;
      const progress = elapsed / il.duration;
      const scale = progress < 0.2 ? 1 + progress * 0.5 : 1.1 - (progress - 0.2) * 0.125;
      const w = il.width * scale;
      ctx.save();
      ctx.globalAlpha = remaining / il.duration;
      ctx.shadowColor = il.color;
      ctx.shadowBlur = 16;
      ctx.strokeStyle = il.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(il.x - w / 2, il.y);
      ctx.lineTo(il.x + w / 2, il.y);
      ctx.stroke();
      ctx.restore();
      return true;
    });

    // Text popups
    this.popups = this.popups.filter((p) => {
      const elapsed = now - p.startTime;
      const remaining = p.duration - elapsed;
      if (remaining <= 0) return false;

      const frames = elapsed / (1000 / 60);
      const drawX = p.centered ? canvas.width / 2 : p.x;
      ctx.save();
      ctx.globalAlpha = remaining / p.duration;
      ctx.font = p.font;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 12;
      ctx.textAlign = p.centered ? "center" : "left";
      ctx.fillText(p.text, drawX, p.y + p.vy * frames);
      ctx.restore();

      return true;
    });
  }
}
