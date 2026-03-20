import { PieceType } from "../types";

export const COLS = 10;
export const ROWS = 20;

export const PIECE_COLORS: Record<PieceType, string> = {
  I: "#00f0f0",
  O: "#f0f000",
  T: "#a000f0",
  S: "#00f000",
  Z: "#f00000",
  J: "#0000f0",
  L: "#f0a000",
};

export const PIECE_INDEX: Record<PieceType, number> = {
  I: 1, O: 2, T: 3, S: 4, Z: 5, J: 6, L: 7,
};

// SRS piece shapes: 4 rotation states, each is a list of [row, col] offsets
// Using standard SRS coordinates (https://tetris.wiki/SRS)
export const PIECE_SHAPES: Record<PieceType, number[][][]> = {
  I: [
    [[1,0],[1,1],[1,2],[1,3]],  // 0: horizontal
    [[0,2],[1,2],[2,2],[3,2]],  // R: vertical right
    [[2,0],[2,1],[2,2],[2,3]],  // 2: horizontal low
    [[0,1],[1,1],[2,1],[3,1]],  // L: vertical left
  ],
  O: [
    [[0,0],[0,1],[1,0],[1,1]],
    [[0,0],[0,1],[1,0],[1,1]],
    [[0,0],[0,1],[1,0],[1,1]],
    [[0,0],[0,1],[1,0],[1,1]],
  ],
  T: [
    [[0,1],[1,0],[1,1],[1,2]],  // 0: T up
    [[0,0],[1,0],[1,1],[2,0]],  // R: T right
    [[0,0],[0,1],[0,2],[1,1]],  // 2: T down
    [[0,1],[1,0],[1,1],[2,1]],  // L: T left
  ],
  S: [
    [[0,1],[0,2],[1,0],[1,1]],  // 0
    [[0,0],[1,0],[1,1],[2,1]],  // R
    [[1,1],[1,2],[2,0],[2,1]],  // 2
    [[0,0],[1,0],[1,1],[2,1]],  // L (same visual but offset)
  ],
  Z: [
    [[0,0],[0,1],[1,1],[1,2]],  // 0
    [[0,1],[1,0],[1,1],[2,0]],  // R
    [[1,0],[1,1],[2,1],[2,2]],  // 2
    [[0,1],[1,0],[1,1],[2,0]],  // L (same visual but offset)
  ],
  J: [
    [[0,0],[1,0],[1,1],[1,2]],  // 0: J up
    [[0,0],[0,1],[1,0],[2,0]],  // R: J right
    [[0,0],[0,1],[0,2],[1,2]],  // 2: J down
    [[0,0],[1,0],[2,0],[2,1]],  // L: J left
  ],
  L: [
    [[0,2],[1,0],[1,1],[1,2]],  // 0: L up
    [[0,0],[1,0],[2,0],[2,1]],  // R: L right
    [[0,0],[0,1],[0,2],[1,0]],  // 2: L down
    [[0,0],[0,1],[1,1],[2,1]],  // L: L left
  ],
};

// SRS wall kick data (non-I pieces)
export const WALL_KICKS: Record<string, number[][]> = {
  "0>1": [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  "1>0": [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  "1>2": [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  "2>1": [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  "2>3": [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  "3>2": [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  "3>0": [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  "0>3": [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
};

// SRS wall kick data (I piece)
export const WALL_KICKS_I: Record<string, number[][]> = {
  "0>1": [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  "1>0": [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
  "1>2": [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
  "2>1": [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
  "2>3": [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
  "3>2": [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  "3>0": [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
  "0>3": [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
};

export const SPEED_INITIAL = 1000;
export const SPEED_DECREASE_PER_LEVEL = 100;
export const SPEED_MIN = 100;
export const LEVEL_INTERVAL_MS = 60000;

export const DAS_DELAY = 170;
export const ARR_DELAY = 50;

export const GARBAGE_DELAY_MS = 500;

export const SCORING = {
  single: 100,
  double: 300,
  triple: 500,
  tetris: 800,
  softDrop: 1,
  hardDrop: 2,
  comboMultiplier: 1.5,
};

export const GARBAGE_TABLE = [0, 0, 1, 2, 4]; // index = rows cleared

export const ALL_PIECE_TYPES: PieceType[] = ["I", "O", "T", "S", "Z", "J", "L"];
