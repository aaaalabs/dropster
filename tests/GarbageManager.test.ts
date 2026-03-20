import { describe, it, expect, vi } from "vitest";
import { GarbageManager } from "../src/game/GarbageManager";

describe("GarbageManager", () => {
  it("queues incoming garbage", () => {
    const gm = new GarbageManager();
    gm.queueGarbage(3);
    expect(gm.pendingLines).toBe(3);
  });

  it("accumulates garbage", () => {
    const gm = new GarbageManager();
    gm.queueGarbage(2);
    gm.queueGarbage(3);
    expect(gm.pendingLines).toBe(5);
  });

  it("counter-garbage cancels pending", () => {
    const gm = new GarbageManager();
    gm.queueGarbage(4);
    const remaining = gm.counterGarbage(2);
    expect(gm.pendingLines).toBe(2);
    expect(remaining).toBe(0);
  });

  it("counter-garbage returns excess as sendable", () => {
    const gm = new GarbageManager();
    gm.queueGarbage(1);
    const remaining = gm.counterGarbage(3);
    expect(gm.pendingLines).toBe(0);
    expect(remaining).toBe(2);
  });

  it("calculates garbage to send from cleared rows", () => {
    const gm = new GarbageManager();
    expect(gm.calcGarbageToSend(1, 0)).toBe(0);
    expect(gm.calcGarbageToSend(2, 0)).toBe(1);
    expect(gm.calcGarbageToSend(3, 0)).toBe(2);
    expect(gm.calcGarbageToSend(4, 0)).toBe(4);
  });

  it("adds combo bonus", () => {
    const gm = new GarbageManager();
    expect(gm.calcGarbageToSend(2, 1)).toBe(2);
    expect(gm.calcGarbageToSend(2, 3)).toBe(4);
  });

  it("applies pending garbage after delay", () => {
    vi.useFakeTimers();
    const gm = new GarbageManager();
    gm.queueGarbage(2);
    const ready1 = gm.getReadyGarbage();
    expect(ready1).toBe(0);

    vi.advanceTimersByTime(500);
    const ready2 = gm.getReadyGarbage();
    expect(ready2).toBe(2);
    expect(gm.pendingLines).toBe(0);

    vi.useRealTimers();
  });
});
