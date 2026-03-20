import { describe, it, expect } from "vitest";
import { encodeMessage, decodeMessage } from "../src/network/Protocol";

describe("Protocol", () => {
  it("encodes and decodes ready message", () => {
    const msg = { type: "ready" as const };
    const encoded = encodeMessage(msg);
    const decoded = decodeMessage(encoded);
    expect(decoded).toEqual(msg);
  });

  it("encodes and decodes garbage message", () => {
    const msg = { type: "garbage" as const, lines: 3 };
    const encoded = encodeMessage(msg);
    const decoded = decodeMessage(encoded);
    expect(decoded).toEqual(msg);
  });

  it("encodes and decodes board message", () => {
    const grid = Array.from({ length: 20 }, () => new Array(10).fill(0));
    grid[19][5] = 3;
    const msg = { type: "board" as const, grid };
    const encoded = encodeMessage(msg);
    const decoded = decodeMessage(encoded);
    expect(decoded).toEqual(msg);
  });

  it("encodes and decodes gameOver message", () => {
    const msg = { type: "gameOver" as const };
    const encoded = encodeMessage(msg);
    const decoded = decodeMessage(encoded);
    expect(decoded).toEqual(msg);
  });

  it("returns null for invalid message", () => {
    const decoded = decodeMessage("not json");
    expect(decoded).toBeNull();
  });

  it("returns null for unknown message type", () => {
    const decoded = decodeMessage(JSON.stringify({ type: "unknown" }));
    expect(decoded).toBeNull();
  });
});
