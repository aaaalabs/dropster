export class GameOverScreen {
  private overlay: HTMLDivElement;
  private confettiCanvas: HTMLCanvasElement | null = null;
  private confettiAnimId = 0;
  private confetti: { x: number; y: number; vx: number; vy: number; size: number; color: string; rotation: number; rotSpeed: number; life: number }[] = [];

  constructor(
    parent: HTMLElement,
    won: boolean,
    score: number,
    onRematch: () => void,
    onLobby: () => void,
    isNewHighScore = false,
    highScore = 0,
    opponentName = ""
  ) {
    this.overlay = document.createElement("div");
    this.overlay.className = "gameover-overlay";

    const highScoreHtml = isNewHighScore
      ? `<p class="gameover-score" style="color:#ffd700; font-size:clamp(20px,5vw,28px); animation: codePulse 1.5s ease-in-out infinite;">🏆 NEW BEST! 🏆</p>`
      : highScore > 0
        ? `<p class="gameover-score">Best <span>${highScore.toLocaleString()}</span></p>`
        : "";

    const opponentHtml = opponentName
      ? `<p style="font-size:14px; color:var(--text-dim); margin-bottom:4px;">vs ${opponentName}</p>`
      : "";

    this.overlay.innerHTML = `
      <div class="gameover-content">
        <h1 class="gameover-title ${won ? "win" : "lose"}">
          ${won ? "VICTORY" : "DEFEATED"}
        </h1>
        ${opponentHtml}
        <p class="gameover-score" style="font-size:clamp(24px,6vw,36px);">Score <span style="font-size:clamp(32px,8vw,48px);">${score.toLocaleString()}</span></p>
        ${highScoreHtml}
        <div style="display:flex; gap:12px; justify-content:center; margin-top:16px;">
          <button id="btn-rematch" class="lobby-btn btn-primary" style="min-width:140px; min-height:52px; touch-action:manipulation;">
            Rematch
          </button>
          <button id="btn-lobby" class="lobby-btn btn-ghost" style="min-width:140px; min-height:52px; touch-action:manipulation;">
            Lobby
          </button>
        </div>
      </div>
    `;
    parent.appendChild(this.overlay);

    if (isNewHighScore) {
      this.startConfetti();
    }

    this.tapButton("#btn-rematch", onRematch);
    this.tapButton("#btn-lobby", onLobby);
  }

  private tapButton(selector: string, callback: () => void): void {
    const btn = this.overlay.querySelector(selector) as HTMLElement;
    if (!btn) return;
    btn.addEventListener("click", callback);
    btn.addEventListener("touchend", (e) => {
      e.preventDefault();
      callback();
    }, { passive: false });
  }

  private startConfetti(): void {
    const canvas = document.createElement("canvas");
    canvas.style.position = "fixed";
    canvas.style.inset = "0";
    canvas.style.zIndex = "101";
    canvas.style.pointerEvents = "none";
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    this.confettiCanvas = canvas;

    const colors = ["#00f0f0", "#f000f0", "#ffd700", "#a000f0", "#00f000", "#ffffff"];
    this.confetti = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 + Math.random() * 20,
      vx: -3 + Math.random() * 6,
      vy: 2 + Math.random() * 4,
      size: 6 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: 0.05 + Math.random() * 0.15,
      life: 150 + Math.floor(Math.random() * 100),
    }));

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      if (!this.confettiCanvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let alive = 0;
      for (const p of this.confetti) {
        if (p.life <= 0) continue;
        alive++;
        p.x += p.vx;
        p.vy += 0.05;
        p.vx += (Math.random() - 0.5) * 0.1;
        p.y += p.vy;
        p.rotation += p.rotSpeed;
        p.life--;

        const alpha = Math.min(1, p.life / 30);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size / 2);
        ctx.restore();
      }
      ctx.globalAlpha = 1;

      if (alive > 0) {
        this.confettiAnimId = requestAnimationFrame(draw);
      } else {
        this.confettiCanvas?.remove();
        this.confettiCanvas = null;
      }
    };
    this.confettiAnimId = requestAnimationFrame(draw);
  }

  destroy(): void {
    cancelAnimationFrame(this.confettiAnimId);
    this.confettiCanvas?.remove();
    this.confettiCanvas = null;
    this.overlay.remove();
  }
}
