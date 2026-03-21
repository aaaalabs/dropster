export class GameOverScreen {
  private overlay: HTMLDivElement;

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

  destroy(): void {
    this.overlay.remove();
  }
}
