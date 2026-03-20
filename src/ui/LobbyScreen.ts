export interface LobbyCallbacks {
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  onSolo: () => void;
}

export class LobbyScreen {
  private container: HTMLDivElement;

  constructor(parent: HTMLElement, callbacks: LobbyCallbacks) {
    this.container = document.createElement("div");
    this.container.id = "lobby";
    this.container.innerHTML = `
      <div class="lobby">
        <h1 class="lobby-title">DROPSTER</h1>
        <p class="lobby-subtitle">Block Battle Arena</p>
        <div class="lobby-actions">
          <button id="btn-create" class="lobby-btn btn-primary">Create Room</button>
          <div class="join-row">
            <input id="input-code" class="code-input" type="text" maxlength="4" placeholder="CODE" autocomplete="off" />
            <button id="btn-join" class="lobby-btn btn-secondary">Join</button>
          </div>
          <div class="divider"></div>
          <button id="btn-solo" class="lobby-btn btn-ghost">Solo Practice</button>
        </div>
        <div id="lobby-status" class="lobby-status"></div>
        <div class="controls-hint">
          <p>← → Move &nbsp; ↑ Rotate &nbsp; Space Drop &nbsp; C Hold &nbsp; Esc Quit</p>
        </div>
      </div>
    `;
    parent.appendChild(this.container);

    this.container.querySelector("#btn-create")!.addEventListener("click", callbacks.onCreateRoom);
    this.container.querySelector("#btn-solo")!.addEventListener("click", callbacks.onSolo);
    this.container.querySelector("#btn-join")!.addEventListener("click", () => {
      const input = this.container.querySelector("#input-code") as HTMLInputElement;
      const code = input.value.trim().toUpperCase();
      if (code.length === 4) callbacks.onJoinRoom(code);
    });

    // Enter key joins room
    this.container.querySelector("#input-code")!.addEventListener("keydown", (e) => {
      if ((e as KeyboardEvent).key === "Enter") {
        const input = this.container.querySelector("#input-code") as HTMLInputElement;
        const code = input.value.trim().toUpperCase();
        if (code.length === 4) callbacks.onJoinRoom(code);
      }
    });
  }

  setStatus(text: string): void {
    const el = this.container.querySelector("#lobby-status") as HTMLElement;
    if (el) {
      el.textContent = text;
      el.classList.remove("has-code");
    }
  }

  showRoomCode(code: string): void {
    const el = this.container.querySelector("#lobby-status") as HTMLElement;
    if (el) {
      el.classList.add("has-code");
      el.innerHTML = `
        Share this code with your opponent
        <div class="room-code-display">${code}</div>
      `;
    }
  }

  destroy(): void {
    this.container.remove();
  }
}
