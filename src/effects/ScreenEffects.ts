interface TextPopup {
  text: string;
  x: number;
  y: number;
  color: string;
  font: string;
  startTime: number;
  duration: number;
  vy: number;
}

interface Flash {
  color: string;
  startTime: number;
  duration: number;
}

export class ScreenEffects {
  private popups: TextPopup[] = [];
  private flash: Flash | null = null;
  private dangerLevel = 0;

  flashScreen(color: string, durationMs: number): void {
    this.flash = { color, startTime: performance.now(), duration: durationMs };
  }

  addPopup(text: string, x: number, y: number, opts?: {
    color?: string;
    font?: string;
    duration?: number;
    vy?: number;
  }): void {
    this.popups.push({
      text, x, y,
      color: opts?.color ?? "#fff",
      font: opts?.font ?? "bold 16px Orbitron, monospace",
      startTime: performance.now(),
      duration: opts?.duration ?? 1000,
      vy: opts?.vy ?? -1.5,
    });
  }

  setDanger(level: number): void {
    this.dangerLevel = Math.max(0, Math.min(1, level));
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

    // Text popups
    this.popups = this.popups.filter((p) => {
      const elapsed = now - p.startTime;
      const remaining = p.duration - elapsed;
      if (remaining <= 0) return false;

      const frames = elapsed / (1000 / 60);
      ctx.save();
      ctx.globalAlpha = remaining / p.duration;
      ctx.font = p.font;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 12;
      ctx.textAlign = "center";
      ctx.fillText(p.text, p.x, p.y + p.vy * frames);
      ctx.restore();

      return true;
    });
  }
}
