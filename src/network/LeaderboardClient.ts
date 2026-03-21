interface LeaderboardEntry {
  name: string;
  score: number;
}

interface ActivityEntry {
  player: string;
  event: string;
  score: number;
  time: number;
}

interface LeaderboardData {
  leaderboard: LeaderboardEntry[];
  activity: ActivityEntry[];
  playing: string[];
}

export class LeaderboardClient {
  private heartbeatId: ReturnType<typeof setInterval> | null = null;

  async fetch(): Promise<LeaderboardData> {
    try {
      const res = await window.fetch("/api/leaderboard");
      return await res.json();
    } catch {
      return { leaderboard: [], activity: [], playing: [] };
    }
  }

  async submitScore(player: string, score: number): Promise<void> {
    try {
      await window.fetch("/api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player, score, event: "highscore" }),
      });
    } catch { /* silent fail */ }
  }

  async submitEvent(player: string, event: string, score: number = 0): Promise<void> {
    try {
      await window.fetch("/api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player, event, score }),
      });
    } catch { /* silent fail */ }
  }

  startPlaying(player: string): void {
    this.post({ player, action: "playing" });
    this.heartbeatId = setInterval(() => {
      this.post({ player, action: "playing" });
    }, 10000); // heartbeat every 10s (TTL is 15s)
  }

  stopPlaying(player: string): void {
    if (this.heartbeatId) {
      clearInterval(this.heartbeatId);
      this.heartbeatId = null;
    }
    this.post({ player, action: "stopped" });
  }

  private async post(body: Record<string, unknown>): Promise<void> {
    try {
      await window.fetch("/api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch { /* silent */ }
  }
}
