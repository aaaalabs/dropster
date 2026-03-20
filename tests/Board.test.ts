import { describe, it, expect } from "vitest";
import { Board } from "../src/game/Board";
import { Piece } from "../src/game/Piece";

describe("Board", () => {
  it("creates empty 10x20 grid", () => {
    const board = new Board();
    expect(board.grid.length).toBe(20);
    expect(board.grid[0].length).toBe(10);
    expect(board.grid.every(row => row.every(cell => cell === 0))).toBe(true);
  });

  it("detects valid position", () => {
    const board = new Board();
    const piece = new Piece("T", 3);
    expect(board.isValidPosition(piece.getBlocks())).toBe(true);
  });

  it("detects out-of-bounds left", () => {
    const board = new Board();
    const piece = new Piece("T", -2);
    expect(board.isValidPosition(piece.getBlocks())).toBe(false);
  });

  it("detects out-of-bounds right", () => {
    const board = new Board();
    const piece = new Piece("I", 8);
    expect(board.isValidPosition(piece.getBlocks())).toBe(false);
  });

  it("detects collision with placed block", () => {
    const board = new Board();
    board.grid[1][4] = 3;
    const piece = new Piece("T", 3);
    expect(board.isValidPosition(piece.getBlocks())).toBe(false);
  });

  it("places piece on grid", () => {
    const board = new Board();
    const piece = new Piece("O", 4);
    piece.pos.y = 18;
    board.placePiece(piece);
    expect(board.grid[18][4]).toBe(2);
    expect(board.grid[18][5]).toBe(2);
    expect(board.grid[19][4]).toBe(2);
    expect(board.grid[19][5]).toBe(2);
  });

  it("clears full rows and returns count", () => {
    const board = new Board();
    for (let x = 0; x < 10; x++) {
      board.grid[19][x] = 1;
    }
    const cleared = board.clearFullRows();
    expect(cleared).toBe(1);
    expect(board.grid[19].every(cell => cell === 0)).toBe(true);
  });

  it("clears multiple rows and shifts down", () => {
    const board = new Board();
    for (let x = 0; x < 10; x++) {
      board.grid[18][x] = 1;
      board.grid[19][x] = 1;
    }
    board.grid[17][5] = 3;
    const cleared = board.clearFullRows();
    expect(cleared).toBe(2);
    expect(board.grid[19][5]).toBe(3);
  });

  it("adds garbage lines from bottom", () => {
    const board = new Board();
    board.grid[19][5] = 3;
    board.addGarbageLines(2, [3, 7]);
    expect(board.grid[17][5]).toBe(3);
    expect(board.grid[19][3]).toBe(0);
    expect(board.grid[19][0]).toBe(8);
    expect(board.grid[18][7]).toBe(0);
    expect(board.grid[18][0]).toBe(8);
  });

  it("calculates ghost position", () => {
    const board = new Board();
    const piece = new Piece("T", 3);
    const ghostY = board.getGhostY(piece);
    // T piece in SRS rotation 0: [[0,1],[1,0],[1,1],[1,2]] - 2 rows tall
    // Should land at y=18 (row 18 and 19 occupied)
    expect(ghostY).toBe(18);
  });

  it("detects game over when piece cannot be placed at spawn", () => {
    const board = new Board();
    for (let x = 0; x < 10; x++) {
      board.grid[0][x] = 1;
      board.grid[1][x] = 1;
    }
    const piece = new Piece("T", 3);
    expect(board.isValidPosition(piece.getBlocks())).toBe(false);
  });
});
