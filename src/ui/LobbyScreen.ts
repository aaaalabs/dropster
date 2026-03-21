import { LeaderboardClient } from "../network/LeaderboardClient";

export interface LobbyCallbacks {
  onSolo: () => void;
  onChallenge: () => void;               // player wants to challenge
  onAcceptChallenge: (opponent: string) => void;  // player accepts someone's challenge
}

export class LobbyScreen {
  private container: HTMLDivElement;
  private lb = new LeaderboardClient();
  private activePlayers: string[] = [];
  private onlinePlayers: string[] = [];
  private challenges: { name: string; peerId: string }[] = [];
  private pollId: ReturnType<typeof setInterval> | null = null;
  private callbacks: LobbyCallbacks;
  selectedDifficulty = "normal";
  selectedPlayer: string;
  private isWaiting = false;

  constructor(parent: HTMLElement, callbacks: LobbyCallbacks) {
    this.callbacks = callbacks;
    this.container = document.createElement("div");
    this.selectedPlayer = localStorage.getItem("dropster-player") ?? "Leander";
    this.container.id = "lobby";
    this.container.innerHTML = `
      <div class="lobby">
        <h1 class="lobby-title">DROPSTER</h1>
        <p class="lobby-subtitle">Block Battle Arena</p>
        <div class="lobby-actions">
          <div id="player-selector" style="display:flex; gap:6px; justify-content:center;">
            <button data-player="Leander" class="lobby-btn btn-ghost" style="flex:1; padding:10px 4px; font-size:9px; letter-spacing:0.05em;">Leander</button>
            <button data-player="Finn" class="lobby-btn btn-ghost" style="flex:1; padding:10px 4px; font-size:9px; letter-spacing:0.05em;">Finn</button>
            <button data-player="Mama" class="lobby-btn btn-ghost" style="flex:1; padding:10px 4px; font-size:9px; letter-spacing:0.05em;">Mama</button>
            <button data-player="Papa" class="lobby-btn btn-ghost" style="flex:1; padding:10px 4px; font-size:9px; letter-spacing:0.05em;">Papa</button>
          </div>
          <div class="divider"></div>
          <div id="difficulty-selector" style="display:flex; gap:6px; justify-content:center;">
            <button data-diff="chill" class="lobby-btn btn-ghost" style="flex:1; padding:8px 0; font-size:9px;"><div>CHILL</div><div style="font-size:7px; opacity:0.6; margin-top:2px;">×0.5</div></button>
            <button data-diff="normal" class="lobby-btn btn-ghost" style="flex:1; padding:8px 0; font-size:9px;"><div>NORMAL</div><div style="font-size:7px; opacity:0.6; margin-top:2px;">×1</div></button>
            <button data-diff="hard" class="lobby-btn btn-ghost" style="flex:1; padding:8px 0; font-size:9px;"><div>HARD</div><div style="font-size:7px; opacity:0.6; margin-top:2px;">×1.5</div></button>
            <button data-diff="insane" class="lobby-btn btn-ghost" style="flex:1; padding:8px 0; font-size:9px;"><div>INSANE</div><div style="font-size:7px; opacity:0.6; margin-top:2px;">×2.5 💀</div></button>
          </div>
          <div class="divider"></div>
          <button id="btn-challenge" class="lobby-btn btn-primary">⚔️ Challenge</button>
          <button id="btn-solo" class="lobby-btn btn-ghost">Solo Practice</button>
          <div id="challenge-list"></div>
        </div>
        <div id="highscore-display" style="margin-top:16px; font-family:var(--font-display); letter-spacing:0.05em;"></div>
        <div id="lobby-status" class="lobby-status"></div>
        <div class="controls-hint">
          <p>← → Move &nbsp; ↑ Rotate &nbsp; Space Drop &nbsp; C Hold &nbsp; Esc Quit</p>
        </div>
      </div>
    `;
    parent.appendChild(this.container);

    this.container.querySelector("#btn-solo")!.addEventListener("click", callbacks.onSolo);
    this.container.querySelector("#btn-challenge")!.addEventListener("click", () => {
      if (this.isWaiting) {
        this.cancelWaiting();
        return;
      }
      this.isWaiting = true;
      this.updateChallengeButton();
      callbacks.onChallenge();
    });

    // Player selector
    const playerBtns = this.container.querySelectorAll("#player-selector button");
    this.updatePlayerButtons(playerBtns);
    playerBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const el = btn as HTMLButtonElement;
        if (el.disabled) return;
        const oldPlayer = this.selectedPlayer;
        this.selectedPlayer = el.dataset.player ?? "Leander";
        localStorage.setItem("dropster-player", this.selectedPlayer);
        this.lb.stopOnline(oldPlayer);
        this.lb.startOnline(this.selectedPlayer);
        this.updatePlayerButtons(playerBtns);
        this.showHighScores();
      });
    });

    // Difficulty selector
    const diffBtns = this.container.querySelectorAll("#difficulty-selector button");
    this.updateDiffButtons(diffBtns);
    diffBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        this.selectedDifficulty = (btn as HTMLElement).dataset.diff ?? "normal";
        this.updateDiffButtons(diffBtns);
      });
    });

    this.showHighScores();
    this.lb.startOnline(this.selectedPlayer);

    // Poll for active players + challenges every 3s
    this.poll();
    this.pollId = setInterval(() => this.poll(), 3000);
  }

  setStatus(text: string): void {
    const el = this.container.querySelector("#lobby-status") as HTMLElement;
    if (el) {
      el.textContent = text;
      el.classList.remove("has-code");
    }
  }

  cancelWaiting(): void {
    this.isWaiting = false;
    this.updateChallengeButton();
    this.lb.cancelChallenge(this.selectedPlayer);
  }

  showHighScores(): void {
    const el = this.container.querySelector("#highscore-display");
    if (!el) return;

    const players = ["Leander", "Finn", "Mama", "Papa"];
    const localScores = players.map(p => {
      const s = parseInt(localStorage.getItem(`dropster-highscore-${p}`) ?? "0", 10);
      return { name: p, score: s };
    }).filter(s => s.score > 0).sort((a, b) => b.score - a.score);

    this.renderScores(el as HTMLElement, localScores);

    this.lb.fetch().then(data => {
      const merged = new Map<string, number>();
      for (const s of localScores) merged.set(s.name, s.score);
      for (const s of data.leaderboard) {
        const current = merged.get(s.name) ?? 0;
        merged.set(s.name, Math.max(current, s.score));
      }
      for (const [name, score] of merged) {
        const serverScore = data.leaderboard.find(s => s.name === name)?.score ?? 0;
        if (score > serverScore && score > 0) this.lb.submitScore(name, score);
        const localScore = parseInt(localStorage.getItem(`dropster-highscore-${name}`) ?? "0", 10);
        if (score > localScore) localStorage.setItem(`dropster-highscore-${name}`, String(score));
      }
      const scores = [...merged.entries()]
        .map(([name, score]) => ({ name, score }))
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score);
      this.renderScores(el as HTMLElement, scores, data.activity);
    }).catch(() => {});
  }

  private poll(): void {
    this.lb.fetch().then(data => {
      this.activePlayers = data.playing ?? [];
      this.onlinePlayers = data.online ?? [];
      this.challenges = (data.challenges ?? []).filter(c => c.name !== this.selectedPlayer);
      const playerBtns = this.container.querySelectorAll("#player-selector button");
      this.updatePlayerButtons(playerBtns);
      this.updateChallengeList();
    }).catch(() => {});
  }

  private updateChallengeButton(): void {
    const btn = this.container.querySelector("#btn-challenge") as HTMLButtonElement;
    if (!btn) return;
    if (this.isWaiting) {
      btn.innerHTML = "⏳ Waiting...";
      btn.style.opacity = "0.6";
    } else {
      btn.innerHTML = "⚔️ Challenge";
      btn.style.opacity = "1";
    }
  }

  private updateChallengeList(): void {
    const el = this.container.querySelector("#challenge-list");
    if (!el) return;
    if (this.challenges.length === 0) {
      el.innerHTML = "";
      return;
    }
    el.innerHTML = this.challenges.map(c =>
      `<button class="lobby-btn btn-secondary challenge-accept" data-opponent="${c.name}" style="width:100%; margin-top:6px; padding:12px;">
        ⚔️ ${c.name} challenges you!
      </button>`
    ).join("");

    el.querySelectorAll(".challenge-accept").forEach(btn => {
      btn.addEventListener("click", () => {
        const opponent = (btn as HTMLElement).dataset.opponent ?? "";
        this.callbacks.onAcceptChallenge(opponent);
      });
    });
  }

  private updatePlayerButtons(btns: NodeListOf<Element>): void {
    btns.forEach(b => {
      const el = b as HTMLButtonElement;
      const name = el.dataset.player ?? "";
      const active = name === this.selectedPlayer;
      const playing = this.activePlayers.includes(name);

      const isOnline = this.onlinePlayers.includes(name);

      if (playing && !active) {
        el.style.opacity = "0.3";
        el.style.borderColor = "#00ff88";
        el.style.color = "#00ff88";
        el.disabled = true;
        el.style.cursor = "not-allowed";
        el.innerHTML = `<div style="font-size:7px;">🎮 PLAYING</div><div>${name}</div>`;
      } else {
        el.disabled = false;
        el.style.cursor = "pointer";
        el.style.opacity = active ? "1" : isOnline ? "0.8" : "0.5";
        el.style.borderColor = active ? "var(--cyan)" : "rgba(255,255,255,0.08)";
        el.style.color = active ? "var(--cyan)" : isOnline ? "#00ff88" : "var(--text-mid)";
        el.textContent = name;
      }
    });
  }

  private updateDiffButtons(btns: NodeListOf<Element>): void {
    btns.forEach(b => {
      const el = b as HTMLElement;
      const active = el.dataset.diff === this.selectedDifficulty;
      el.style.opacity = active ? "1" : "0.5";
      el.style.borderColor = active ? "var(--cyan)" : "rgba(255,255,255,0.08)";
      el.style.color = active ? "var(--cyan)" : "var(--text-mid)";
    });
  }

  private renderScores(el: HTMLElement, scores: { name: string; score: number }[], activity?: { player: string; event: string; time: number }[]): void {
    if (scores.length === 0 && !activity?.length) { el.innerHTML = ""; return; }

    let html = `<div style="display:flex; flex-direction:column; gap:4px; align-items:center;">`;
    html += scores.map((s, i) => {
      const medal = i === 0 ? "👑&nbsp;" : `<span style="display:inline-block;width:20px;">${i + 1}.</span>`;
      const active = s.name === this.selectedPlayer ? "color:var(--cyan);" : "color:var(--text-mid);";
      return `<div style="${active} font-size:12px;">${medal}${s.name} <span style="opacity:0.6;">${s.score.toLocaleString()}</span></div>`;
    }).join("");
    html += `</div>`;
    el.innerHTML = html;
  }

  destroy(): void {
    if (this.pollId) clearInterval(this.pollId);
    this.lb.stopOnline(this.selectedPlayer);
    this.container.remove();
  }
}
