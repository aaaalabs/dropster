import { describe, it, expect } from "vitest";
import { Board } from "../src/game/Board";
import { Piece } from "../src/game/Piece";
import { ROWS, COLS } from "../src/game/constants";

describe("Board", () => {
  it("creates empty grid with correct dimensions", () => {
    const board = new Board();
    expect(board.grid.length).toBe(ROWS);
    expect(board.grid[0].length).toBe(COLS);
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
    piece.pos.y = ROWS - 2;
    board.placePiece(piece);
    expect(board.grid[ROWS - 2][4]).toBe(2);
    expect(board.grid[ROWS - 2][5]).toBe(2);
    expect(board.grid[ROWS - 1][4]).toBe(2);
    expect(board.grid[ROWS - 1][5]).toBe(2);
  });

  it("clears full rows and returns count", () => {
    const board = new Board();
    for (let x = 0; x < COLS; x++) {
      board.grid[ROWS - 1][x] = 1;
    }
    const cleared = board.clearFullRows();
    expect(cleared).toBe(1);
    expect(board.grid[ROWS - 1].every(cell => cell === 0)).toBe(true);
  });

  it("clears multiple rows and shifts down", () => {
    const board = new Board();
    for (let x = 0; x < COLS; x++) {
      board.grid[ROWS - 2][x] = 1;
      board.grid[ROWS - 1][x] = 1;
    }
    board.grid[ROWS - 3][5] = 3;
    const cleared = board.clearFullRows();
    expect(cleared).toBe(2);
    expect(board.grid[ROWS - 1][5]).toBe(3);
  });

  it("adds garbage lines from bottom", () => {
    const board = new Board();
    board.grid[ROWS - 1][5] = 3;
    board.addGarbageLines(2, [3, 7]);
    expect(board.grid[ROWS - 3][5]).toBe(3);
    expect(board.grid[ROWS - 1][3]).toBe(0);
    expect(board.grid[ROWS - 1][0]).toBe(8);
    expect(board.grid[ROWS - 2][7]).toBe(0);
    expect(board.grid[ROWS - 2][0]).toBe(8);
  });

  it("calculates ghost position", () => {
    const board = new Board();
    const piece = new Piece("T", 3);
    const ghostY = board.getGhostY(piece);
    // T piece is 2 rows tall, lands at ROWS-2
    expect(ghostY).toBe(ROWS - 2);
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
