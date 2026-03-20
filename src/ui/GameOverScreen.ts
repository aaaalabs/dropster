export class GameOverScreen {
  private overlay: HTMLDivElement;

  constructor(
    parent: HTMLElement,
    won: boolean,
    score: number,
    _onRematch: () => void,
    onLobby: () => void
  ) {
    this.overlay = document.createElement("div");
    this.overlay.className = "gameover-overlay";
    this.overlay.innerHTML = `
      <div class="gameover-content">
        <h1 class="gameover-title ${won ? "win" : "lose"}">
          ${won ? "VICTORY" : "DEFEATED"}
        </h1>
        <p class="gameover-score">Score <span>${score.toLocaleString()}</span></p>
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
