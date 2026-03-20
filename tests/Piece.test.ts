import { describe, it, expect } from "vitest";
import { Piece } from "../src/game/Piece";
import { WALL_KICKS, WALL_KICKS_I } from "../src/game/constants";

describe("Piece", () => {
  describe("constructor", () => {
    it("creates an I piece with correct defaults", () => {
      const piece = new Piece("I");
      expect(piece.type).toBe("I");
      expect(piece.colorIndex).toBe(1);
      expect(piece.rotation).toBe(0);
      expect(piece.pos).toEqual({ x: 3, y: 0 });
    });

    it("creates a T piece with correct colorIndex", () => {
      const piece = new Piece("T");
      expect(piece.colorIndex).toBe(3);
    });

    it("accepts a custom startCol", () => {
      const piece = new Piece("O", 5);
      expect(piece.pos).toEqual({ x: 5, y: 0 });
    });

    it("assigns correct colorIndex for all piece types", () => {
      expect(new Piece("I").colorIndex).toBe(1);
      expect(new Piece("O").colorIndex).toBe(2);
      expect(new Piece("T").colorIndex).toBe(3);
      expect(new Piece("S").colorIndex).toBe(4);
      expect(new Piece("Z").colorIndex).toBe(5);
      expect(new Piece("J").colorIndex).toBe(6);
      expect(new Piece("L").colorIndex).toBe(7);
    });
  });

  describe("getBlocks", () => {
    it("returns correct blocks for I piece at rotation 0, startCol=3", () => {
      // SRS I rotation 0: [[1,0],[1,1],[1,2],[1,3]]
      // pos = {x:3, y:0} → x = 3+c, y = 0+r
      const piece = new Piece("I", 3);
      const blocks = piece.getBlocks();
      expect(blocks).toEqual([
        { x: 3, y: 1 },
        { x: 4, y: 1 },
        { x: 5, y: 1 },
        { x: 6, y: 1 },
      ]);
    });

    it("returns correct blocks for T piece at rotation 0, startCol=3", () => {
      // SRS T rotation 0: [[0,1],[1,0],[1,1],[1,2]]
      // pos = {x:3, y:0} → x = 3+c, y = 0+r
      const piece = new Piece("T", 3);
      const blocks = piece.getBlocks();
      expect(blocks).toEqual([
        { x: 4, y: 0 },
        { x: 3, y: 1 },
        { x: 4, y: 1 },
        { x: 5, y: 1 },
      ]);
    });

    it("returns correct blocks for O piece at rotation 0", () => {
      // SRS O rotation 0: [[0,0],[0,1],[1,0],[1,1]]
      const piece = new Piece("O", 4);
      const blocks = piece.getBlocks();
      expect(blocks).toEqual([
        { x: 4, y: 0 },
        { x: 5, y: 0 },
        { x: 4, y: 1 },
        { x: 5, y: 1 },
      ]);
    });

    it("returns correct blocks for J piece at rotation 0", () => {
      // SRS J rotation 0: [[0,0],[1,0],[1,1],[1,2]]
      const piece = new Piece("J", 3);
      const blocks = piece.getBlocks();
      expect(blocks).toEqual([
        { x: 3, y: 0 },
        { x: 3, y: 1 },
        { x: 4, y: 1 },
        { x: 5, y: 1 },
      ]);
    });

    it("returns correct blocks for L piece at rotation 0", () => {
      // SRS L rotation 0: [[0,2],[1,0],[1,1],[1,2]]
      const piece = new Piece("L", 3);
      const blocks = piece.getBlocks();
      expect(blocks).toEqual([
        { x: 5, y: 0 },
        { x: 3, y: 1 },
        { x: 4, y: 1 },
        { x: 5, y: 1 },
      ]);
    });

    it("accounts for piece position offset", () => {
      const piece = new Piece("I", 0);
      piece.pos = { x: 2, y: 5 };
      const blocks = piece.getBlocks();
      // rotation 0: [[1,0],[1,1],[1,2],[1,3]] → y=5+1=6, x=2+c
      expect(blocks).toEqual([
        { x: 2, y: 6 },
        { x: 3, y: 6 },
        { x: 4, y: 6 },
        { x: 5, y: 6 },
      ]);
    });

    it("returns correct blocks for I piece at rotation 1 (vertical)", () => {
      // SRS I rotation 1: [[0,2],[1,2],[2,2],[3,2]]
      const piece = new Piece("I", 3);
      piece.rotation = 1;
      const blocks = piece.getBlocks();
      expect(blocks).toEqual([
        { x: 5, y: 0 },
        { x: 5, y: 1 },
        { x: 5, y: 2 },
        { x: 5, y: 3 },
      ]);
    });

    it("returns correct blocks for T piece at rotation 1 (right)", () => {
      // SRS T rotation 1: [[0,0],[1,0],[1,1],[2,0]]
      const piece = new Piece("T", 3);
      piece.rotation = 1;
      const blocks = piece.getBlocks();
      expect(blocks).toEqual([
        { x: 3, y: 0 },
        { x: 3, y: 1 },
        { x: 4, y: 1 },
        { x: 3, y: 2 },
      ]);
    });

    it("returns correct blocks for S piece at rotation 0", () => {
      // SRS S rotation 0: [[0,1],[0,2],[1,0],[1,1]]
      const piece = new Piece("S", 3);
      const blocks = piece.getBlocks();
      expect(blocks).toEqual([
        { x: 4, y: 0 },
        { x: 5, y: 0 },
        { x: 3, y: 1 },
        { x: 4, y: 1 },
      ]);
    });

    it("returns correct blocks for Z piece at rotation 0", () => {
      // SRS Z rotation 0: [[0,0],[0,1],[1,1],[1,2]]
      const piece = new Piece("Z", 3);
      const blocks = piece.getBlocks();
      expect(blocks).toEqual([
        { x: 3, y: 0 },
        { x: 4, y: 0 },
        { x: 4, y: 1 },
        { x: 5, y: 1 },
      ]);
    });
  });

  describe("getWallKicks", () => {
    it("returns standard wall kicks for non-I piece (0>1)", () => {
      const piece = new Piece("T");
      const kicks = piece.getWallKicks(0, 1);
      expect(kicks).toEqual(WALL_KICKS["0>1"]);
    });

    it("returns standard wall kicks for non-I piece (2>3)", () => {
      const piece = new Piece("S");
      const kicks = piece.getWallKicks(2, 3);
      expect(kicks).toEqual(WALL_KICKS["2>3"]);
    });

    it("returns I-piece wall kicks for I piece (0>1)", () => {
      const piece = new Piece("I");
      const kicks = piece.getWallKicks(0, 1);
      expect(kicks).toEqual(WALL_KICKS_I["0>1"]);
    });

    it("returns I-piece wall kicks for I piece (3>0)", () => {
      const piece = new Piece("I");
      const kicks = piece.getWallKicks(3, 0);
      expect(kicks).toEqual(WALL_KICKS_I["3>0"]);
    });

    it("returns 5 kick offsets per rotation transition", () => {
      const tPiece = new Piece("T");
      expect(tPiece.getWallKicks(0, 1)).toHaveLength(5);

      const iPiece = new Piece("I");
      expect(iPiece.getWallKicks(1, 2)).toHaveLength(5);
    });

    it("first kick offset is always [0,0] (no kick attempt)", () => {
      const piece = new Piece("J");
      const kicks = piece.getWallKicks(1, 2);
      expect(kicks[0]).toEqual([0, 0]);
    });
  });

  describe("clone", () => {
    it("returns a new Piece instance with same properties", () => {
      const original = new Piece("T", 4);
      original.rotation = 2;
      original.pos = { x: 4, y: 7 };

      const cloned = original.clone();

      expect(cloned).not.toBe(original);
      expect(cloned.type).toBe("T");
      expect(cloned.colorIndex).toBe(3);
      expect(cloned.rotation).toBe(2);
      expect(cloned.pos).toEqual({ x: 4, y: 7 });
    });

    it("clone is independent — mutating clone does not affect original", () => {
      const original = new Piece("I", 3);
      const cloned = original.clone();

      cloned.rotation = 3;
      cloned.pos = { x: 99, y: 99 };

      expect(original.rotation).toBe(0);
      expect(original.pos).toEqual({ x: 3, y: 0 });
    });

    it("clone produces same blocks as original", () => {
      const original = new Piece("L", 3);
      original.rotation = 1;
      original.pos = { x: 2, y: 5 };

      const cloned = original.clone();
      expect(cloned.getBlocks()).toEqual(original.getBlocks());
    });
  });
});
