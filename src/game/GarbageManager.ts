import { GARBAGE_TABLE, GARBAGE_DELAY_MS } from "./constants";

interface QueuedGarbage {
  lines: number;
  queuedAt: number;
}

export class GarbageManager {
  private queue: QueuedGarbage[] = [];

  get pendingLines(): number {
    return this.queue.reduce((sum, g) => sum + g.lines, 0);
  }

  queueGarbage(lines: number): void {
    if (lines <= 0) return;
    this.queue.push({ lines, queuedAt: Date.now() });
  }

  counterGarbage(linesCleared: number): number {
    let counter = linesCleared;
    while (counter > 0 && this.queue.length > 0) {
      const front = this.queue[0];
      if (front.lines <= counter) {
        counter -= front.lines;
        this.queue.shift();
      } else {
        front.lines -= counter;
        counter = 0;
      }
    }
    return counter;
  }

  calcGarbageToSend(rowsCleared: number, combo: number): number {
    const base = GARBAGE_TABLE[Math.min(rowsCleared, 4)] ?? 0;
    return base + combo;
  }

  getReadyGarbage(): number {
    const now = Date.now();
    let ready = 0;
    this.queue = this.queue.filter(g => {
      if (now - g.queuedAt >= GARBAGE_DELAY_MS) {
        ready += g.lines;
        return false;
      }
      return true;
    });
    return ready;
  }

  reset(): void {
    this.queue = [];
  }
}
