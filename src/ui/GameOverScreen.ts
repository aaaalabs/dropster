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
    this.overlay.style.cssText = `
      position:fixed; inset:0; background:rgba(0,0,0,0.85);
      display:flex; justify-content:center; align-items:center;
      z-index:100;
    `;
    this.overlay.innerHTML = `
      <div style="text-align:center;">
        <h1 style="font-size:56px; color:${won ? "#00f000" : "#f00000"}; margin-bottom:16px;">
          ${won ? "YOU WIN!" : "YOU LOSE"}
        </h1>
        <p style="font-size:24px; color:#ccc; margin-bottom:32px;">Score: ${score}</p>
        <div style="display:flex; gap:16px; justify-content:center;">
          <button id="btn-lobby" style="padding:16px 32px; font-size:18px; background:#333; color:#fff; border:none; cursor:pointer;">
            Lobby
          </button>
        </div>
      </div>
    `;
    parent.appendChild(this.overlay);

    this.overlay.querySelector("#btn-lobby")!.addEventListener("click", onLobby);
  }

  destroy(): void {
    this.overlay.remove();
  }
}
