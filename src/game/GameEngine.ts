import { PieceType } from "../types";
import { Board } from "./Board";
import { Piece } from "./Piece";
import { BagRandomizer } from "./BagRandomizer";
import { GarbageManager } from "./GarbageManager";
import {
  COLS,
  ROWS,
  SCORING,
  PIECE_SHAPES,
} from "./constants";

export interface DifficultyConfig {
  speedInitial: number;
  speedDecrease: number;
  speedMin: number;
  levelInterval: number;
  scoreMultiplier: number;   // multiplies all scores
  garbageInterval: number;   // ms between random garbage lines, 0 = off
  garbageAmount: number;     // lines per garbage event
  hue: number;               // base hue for board color identity
}

export const DIFFICULTIES: Record<string, DifficultyConfig> = {
  chill:  { speedInitial: 1200, speedDecrease: 30, speedMin: 300, levelInterval: 120000, scoreMultiplier: 0.5, garbageInterval: 0,     garbageAmount: 0, hue: 200 },
  normal: { speedInitial: 1000, speedDecrease: 50, speedMin: 200, levelInterval: 90000,  scoreMultiplier: 1.0, garbageInterval: 0,     garbageAmount: 0, hue: 260 },
  hard:   { speedInitial: 700,  speedDecrease: 60, speedMin: 120, levelInterval: 60000,  scoreMultiplier: 1.5, garbageInterval: 0,     garbageAmount: 0, hue: 30  },
  insane: { speedInitial: 500,  speedDecrease: 50, speedMin: 80,  levelInterval: 45000,  scoreMultiplier: 2.5, garbageInterval: 20000, garbageAmount: 2, hue: 0   },
};

export class GameEngine {
  board = new Board();
  currentPiece: Piece;
  heldPiece: PieceType | null = null;
  score = 0;
  combo = 0;
  gameOver = false;
  level = 0;
  lastClearWasTetris = false;
  isBackToBack = false;

  onGarbage: ((lines: number) => void) | null = null;
  onBoardUpdate: (() => void) | null = null;
  onGameOver: (() => void) | null = null;
  onLineClear: ((count: number, rows: number[], snapshots: { row: number; cells: number[] }[]) => void) | null = null;
  onSpecialEvent: ((event: string) => void) | null = null;

  private bag = new BagRandomizer();
  private previewQueue: PieceType[] = [];
  private holdUsed = false;
  private wasInDanger = false;
  private pieceSpawnTime = 0;
  private highScore: number;
  readonly garbageManager = new GarbageManager();
  private diff: DifficultyConfig;
  private playerName: string;

  constructor(difficulty: string = "normal", player: string = "default") {
    this.diff = DIFFICULTIES[difficulty] ?? DIFFICULTIES.normal;
    this.playerName = player;
    this.highScore = parseInt(this.localStorageGet(`dropster-highscore-${player}`) ?? "0", 10);
    for (let i = 0; i < 3; i++) {
      this.previewQueue.push(this.bag.next());
    }
    this.currentPiece = this.spawnPiece();
  }

  private localStorageGet(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  private localStorageSet(key: string, value: string): void {
    try { localStorage.setItem(key, value); } catch { /* no-op in non-browser env */ }
  }

  get isNewHighScore(): boolean {
    return this.score > this.highScore && this.highScore > 0;
  }

  get currentHighScore(): number {
    return this.highScore;
  }

  get baseHue(): number {
    return this.diff.hue;
  }

  get difficultyName(): string {
    return this.playerName;
  }

  start(_time: number): void {
    // Game start timestamp — reserved for future use
  }

  get nextPieceType(): PieceType {
    return this.previewQueue[0];
  }

  get previewPieces(): PieceType[] {
    return [...this.previewQueue];
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

  getBoardFillPercent(): number {
    let filled = 0;
    for (const row of this.board.grid) {
      for (const cell of row) {
        if (cell !== 0) filled++;
      }
    }
    return filled / (COLS * ROWS);
  }

  getDropInterval(elapsed: number): number {
    const newLevel = Math.floor(elapsed / this.diff.levelInterval);
    if (newLevel !== this.level) {
      this.level = newLevel;
      this.onSpecialEvent?.("level-up");
    }
    return Math.max(this.diff.speedMin, this.diff.speedInitial - this.level * this.diff.speedDecrease);
  }

  private lastGarbageTick = 0;

  tick(elapsed: number): void {
    if (this.gameOver) return;

    if (this.getBoardFillPercent() > 0.8) this.wasInDanger = true;

    // Random garbage for insane mode
    if (this.diff.garbageInterval > 0 && elapsed - this.lastGarbageTick >= this.diff.garbageInterval) {
      this.lastGarbageTick = elapsed;
      if (elapsed > 3000) { // grace period at start
        this.garbageManager.queueGarbage(this.diff.garbageAmount);
        this.onSpecialEvent?.("incoming-garbage");
      }
    }

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
    const rowSnapshots = this.board.snapshotRows(clearedRows);
    const cleared = this.board.clearFullRows();

    if (cleared > 0) {
      const scoreKey = ["single", "double", "triple", "tetris"][cleared - 1] as keyof typeof SCORING;
      const baseScore = SCORING[scoreKey] as number;
      const comboMult = this.combo > 0 ? Math.pow(SCORING.comboMultiplier, this.combo) : 1;
      this.score += Math.floor(baseScore * comboMult * this.diff.scoreMultiplier);
      this.combo++;

      this.onLineClear?.(cleared, clearedRows, rowSnapshots);

      if (cleared === 4) {
        this.onSpecialEvent?.("tetris");
        if (this.lastClearWasTetris) {
          this.isBackToBack = true;
          this.onSpecialEvent?.("back-to-back");
        } else {
          this.isBackToBack = false;
        }
        this.lastClearWasTetris = true;
      } else {
        this.lastClearWasTetris = false;
        this.isBackToBack = false;
      }

      const garbageToSend = this.garbageManager.calcGarbageToSend(cleared, Math.max(0, this.combo - 1));
      const netGarbage = this.garbageManager.counterGarbage(garbageToSend);
      if (netGarbage > 0 && this.onGarbage) {
        this.onGarbage(netGarbage);
      }

      // Speed kill bonus: reward fast clears
      if (Date.now() - this.pieceSpawnTime < 2000) {
        this.score += 50;
        this.onSpecialEvent?.("speed-kill");
      }

      // Perfect clear: entire board is empty after clearing
      if (this.getBoardFillPercent() === 0) {
        this.score += 1000;
        this.onSpecialEvent?.("perfect-clear");
      }
    } else {
      this.combo = 0;
    }

    // Near-miss detection: escaped danger zone
    const fill = this.getBoardFillPercent();
    if (this.wasInDanger && fill < 0.6) {
      this.onSpecialEvent?.("close-call");
    }
    this.wasInDanger = fill > 0.8;

    this.holdUsed = false;
    this.currentPiece = this.spawnPiece();

    if (!this.board.isValidPosition(this.currentPiece.getBlocks())) {
      this.triggerGameOver();
    }

    this.onBoardUpdate?.();
  }

  private spawnPiece(): Piece {
    this.pieceSpawnTime = Date.now();
    const type = this.previewQueue.shift()!;
    this.previewQueue.push(this.bag.next());
    return new Piece(type, this.getSpawnCol(type));
  }

  private getSpawnCol(type: PieceType): number {
    const shape = PIECE_SHAPES[type][0];
    const width = Math.max(...shape.map(([_, c]) => c)) + 1;
    return Math.floor((COLS - width) / 2);
  }

  saveHighScore(): void {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.localStorageSet(`dropster-highscore-${this.playerName}`, String(this.score));
    }
  }

  private triggerGameOver(): void {
    this.gameOver = true;
    if (this.score > this.highScore) {
      this.onSpecialEvent?.("new-highscore");
    }
    this.saveHighScore();
    this.onGameOver?.();
  }
}
