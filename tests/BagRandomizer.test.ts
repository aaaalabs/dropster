import { describe, it, expect } from "vitest";
import { BagRandomizer } from "../src/game/BagRandomizer";

describe("BagRandomizer", () => {
  it("returns all 7 piece types in first bag", () => {
    const bag = new BagRandomizer();
    const pieces: string[] = [];
    for (let i = 0; i < 7; i++) {
      pieces.push(bag.next());
    }
    expect(pieces.sort()).toEqual(["I", "J", "L", "O", "S", "T", "Z"]);
  });

  it("returns all 7 piece types in second bag", () => {
    const bag = new BagRandomizer();
    for (let i = 0; i < 7; i++) bag.next();
    const pieces: string[] = [];
    for (let i = 0; i < 7; i++) {
      pieces.push(bag.next());
    }
    expect(pieces.sort()).toEqual(["I", "J", "L", "O", "S", "T", "Z"]);
  });

  it("peek returns next piece without consuming it", () => {
    const bag = new BagRandomizer();
    const peeked = bag.peek();
    const drawn = bag.next();
    expect(peeked).toBe(drawn);
  });
});
