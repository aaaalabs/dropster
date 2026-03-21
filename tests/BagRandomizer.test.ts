import { describe, it, expect } from "vitest";
import { BagRandomizer } from "../src/game/BagRandomizer";

describe("BagRandomizer", () => {
  it("returns exactly 2 of each piece type per bag (double-bag)", () => {
    const bag = new BagRandomizer();
    const pieces: string[] = [];
    for (let i = 0; i < 14; i++) {
      pieces.push(bag.next());
    }
    const counts = new Map<string, number>();
    for (const p of pieces) counts.set(p, (counts.get(p) ?? 0) + 1);
    expect(counts.size).toBe(7);
    for (const c of counts.values()) expect(c).toBe(2);
  });

  it("refills after 14 pieces", () => {
    const bag = new BagRandomizer();
    // Drain first bag
    for (let i = 0; i < 14; i++) bag.next();
    // Second bag should also have all 7 types × 2
    const pieces: string[] = [];
    for (let i = 0; i < 14; i++) {
      pieces.push(bag.next());
    }
    const counts = new Map<string, number>();
    for (const p of pieces) counts.set(p, (counts.get(p) ?? 0) + 1);
    expect(counts.size).toBe(7);
    for (const c of counts.values()) expect(c).toBe(2);
  });

  it("peek returns next piece without consuming it", () => {
    const bag = new BagRandomizer();
    const peeked = bag.peek();
    const drawn = bag.next();
    expect(peeked).toBe(drawn);
  });
});
