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
      <div style="text-align:center; padding:clamp(20px,5vw,40px); max-width:100vw; box-sizing:border-box;">
        <h1 style="font-size:clamp(32px,8vw,48px); margin-bottom:8px; color:#00f0f0;">DROPSTER</h1>
        <p style="color:#666; margin-bottom:clamp(20px,5vw,40px);">1v1 Competitive Tetris</p>
        <div style="display:flex; flex-direction:column; gap:16px; max-width:min(300px,90vw); margin:0 auto;">
          <button id="btn-create" style="padding:16px; font-size:18px; background:#00f0f0; color:#000; border:none; cursor:pointer; font-weight:bold;">
            Create Room
          </button>
          <div style="display:flex; gap:8px;">
            <input id="input-code" type="text" maxlength="4" placeholder="Room Code"
              style="flex:1; padding:16px; font-size:18px; background:#1a1a2e; color:#fff; border:1px solid #333; text-transform:uppercase; text-align:center; font-family:monospace;" />
            <button id="btn-join" style="padding:16px 24px; font-size:18px; background:#a000f0; color:#fff; border:none; cursor:pointer; font-weight:bold;">
              Join
            </button>
          </div>
          <div style="border-top:1px solid #333; margin-top:8px; padding-top:8px;">
            <button id="btn-solo" style="padding:16px; width:100%; font-size:18px; background:#333; color:#fff; border:none; cursor:pointer; font-weight:bold;">
              Solo
            </button>
          </div>
        </div>
        <p id="lobby-status" style="margin-top:24px; color:#666; padding:0 16px;"></p>
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
  }

  setStatus(text: string): void {
    const el = this.container.querySelector("#lobby-status") as HTMLElement;
    if (el) el.textContent = text;
  }

  showRoomCode(code: string): void {
    this.setStatus(`Room Code: ${code} — Share this with your opponent!`);
  }

  destroy(): void {
    this.container.remove();
  }
}
