import { Cell, Grid, Position } from "../types";
import { COLS, ROWS } from "./constants";
import { Piece } from "./Piece";

export class Board {
  grid: Grid;

  constructor() {
    this.grid = Array.from({ length: ROWS }, () =>
      new Array<Cell>(COLS).fill(0)
    );
  }

  isValidPosition(blocks: Position[]): boolean {
    return blocks.every(
      ({ x, y }) =>
        x >= 0 && x < COLS && y >= 0 && y < ROWS && this.grid[y][x] === 0
    );
  }

  placePiece(piece: Piece): void {
    for (const { x, y } of piece.getBlocks()) {
      this.grid[y][x] = piece.colorIndex as Cell;
    }
  }

  clearFullRows(): number {
    let cleared = 0;
    for (let y = ROWS - 1; y >= 0; y--) {
      if (this.grid[y].every(cell => cell !== 0)) {
        this.grid.splice(y, 1);
        this.grid.unshift(new Array<Cell>(COLS).fill(0));
        cleared++;
        y++; // re-check this row since rows shifted down
      }
    }
    return cleared;
  }

  getFullRows(): number[] {
    const rows: number[] = [];
    for (let y = 0; y < ROWS; y++) {
      if (this.grid[y].every(cell => cell !== 0)) rows.push(y);
    }
    return rows;
  }

  addGarbageLines(count: number, gapColumns: number[]): void {
    this.grid.splice(0, count);
    for (let i = count - 1; i >= 0; i--) {
      const row = new Array<Cell>(COLS).fill(8 as Cell);
      row[gapColumns[i]] = 0;
      this.grid.push(row);
    }
  }

  getGhostY(piece: Piece): number {
    let ghostY = piece.pos.y;
    while (true) {
      ghostY++;
      const blocks = piece.getBlocks().map(b => ({
        x: b.x,
        y: b.y - piece.pos.y + ghostY,
      }));
      if (!this.isValidPosition(blocks)) {
        return ghostY - 1;
      }
    }
  }

  toColorGrid(): number[][] {
    return this.grid.map(row => [...row]);
  }
}
