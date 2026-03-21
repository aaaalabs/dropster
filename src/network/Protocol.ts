export type Message =
  | { type: "ready" }
  | { type: "garbage"; lines: number }
  | { type: "board"; grid: number[][]; score?: number }
  | { type: "gameOver" }
  | { type: "pause" }
  | { type: "pauseAccept" }
  | { type: "pauseDeny" }
  | { type: "unpause" };

const VALID_TYPES = new Set([
  "ready", "garbage", "board", "gameOver",
  "pause", "pauseAccept", "pauseDeny", "unpause",
]);

export function encodeMessage(msg: Message): string {
  return JSON.stringify(msg);
}

export function decodeMessage(data: string): Message | null {
  try {
    const parsed = JSON.parse(data);
    if (parsed && typeof parsed.type === "string" && VALID_TYPES.has(parsed.type)) {
      return parsed as Message;
    }
    return null;
  } catch {
    return null;
  }
}
