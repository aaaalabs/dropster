import { Renderer } from "./Renderer";
import { GameEngine } from "../game/GameEngine";
import { SoundEngine } from "../audio/SoundEngine";
import { TouchControls } from "./TouchControls";
import {
  DAS_DELAY,
  ARR_DELAY,
  COLS,
  ROWS,
} from "../game/constants";

const CELL_SIZE = 28;
const MINI_CELL_SIZE = 12;
const SIDE_PANEL_WIDTH = 100;
const BOARD_OFFSET_X = SIDE_PANEL_WIDTH + 20;
const BOARD_OFFSET_Y = 40;
const OPP_OFFSET_X = BOARD_OFFSET_X + COLS * CELL_SIZE + 30;
const OPP_OFFSET_Y = BOARD_OFFSET_Y + 30;
const LINE_FLASH_MS = 100;
const SHAKE_AMPLITUDE = 3;

export class GameScreen {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private engine: GameEngine;
  private sound: SoundEngine;
  private touch: TouchControls;
  private muteBtn: HTMLElement;
  private opponentGrid: number[][] = [];
  private animFrameId = 0;
  private lastGravityDrop = 0;
  private gameStartTime = 0;
  private keysDown = new Map<string, number>();
  private keyRepeatTimers = new Map<string, ReturnType<typeof setInterval>>();
  private pausesUsed = 0;

  // Screen shake
  private shakeTimer = 0;
  private shakeLastFrame = 0;

  // Line clear flash: { rows, expiresAt }
  private flashRows: number[] = [];
  private flashExpiresAt = 0;

  onSendGarbage: ((lines: number) => void) | null = null;
  onSendBoard: ((grid: number[][]) => void) | null = null;
  onGameOver: (() => void) | null = null;
  onPauseRequest: (() => void) | null = null;
  onQuit: (() => void) | null = null;

  private lastBoardSend = 0;
  private paused = false;

  constructor(parent: HTMLElement) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = OPP_OFFSET_X + COLS * MINI_CELL_SIZE + 20;
    this.canvas.height = BOARD_OFFSET_Y + ROWS * CELL_SIZE + 40;
    this.canvas.style.maxWidth = "100vw";
    this.canvas.style.maxHeight = "100vh";
    parent.appendChild(this.canvas);

    this.renderer = new Renderer(this.canvas);
    this.engine = new GameEngine();
    this.sound = new SoundEngine();

    this.engine.onGarbage = (lines) => this.onSendGarbage?.(lines);
    this.engine.onGameOver = () => {
      this.sound.gameOver();
      setTimeout(() => this.sound.stopAll(), 1000);
      this.onGameOver?.();
    };
    this.engine.onLineClear = (count, rows) => {
      this.sound.lineClear(count);
      this.flashRows = rows;
      this.flashExpiresAt = performance.now() + LINE_FLASH_MS;
    };

    this.touch = new TouchControls(this.canvas, {
      onMoveLeft: () => { this.engine.moveLeft(); this.sound.move(); },
      onMoveRight: () => { this.engine.moveRight(); this.sound.move(); },
      onSoftDrop: () => { this.engine.softDrop(); this.sound.softDrop(); },
      onHardDrop: () => {
        this.engine.hardDrop();
        this.sound.hardDrop();
        this.lastGravityDrop = performance.now();
      },
      onRotateCW: () => { this.engine.rotateCW(); this.sound.rotate(); },
      onRotateCCW: () => { this.engine.rotateCCW(); this.sound.rotate(); },
      onHoldPiece: () => { this.engine.holdPiece(); this.sound.move(); },
    });

    this.muteBtn = this.createMuteButton(parent);

    this.setupInput();
    this.setupResize();
    this.resize();
  }

  startCountdown(onDone: () => void): void {
    let count = 3;
    const interval = setInterval(() => {
      this.renderer.clear();
      this.renderer.drawCountdown(count);
      if (count > 0) this.sound.countdown();
      else this.sound.countdownGo();
      count--;
      if (count < 0) {
        clearInterval(interval);
        onDone();
      }
    }, 800);
  }

  startGame(): void {
    const now = performance.now();
    this.lastGravityDrop = now;
    this.gameStartTime = now;
    this.shakeLastFrame = now;
    this.engine.start(Date.now());
    this.loop(now);
  }

  receiveGarbage(lines: number): void {
    this.engine.receiveGarbage(lines);
    this.shakeTimer = 150;
    this.sound.garbageReceived();
  }

  updateOpponentBoard(grid: number[][]): void {
    this.opponentGrid = grid;
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    if (!paused) {
      this.lastGravityDrop = performance.now();
      this.loop(performance.now());
    }
  }

  getScore(): number {
    return this.engine.score;
  }

  requestPause(): boolean {
    if (this.pausesUsed >= 2) return false;
    this.pausesUsed++;
    this.paused = true;
    return true;
  }

  destroy(): void {
    cancelAnimationFrame(this.animFrameId);
    this.removeInput();
    this.touch.destroy();
    this.sound.stopAll();
    this.muteBtn.remove();
    window.removeEventListener("resize", this.resize);
    this.canvas.remove();
  }

  private loop = (now: number): void => {
    if (this.paused || this.engine.gameOver) return;

    const elapsed = now - this.gameStartTime;
    const dropInterval = this.engine.getDropInterval(elapsed);

    if (now - this.lastGravityDrop >= dropInterval) {
      this.engine.gravityDrop();
      this.lastGravityDrop = now;
    }

    this.engine.tick(elapsed);

    if (now - this.lastBoardSend > 200) {
      this.onSendBoard?.(this.engine.board.toColorGrid());
      this.lastBoardSend = now;
    }

    // Decrement shake timer
    const dt = now - this.shakeLastFrame;
    this.shakeLastFrame = now;
    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - dt);
    }

    this.render(now);
    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private render(now = performance.now()): void {
    const ctx = this.renderer.ctx;

    this.renderer.clear();

    // Apply screen shake
    if (this.shakeTimer > 0) {
      const ox = (Math.random() * 2 - 1) * SHAKE_AMPLITUDE;
      const oy = (Math.random() * 2 - 1) * SHAKE_AMPLITUDE;
      ctx.save();
      ctx.translate(ox, oy);
    }

    this.renderer.drawText("DROPSTER", 10, 24, {
      color: "#00f0f0",
      font: "bold 16px Orbitron, monospace",
    });

    this.renderer.drawBoard(this.engine.board.grid, BOARD_OFFSET_X, BOARD_OFFSET_Y);

    const ghostY = this.engine.board.getGhostY(this.engine.currentPiece);
    this.renderer.drawGhost(this.engine.currentPiece, ghostY, BOARD_OFFSET_X, BOARD_OFFSET_Y);

    this.renderer.drawPiece(this.engine.currentPiece, BOARD_OFFSET_X, BOARD_OFFSET_Y);

    // Line clear flash overlay
    if (now < this.flashExpiresAt) {
      for (const row of this.flashRows) {
        this.renderer.drawLineClearFlash(row, BOARD_OFFSET_X, BOARD_OFFSET_Y);
      }
    }

    this.renderer.drawGarbageIndicator(
      this.engine.garbageManager.pendingLines,
      BOARD_OFFSET_X - 16,
      BOARD_OFFSET_Y,
      ROWS * CELL_SIZE
    );

    this.renderer.drawPreviewPiece(
      this.engine.nextPieceType,
      "NEXT",
      10,
      BOARD_OFFSET_Y + 10
    );

    if (this.engine.heldPiece) {
      this.renderer.drawPreviewPiece(
        this.engine.heldPiece,
        "HOLD",
        10,
        BOARD_OFFSET_Y + 100
      );
    }

    this.renderer.drawScore(
      this.engine.score,
      this.engine.combo,
      10,
      BOARD_OFFSET_Y + 200
    );

    this.renderer.drawText("OPPONENT", OPP_OFFSET_X, OPP_OFFSET_Y - 10, {
      color: "#666",
      font: "14px monospace",
    });
    if (this.opponentGrid.length > 0) {
      this.renderer.drawOpponentBoard(this.opponentGrid, OPP_OFFSET_X, OPP_OFFSET_Y);
    }

    if (this.shakeTimer > 0) {
      ctx.restore();
    }
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (this.paused || this.engine.gameOver) return;

    switch (e.code) {
      case "ArrowLeft":
        this.engine.moveLeft();
        this.sound.move();
        this.startDAS("ArrowLeft", () => { this.engine.moveLeft(); this.sound.move(); });
        break;
      case "ArrowRight":
        this.engine.moveRight();
        this.sound.move();
        this.startDAS("ArrowRight", () => { this.engine.moveRight(); this.sound.move(); });
        break;
      case "ArrowDown":
        this.engine.softDrop();
        this.sound.softDrop();
        this.startDAS("ArrowDown", () => { this.engine.softDrop(); this.sound.softDrop(); });
        break;
      case "ArrowUp":
        this.engine.rotateCW();
        this.sound.rotate();
        break;
      case "KeyZ":
        this.engine.rotateCCW();
        this.sound.rotate();
        break;
      case "KeyC":
        this.engine.holdPiece();
        this.sound.move();
        break;
      case "Space":
        e.preventDefault();
        this.engine.hardDrop();
        this.sound.hardDrop();
        this.lastGravityDrop = performance.now();
        break;
      case "Escape":
        this.onQuit?.();
        break;
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.stopDAS(e.code);
  };

  private startDAS(key: string, action: () => void): void {
    if (this.keysDown.has(key)) return;
    const dasTimer = window.setTimeout(() => {
      const arrTimer = setInterval(action, ARR_DELAY);
      this.keyRepeatTimers.set(key, arrTimer);
    }, DAS_DELAY);
    this.keysDown.set(key, dasTimer);
  }

  private stopDAS(key: string): void {
    const dasTimer = this.keysDown.get(key);
    if (dasTimer !== undefined) {
      clearTimeout(dasTimer);
      this.keysDown.delete(key);
    }
    const arrTimer = this.keyRepeatTimers.get(key);
    if (arrTimer !== undefined) {
      clearInterval(arrTimer);
      this.keyRepeatTimers.delete(key);
    }
  }

  private setupInput(): void {
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
  }

  private removeInput(): void {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
  }

  private resize = (): void => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const naturalW = this.canvas.width;
    const naturalH = this.canvas.height;
    const scale = Math.min(vw / naturalW, vh / naturalH, 1);
    this.canvas.style.width = `${naturalW * scale}px`;
    this.canvas.style.height = `${naturalH * scale}px`;
  };

  private setupResize(): void {
    window.addEventListener("resize", this.resize);
  }

  private createMuteButton(parent: HTMLElement): HTMLElement {
    const btn = document.createElement("button");
    btn.className = "mute-btn";
    const update = (): void => { btn.textContent = this.sound.muted ? "\uD83D\uDD07" : "\uD83D\uDD0A"; };
    update();
    btn.addEventListener("click", () => {
      this.sound.toggleMute();
      update();
    });
    parent.style.position = "relative";
    parent.appendChild(btn);
    return btn;
  }
}
