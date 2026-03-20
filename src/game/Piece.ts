import { PieceType, Position } from "../types";
import { PIECE_SHAPES, PIECE_INDEX, WALL_KICKS, WALL_KICKS_I } from "./constants";

export class Piece {
  readonly type: PieceType;
  readonly colorIndex: number;
  rotation: number;
  pos: Position;

  constructor(type: PieceType, startCol: number = 3) {
    this.type = type;
    this.colorIndex = PIECE_INDEX[type];
    this.rotation = 0;
    this.pos = { x: startCol, y: 0 };
  }

  getBlocks(): Position[] {
    return PIECE_SHAPES[this.type][this.rotation].map(([r, c]) => ({
      x: this.pos.x + c,
      y: this.pos.y + r,
    }));
  }

  getWallKicks(fromRotation: number, toRotation: number): number[][] {
    const key = `${fromRotation}>${toRotation}`;
    return this.type === "I" ? WALL_KICKS_I[key] : WALL_KICKS[key];
  }

  clone(): Piece {
    const p = new Piece(this.type, this.pos.x);
    p.rotation = this.rotation;
    p.pos = { ...this.pos };
    return p;
  }
}
