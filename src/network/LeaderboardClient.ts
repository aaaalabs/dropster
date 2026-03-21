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
}

export class LeaderboardClient {
  async fetch(): Promise<LeaderboardData> {
    try {
      const res = await window.fetch("/api/leaderboard");
      return await res.json();
    } catch {
      return { leaderboard: [], activity: [] };
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
}
