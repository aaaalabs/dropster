export class GameOverScreen {
  private overlay: HTMLDivElement;

  constructor(
    parent: HTMLElement,
    won: boolean,
    score: number,
    _onRematch: () => void,
    onLobby: () => void,
    isNewHighScore = false,
    highScore = 0
  ) {
    this.overlay = document.createElement("div");
    this.overlay.className = "gameover-overlay";

    const highScoreHtml = isNewHighScore
      ? `<p class="gameover-score" style="color:#ffd700;">NEW BEST!</p>`
      : highScore > 0
        ? `<p class="gameover-score">Best <span>${highScore.toLocaleString()}</span></p>`
        : "";

    this.overlay.innerHTML = `
      <div class="gameover-content">
        <h1 class="gameover-title ${won ? "win" : "lose"}">
          ${won ? "VICTORY" : "DEFEATED"}
        </h1>
        <p class="gameover-score">Score <span>${score.toLocaleString()}</span></p>
        ${highScoreHtml}
        <button id="btn-lobby" class="lobby-btn btn-ghost" style="min-width:180px;">
          Back to Lobby
        </button>
      </div>
    `;
    parent.appendChild(this.overlay);

    this.overlay.querySelector("#btn-lobby")!.addEventListener("click", onLobby);
  }

  destroy(): void {
    this.overlay.remove();
  }
}
