import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Redis } from "@upstash/redis";

const SCORES_KEY = "dropster:scores";
const ACTIVITY_KEY = "dropster:activity";
const PLAYING_KEY = "dropster:playing"; // hash: player → timestamp
const CHALLENGE_KEY = "dropster:challenge"; // hash: player → peerId
const MAX_ACTIVITY = 20;
const PLAYING_TTL = 15; // seconds — must heartbeat within this

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

  // GET: fetch leaderboard + activity + who's playing
  if (req.method === "GET") {
    const [scores, activity, playing, challenges] = await Promise.all([
      r.hgetall(SCORES_KEY) as Promise<Record<string, string> | null>,
      r.lrange(ACTIVITY_KEY, 0, MAX_ACTIVITY - 1) as Promise<string[]>,
      r.hgetall(PLAYING_KEY) as Promise<Record<string, string> | null>,
      r.hgetall(CHALLENGE_KEY) as Promise<Record<string, string> | null>,
    ]);

    const leaderboard = Object.entries(scores ?? {})
      .map(([name, score]) => ({ name, score: parseInt(String(score), 10) }))
      .sort((a, b) => b.score - a.score);

    const now = Date.now();
    const activePlayers = Object.entries(playing ?? {})
      .filter(([_, ts]) => now - parseInt(String(ts), 10) < PLAYING_TTL * 1000)
      .map(([name]) => name);

    // challenges: { playerName: peerId }
    const waiting = Object.entries(challenges ?? {})
      .map(([name, peerId]) => ({ name, peerId: String(peerId) }));

    return res.json({ leaderboard, activity: activity ?? [], playing: activePlayers, challenges: waiting });
  }

  // POST: submit score / set playing status
  if (req.method === "POST") {
    const { player, score, event, action } = req.body;

    if (!player || typeof player !== "string") {
      return res.status(400).json({ error: "player required" });
    }

    // Heartbeat: mark player as playing
    if (action === "playing") {
      await r.hset(PLAYING_KEY, { [player]: Date.now() });
      return res.json({ ok: true });
    }

    // Stop playing
    if (action === "stopped") {
      await r.hdel(PLAYING_KEY, player);
      await r.hdel(CHALLENGE_KEY, player);
      return res.json({ ok: true });
    }

    // Post a challenge (waiting for opponent)
    if (action === "challenge") {
      const { peerId } = req.body;
      await r.hset(CHALLENGE_KEY, { [player]: peerId });
      return res.json({ ok: true });
    }

    // Accept a challenge (get opponent's peerId, remove their challenge)
    if (action === "accept-challenge") {
      const { opponent } = req.body;
      const peerId = await r.hget(CHALLENGE_KEY, opponent) as string | null;
      if (peerId) {
        await r.hdel(CHALLENGE_KEY, opponent);
        return res.json({ ok: true, peerId });
      }
      return res.json({ ok: false, error: "Challenge expired" });
    }

    // Cancel own challenge
    if (action === "cancel-challenge") {
      await r.hdel(CHALLENGE_KEY, player);
      return res.json({ ok: true });
    }

    if (score !== undefined) {
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
