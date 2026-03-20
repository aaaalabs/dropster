import { PieceType } from "../types";
import { Board } from "./Board";
import { Piece } from "./Piece";
import { BagRandomizer } from "./BagRandomizer";
import { GarbageManager } from "./GarbageManager";
import {
  COLS,
  SCORING,
  SPEED_INITIAL,
  SPEED_DECREASE_PER_LEVEL,
  SPEED_MIN,
  LEVEL_INTERVAL_MS,
  PIECE_SHAPES,
} from "./constants";

export class GameEngine {
  board = new Board();
  currentPiece: Piece;
  heldPiece: PieceType | null = null;
  score = 0;
  combo = 0;
  gameOver = false;

  onGarbage: ((lines: number) => void) | null = null;
  onBoardUpdate: (() => void) | null = null;
  onGameOver: (() => void) | null = null;
  onLineClear: ((count: number, rows: number[]) => void) | null = null;

  private bag = new BagRandomizer();
  private holdUsed = false;
  readonly garbageManager = new GarbageManager();
  constructor() {
    this.currentPiece = this.spawnPiece();
  }

  start(_time: number): void {
    // Game start timestamp — reserved for future use
  }

  get nextPieceType(): PieceType {
    return this.bag.peek();
  }

  moveLeft(): boolean {
    return this.tryMove(-1, 0);
  }

  moveRight(): boolean {
    return this.tryMove(1, 0);
  }

  gravityDrop(): boolean {
    if (!this.tryMove(0, 1)) {
      this.lockPiece();
      return false;
    }
    return true;
  }

  softDrop(): boolean {
    const moved = this.tryMove(0, 1);
    if (moved) this.score += SCORING.softDrop;
    return moved;
  }

  hardDrop(): void {
    let rows = 0;
    while (this.tryMove(0, 1)) {
      rows++;
    }
    this.score += rows * SCORING.hardDrop;
    this.lockPiece();
  }

  rotateCW(): boolean {
    return this.tryRotate(1);
  }

  rotateCCW(): boolean {
    return this.tryRotate(-1);
  }

  holdPiece(): void {
    if (this.holdUsed) return;
    this.holdUsed = true;
    const currentType = this.currentPiece.type;
    if (this.heldPiece) {
      this.currentPiece = new Piece(this.heldPiece, this.getSpawnCol(this.heldPiece));
    } else {
      this.currentPiece = this.spawnPiece();
    }
    this.heldPiece = currentType;
  }

  getDropInterval(elapsed: number): number {
    const level = Math.floor(elapsed / LEVEL_INTERVAL_MS);
    return Math.max(SPEED_MIN, SPEED_INITIAL - level * SPEED_DECREASE_PER_LEVEL);
  }

  tick(_elapsed: number): void {
    if (this.gameOver) return;

    const readyGarbage = this.garbageManager.getReadyGarbage();
    if (readyGarbage > 0) {
      const gaps = Array.from({ length: readyGarbage }, () =>
        Math.floor(Math.random() * COLS)
      );
      this.board.addGarbageLines(readyGarbage, gaps);
      if (!this.board.isValidPosition(this.currentPiece.getBlocks())) {
        this.currentPiece.pos.y = Math.max(0, this.currentPiece.pos.y - readyGarbage);
        if (!this.board.isValidPosition(this.currentPiece.getBlocks())) {
          this.triggerGameOver();
        }
      }
    }
  }

  receiveGarbage(lines: number): void {
    this.garbageManager.queueGarbage(lines);
  }

  private tryMove(dx: number, dy: number): boolean {
    const newBlocks = this.currentPiece.getBlocks().map(b => ({
      x: b.x + dx,
      y: b.y + dy,
    }));
    if (this.board.isValidPosition(newBlocks)) {
      this.currentPiece.pos.x += dx;
      this.currentPiece.pos.y += dy;
      return true;
    }
    return false;
  }

  private tryRotate(direction: number): boolean {
    const piece = this.currentPiece;
    const fromRotation = piece.rotation;
    const toRotation = ((fromRotation + direction) % 4 + 4) % 4;
    const kicks = piece.getWallKicks(fromRotation, toRotation);

    piece.rotation = toRotation;
    for (const [dx, dy] of kicks) {
      const blocks = piece.getBlocks().map(b => ({
        x: b.x + dx,
        y: b.y - dy,
      }));
      if (this.board.isValidPosition(blocks)) {
        piece.pos.x += dx;
        piece.pos.y -= dy;
        return true;
      }
    }
    piece.rotation = fromRotation;
    return false;
  }

  private lockPiece(): void {
    this.board.placePiece(this.currentPiece);
    const clearedRows = this.board.getFullRows();
    const cleared = this.board.clearFullRows();

    if (cleared > 0) {
      const scoreKey = ["single", "double", "triple", "tetris"][cleared - 1] as keyof typeof SCORING;
      const baseScore = SCORING[scoreKey] as number;
      const multiplier = this.combo > 0 ? Math.pow(SCORING.comboMultiplier, this.combo) : 1;
      this.score += Math.floor(baseScore * multiplier);
      this.combo++;

      this.onLineClear?.(cleared, clearedRows);

      const garbageToSend = this.garbageManager.calcGarbageToSend(cleared, Math.max(0, this.combo - 1));
      const netGarbage = this.garbageManager.counterGarbage(garbageToSend);
      if (netGarbage > 0 && this.onGarbage) {
        this.onGarbage(netGarbage);
      }
    } else {
      this.combo = 0;
    }

    this.holdUsed = false;
    this.currentPiece = this.spawnPiece();

    if (!this.board.isValidPosition(this.currentPiece.getBlocks())) {
      this.triggerGameOver();
    }

    this.onBoardUpdate?.();
  }

  private spawnPiece(): Piece {
    const type = this.bag.next();
    return new Piece(type, this.getSpawnCol(type));
  }

  private getSpawnCol(type: PieceType): number {
    const shape = PIECE_SHAPES[type][0];
    const width = Math.max(...shape.map(([_, c]) => c)) + 1;
    return Math.floor((COLS - width) / 2);
  }

  private triggerGameOver(): void {
    this.gameOver = true;
    this.onGameOver?.();
  }
}
