import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Redis } from "@upstash/redis";

const SCORES_KEY = "dropster:scores";
const ACTIVITY_KEY = "dropster:activity";
const MAX_ACTIVITY = 20;

let redis: Redis | null = null;
function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    });
  }
  return redis;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const r = getRedis();

  // GET: fetch leaderboard + recent activity
  if (req.method === "GET") {
    const [scores, activity] = await Promise.all([
      r.hgetall(SCORES_KEY) as Promise<Record<string, string> | null>,
      r.lrange(ACTIVITY_KEY, 0, MAX_ACTIVITY - 1) as Promise<string[]>,
    ]);

    const leaderboard = Object.entries(scores ?? {})
      .map(([name, score]) => ({ name, score: parseInt(String(score), 10) }))
      .sort((a, b) => b.score - a.score);

    return res.json({ leaderboard, activity: activity ?? [] });
  }

  // POST: submit score
  if (req.method === "POST") {
    const { player, score, event } = req.body;

    if (!player || typeof player !== "string") {
      return res.status(400).json({ error: "player required" });
    }

    if (score !== undefined) {
      // Only update if new score is higher
      const current = await r.hget(SCORES_KEY, player) as string | null;
      const currentScore = parseInt(current ?? "0", 10);
      if (score > currentScore) {
        await r.hset(SCORES_KEY, { [player]: score });
      }
    }

    if (event && typeof event === "string") {
      const entry = JSON.stringify({
        player,
        event,
        score: score ?? 0,
        time: Date.now(),
      });
      await r.lpush(ACTIVITY_KEY, entry);
      await r.ltrim(ACTIVITY_KEY, 0, MAX_ACTIVITY - 1);
    }

    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
