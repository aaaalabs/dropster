export type PieceType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";

export type Cell = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
// 0 = empty, 1-7 = piece color index (I=1, O=2, T=3, S=4, Z=5, J=6, L=7), 8 = garbage

export type Grid = Cell[][];

export interface Position {
  x: number;
  y: number;
}

export type GameState = "lobby" | "countdown" | "playing" | "paused" | "gameOver";
