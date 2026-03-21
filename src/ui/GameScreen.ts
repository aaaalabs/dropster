import { Renderer } from "./Renderer";
import { GameEngine } from "../game/GameEngine";
import { SoundEngine } from "../audio/SoundEngine";
import { ParticleSystem } from "../effects/ParticleSystem";
import { ScreenEffects } from "../effects/ScreenEffects";
import { MusicEngine } from "../audio/MusicEngine";
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
  private particles = new ParticleSystem();
  private effects = new ScreenEffects();
  private music = new MusicEngine();
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

  // Hit stop: freeze game logic briefly on line clears
  private freezeUntil = 0;

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

      // Hit stop — freeze game logic so the moment breathes
      // 1 line = 120ms, 2 = 180ms, 3 = 250ms, Tetris = 400ms
      const freezeMs = count === 4 ? 400 : 80 + count * 60;
      this.freezeUntil = performance.now() + freezeMs;

      // Particles: burst from each cleared row
      for (const row of rows) {
        const y = BOARD_OFFSET_Y + row * CELL_SIZE + CELL_SIZE / 2;
        const x = BOARD_OFFSET_X + (COLS * CELL_SIZE) / 2;
        this.particles.burstRow(x, y, COLS * CELL_SIZE, count === 4 ? 30 : 15, {
          color: count === 4 ? "#00f0f0" : "#fff",
          speed: count === 4 ? 6 : 4,
          life: count === 4 ? 60 : 45,
          size: 4,
          gravity: 0.08,
        });
      }

      // Screen flash for tetris
      if (count === 4) {
        this.effects.flashScreen("#fff", 200);
      }

      // Score popup
      const scoreKey = ["single", "double", "triple", "tetris"][count - 1];
      const scores = { single: 100, double: 300, triple: 500, tetris: 800 };
      const pts = scores[scoreKey as keyof typeof scores] || 0;
      this.effects.addPopup(`+${pts}`, BOARD_OFFSET_X + 140, BOARD_OFFSET_Y + rows[0] * CELL_SIZE, {
        color: "#fff",
        font: "bold 16px Orbitron, monospace",
        duration: 1500,
        vy: -0.8,
      });

      // Combo particles
      if (this.engine.combo >= 3) {
        this.particles.burst(20, BOARD_OFFSET_Y + 220, 6, {
          color: "#ff00aa",
          speed: 2,
          life: 20,
          size: 2,
        });
        if (this.engine.combo >= 5) {
          this.effects.addPopup(`COMBO \u00d7${this.engine.combo}`, BOARD_OFFSET_X + 140, BOARD_OFFSET_Y + 50, {
            color: "#ff00aa",
            font: "bold 16px Orbitron, monospace",
            duration: 1500,
            vy: -0.8,
          });
        }
      }
    };

    this.engine.onSpecialEvent = (event) => {
      const centerX = BOARD_OFFSET_X + (COLS * CELL_SIZE) / 2;
      const centerY = BOARD_OFFSET_Y + (ROWS * CELL_SIZE) / 2;

      if (event === "tetris") {
        this.effects.addPopup("TETRIS!", centerX, centerY, {
          color: "#00f0f0",
          font: "bold 32px Orbitron, monospace",
          duration: 2000,
          vy: -0.5,
        });
      }
      if (event === "back-to-back") {
        this.effects.addPopup("BACK TO BACK!", centerX, centerY - 40, {
          color: "#ffd700",
          font: "bold 20px Orbitron, monospace",
          duration: 2000,
          vy: -0.8,
        });
      }
      if (event === "level-up") {
        this.effects.addPopup(`LEVEL ${this.engine.level + 1}`, centerX, centerY, {
          color: "#a855f7",
          font: "bold 18px Orbitron, monospace",
          duration: 1800,
          vy: -0.8,
        });
        this.music.setLevel(this.engine.level);
      }
      if (event === "close-call") {
        this.effects.addPopup("CLOSE CALL!", centerX, centerY - 30, {
          color: "#ff8800",
          font: "bold 22px Orbitron, monospace",
          duration: 1800,
          vy: -0.6,
        });
        this.particles.burst(centerX, centerY, 20, {
          color: "#ff8800", speed: 3, life: 30, size: 3,
        });
      }
      if (event === "speed-kill") {
        this.effects.addPopup("SPEED KILL!", BOARD_OFFSET_X + 140, BOARD_OFFSET_Y + 30, {
          color: "#00ff88",
          font: "bold 14px Orbitron, monospace",
          duration: 1200,
          vy: -0.8,
        });
      }
      if (event === "perfect-clear") {
        this.effects.flashScreen("#00f0f0", 300);
        this.effects.addPopup("PERFECT CLEAR!", centerX, centerY, {
          color: "#ffd700",
          font: "bold 28px Orbitron, monospace",
          duration: 2500,
          vy: -0.4,
        });
        this.particles.burst(centerX, centerY, 40, {
          color: "#ffd700", speed: 5, life: 50, size: 4, gravity: 0.05,
        });
        this.freezeUntil = performance.now() + 600;
      }
      if (event === "new-highscore") {
        this.effects.addPopup("NEW BEST!", centerX, centerY + 40, {
          color: "#ffd700",
          font: "bold 20px Orbitron, monospace",
          duration: 2000,
          vy: -0.5,
        });
      }
    };

    this.touch = new TouchControls(this.canvas, {
      onMoveLeft: () => { this.engine.moveLeft(); this.sound.move(); },
      onMoveRight: () => { this.engine.moveRight(); this.sound.move(); },
      onSoftDrop: () => { this.engine.softDrop(); this.sound.softDrop(); },
      onHardDrop: () => {
        const piece = this.engine.currentPiece;
        const ghostY = this.engine.board.getGhostY(piece);
        const blocks = piece.getBlocks();
        const minX = Math.min(...blocks.map(b => b.x));
        const maxX = Math.max(...blocks.map(b => b.x));
        const startY = Math.min(...blocks.map(b => b.y));
        const centerX = BOARD_OFFSET_X + ((minX + maxX + 1) / 2) * CELL_SIZE;
        const trailTopY = BOARD_OFFSET_Y + startY * CELL_SIZE;
        const impactY = BOARD_OFFSET_Y + (ghostY + 1) * CELL_SIZE;
        this.engine.hardDrop();
        this.sound.hardDrop();
        this.lastGravityDrop = performance.now();
        this.effects.addTrail(centerX, trailTopY, impactY, "#00f0f0", CELL_SIZE * (maxX - minX + 1), 400);
        this.effects.addImpactLine(centerX, impactY, COLS * CELL_SIZE * 0.6, "#00f0f0", 500);
        this.particles.burst(centerX, impactY, 16, {
          color: "#00f0f0",
          speed: 4,
          spread: Math.PI,
          baseAngle: -Math.PI / 2,
          life: 30,
          size: 3,
          gravity: 0.15,
        });
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
    this.music.muted = this.sound.muted;
    this.music.start();
    this.loop(now);
  }

  receiveGarbage(lines: number): void {
    this.engine.receiveGarbage(lines);
    this.shakeTimer = 150;
    this.sound.garbageReceived();
    this.effects.flashScreen("#ff000060", 150);
    this.effects.addWarning(`INCOMING ×${lines}`);
    // Particles burst from bottom
    const bottomY = BOARD_OFFSET_Y + ROWS * CELL_SIZE;
    this.particles.burst(BOARD_OFFSET_X + (COLS * CELL_SIZE) / 2, bottomY, 10, {
      color: "#ff3333",
      speed: 4,
      spread: Math.PI,
      baseAngle: -Math.PI / 2,
      life: 15,
    });
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

  getIsNewHighScore(): boolean {
    return this.engine.isNewHighScore;
  }

  getHighScore(): number {
    return this.engine.currentHighScore;
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
    this.music.stop();
    this.muteBtn.remove();
    window.removeEventListener("resize", this.resize);
    this.canvas.remove();
  }

  private loop = (now: number): void => {
    if (this.paused || this.engine.gameOver) return;

    const frozen = now < this.freezeUntil;

    if (!frozen) {
      const elapsed = now - this.gameStartTime;
      const dropInterval = this.engine.getDropInterval(elapsed);

      if (now - this.lastGravityDrop >= dropInterval) {
        this.engine.gravityDrop();
        this.lastGravityDrop = now;
      }

      this.engine.tick(elapsed);

      // Update danger level
      const fill = this.engine.getBoardFillPercent();
      this.effects.setDanger(fill);
      this.music.setDanger(fill);
    }

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

    this.renderer.drawBoard(this.engine.board.grid, BOARD_OFFSET_X, BOARD_OFFSET_Y, this.engine.level);

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

    // Update and draw particles
    this.particles.update();
    this.particles.draw(ctx);

    // Draw screen effects (flash, popups, danger overlay)
    const boardW = COLS * CELL_SIZE;
    const boardH = ROWS * CELL_SIZE;
    this.effects.draw(ctx, now, BOARD_OFFSET_X, BOARD_OFFSET_Y, boardW, boardH);

    if (this.shakeTimer > 0) {
      ctx.restore();
    }
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (this.paused || this.engine.gameOver || performance.now() < this.freezeUntil) return;

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
      case "Space": {
        e.preventDefault();
        const piece = this.engine.currentPiece;
        const ghostY = this.engine.board.getGhostY(piece);
        const blocks = piece.getBlocks();
        const minX = Math.min(...blocks.map(b => b.x));
        const maxX = Math.max(...blocks.map(b => b.x));
        const startY = Math.min(...blocks.map(b => b.y));
        const centerX = BOARD_OFFSET_X + ((minX + maxX + 1) / 2) * CELL_SIZE;
        const trailTopY = BOARD_OFFSET_Y + startY * CELL_SIZE;
        const impactY = BOARD_OFFSET_Y + (ghostY + 1) * CELL_SIZE;
        this.engine.hardDrop();
        this.sound.hardDrop();
        this.lastGravityDrop = performance.now();
        this.effects.addTrail(centerX, trailTopY, impactY, "#00f0f0", CELL_SIZE * (maxX - minX + 1), 400);
        this.effects.addImpactLine(centerX, impactY, COLS * CELL_SIZE * 0.6, "#00f0f0", 500);
        this.particles.burst(centerX, impactY, 16, {
          color: "#00f0f0",
          speed: 4,
          spread: Math.PI,
          baseAngle: -Math.PI / 2,
          life: 30,
          size: 3,
          gravity: 0.15,
        });
        break;
      }
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
      this.music.muted = this.sound.muted;
      update();
    });
    parent.style.position = "relative";
    parent.appendChild(btn);
    return btn;
  }
}
