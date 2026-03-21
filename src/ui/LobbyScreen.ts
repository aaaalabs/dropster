import { LeaderboardClient } from "../network/LeaderboardClient";

export interface LobbyCallbacks {
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  onSolo: () => void;
}


export class LobbyScreen {
  private container: HTMLDivElement;
  private lb = new LeaderboardClient();
  selectedDifficulty = "normal";
  selectedPlayer: string;

  constructor(parent: HTMLElement, callbacks: LobbyCallbacks) {
    this.container = document.createElement("div");
    this.selectedPlayer = localStorage.getItem("dropster-player") ?? "Leander";
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
          <div id="player-selector" style="display:flex; gap:6px; justify-content:center;">
            <button data-player="Leander" class="lobby-btn btn-ghost" style="flex:1; padding:10px 4px; font-size:9px; letter-spacing:0.05em; border-color:var(--cyan); color:var(--cyan); opacity:1;">Leander</button>
            <button data-player="Finn" class="lobby-btn btn-ghost" style="flex:1; padding:10px 4px; font-size:9px; letter-spacing:0.05em; opacity:0.5;">Finn</button>
            <button data-player="Mama" class="lobby-btn btn-ghost" style="flex:1; padding:10px 4px; font-size:9px; letter-spacing:0.05em; opacity:0.5;">Mama</button>
            <button data-player="Papa" class="lobby-btn btn-ghost" style="flex:1; padding:10px 4px; font-size:9px; letter-spacing:0.05em; opacity:0.5;">Papa</button>
          </div>
          <div class="divider"></div>
          <div id="difficulty-selector" style="display:flex; gap:6px; justify-content:center;">
            <button data-diff="chill" class="lobby-btn btn-ghost" style="flex:1; padding:10px 0; font-size:10px; opacity:0.5;">CHILL</button>
            <button data-diff="normal" class="lobby-btn btn-ghost" style="flex:1; padding:10px 0; font-size:10px; border-color:var(--cyan); color:var(--cyan); opacity:1;">NORMAL</button>
            <button data-diff="hard" class="lobby-btn btn-ghost" style="flex:1; padding:10px 0; font-size:10px; opacity:0.5;">HARD</button>
            <button data-diff="insane" class="lobby-btn btn-ghost" style="flex:1; padding:10px 0; font-size:10px; opacity:0.5;">INSANE</button>
          </div>
          <button id="btn-solo" class="lobby-btn btn-ghost">Solo Practice</button>
        </div>
        <div id="highscore-display" style="margin-top:16px; font-family:var(--font-display); letter-spacing:0.05em;"></div>
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

    // Player selector
    const playerBtns = this.container.querySelectorAll("#player-selector button");
    const updatePlayerBtns = (): void => {
      playerBtns.forEach(b => {
        const el = b as HTMLElement;
        const active = el.dataset.player === this.selectedPlayer;
        el.style.opacity = active ? "1" : "0.5";
        el.style.borderColor = active ? "var(--cyan)" : "rgba(255,255,255,0.08)";
        el.style.color = active ? "var(--cyan)" : "var(--text-mid)";
      });
    };
    updatePlayerBtns();
    playerBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        this.selectedPlayer = (btn as HTMLElement).dataset.player ?? "Leander";
        localStorage.setItem("dropster-player", this.selectedPlayer);
        updatePlayerBtns();
        this.showHighScores();
      });
    });

    this.showHighScores();

    // Difficulty selector
    const diffBtns = this.container.querySelectorAll("#difficulty-selector button");
    diffBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        this.selectedDifficulty = (btn as HTMLElement).dataset.diff ?? "normal";
        diffBtns.forEach(b => {
          const el = b as HTMLElement;
          const active = el.dataset.diff === this.selectedDifficulty;
          el.style.opacity = active ? "1" : "0.5";
          el.style.borderColor = active ? "var(--cyan)" : "rgba(255,255,255,0.08)";
          el.style.color = active ? "var(--cyan)" : "var(--text-mid)";
        });
      });
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

  showHighScores(): void {
    const el = this.container.querySelector("#highscore-display");
    if (!el) return;

    // Show local scores immediately
    const players = ["Leander", "Finn", "Mama", "Papa"];
    const localScores = players.map(p => {
      const s = parseInt(localStorage.getItem(`dropster-highscore-${p}`) ?? "0", 10);
      return { name: p, score: s };
    }).filter(s => s.score > 0).sort((a, b) => b.score - a.score);

    this.renderScores(el as HTMLElement, localScores);

    // Then fetch from server and merge (server wins if higher)
    this.lb.fetch().then(data => {
      const merged = new Map<string, number>();
      for (const s of localScores) merged.set(s.name, s.score);
      for (const s of data.leaderboard) {
        const current = merged.get(s.name) ?? 0;
        merged.set(s.name, Math.max(current, s.score));
      }
      const scores = [...merged.entries()]
        .map(([name, score]) => ({ name, score }))
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score);

      this.renderScores(el as HTMLElement, scores, data.activity);
    }).catch(() => {});
  }

  private renderScores(el: HTMLElement, scores: { name: string; score: number }[], activity?: { player: string; event: string; time: number }[]): void {
    if (scores.length === 0 && !activity?.length) {
      el.innerHTML = "";
      return;
    }

    let html = scores.map((s, i) => {
      const medal = i === 0 ? "👑&nbsp;" : "";
      const active = s.name === this.selectedPlayer ? "color:var(--cyan);" : "color:var(--text-mid);";
      return `<span style="${active} font-size:12px;">${medal}${s.name}: ${s.score.toLocaleString()}</span>`;
    }).join("&nbsp;&nbsp;");

    if (activity && activity.length > 0) {
      const recent = activity.slice(0, 3);
      const lines = recent.map(a => {
        const ago = this.timeAgo(a.time);
        return `<span style="color:var(--text-dim); font-size:10px;">${a.player} — ${ago}</span>`;
      }).join("&nbsp;&nbsp;");
      html += `<div style="margin-top:6px;">${lines}</div>`;
    }

    el.innerHTML = html;
  }

  private timeAgo(timestamp: number): string {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  destroy(): void {
    this.container.remove();
  }
}
