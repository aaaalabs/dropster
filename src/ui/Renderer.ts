import { Grid } from "../types";
import { COLS, ROWS, PIECE_COLORS } from "../game/constants";
import { Piece } from "../game/Piece";
import { PIECE_SHAPES } from "../game/constants";

const CELL_SIZE = 28;
const MINI_CELL_SIZE = 12;
const GHOST_ALPHA = 0.3;
const BG_COLOR = "#0f0f1a";
const GARBAGE_COLOR = "#666666";

const COLOR_MAP: Record<number, string> = {
  0: "transparent",
  1: PIECE_COLORS.I,
  2: PIECE_COLORS.O,
  3: PIECE_COLORS.T,
  4: PIECE_COLORS.S,
  5: PIECE_COLORS.Z,
  6: PIECE_COLORS.J,
  7: PIECE_COLORS.L,
  8: GARBAGE_COLOR,
};

export class Renderer {
  readonly ctx: CanvasRenderingContext2D;
  readonly boardWidth: number;
  readonly boardHeight: number;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
    this.boardWidth = COLS * CELL_SIZE;
    this.boardHeight = ROWS * CELL_SIZE;
  }

  clear(): void {
    this.ctx.fillStyle = BG_COLOR;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawBoard(grid: Grid, offsetX: number, offsetY: number, level: number = 0, baseHue: number = 260): void {
    const hue = (baseHue + level * 15) % 360; // subtle shift per level within the difficulty's palette
    const intensity = Math.min(level * 0.02, 0.2);
    this.ctx.fillStyle = `hsla(${hue}, 50%, ${4 + intensity * 4}%, 1)`;
    this.ctx.fillRect(offsetX, offsetY, this.boardWidth, this.boardHeight);

    const gridAlpha = 0.12 + intensity * 0.2;
    this.ctx.strokeStyle = `hsla(${hue}, 35%, 18%, ${gridAlpha})`;
    this.ctx.lineWidth = 0.5;
    for (let x = 0; x <= COLS; x++) {
      this.ctx.beginPath();
      this.ctx.moveTo(offsetX + x * CELL_SIZE, offsetY);
      this.ctx.lineTo(offsetX + x * CELL_SIZE, offsetY + this.boardHeight);
      this.ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      this.ctx.beginPath();
      this.ctx.moveTo(offsetX, offsetY + y * CELL_SIZE);
      this.ctx.lineTo(offsetX + this.boardWidth, offsetY + y * CELL_SIZE);
      this.ctx.stroke();
    }

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (grid[y][x] !== 0) {
          this.drawCell(
            offsetX + x * CELL_SIZE,
            offsetY + y * CELL_SIZE,
            CELL_SIZE,
            COLOR_MAP[grid[y][x]] ?? GARBAGE_COLOR
          );
        }
      }
    }
  }

  drawPiece(piece: Piece, offsetX: number, offsetY: number): void {
    const color = PIECE_COLORS[piece.type];
    for (const { x, y } of piece.getBlocks()) {
      this.drawCell(
        offsetX + x * CELL_SIZE,
        offsetY + y * CELL_SIZE,
        CELL_SIZE,
        color
      );
    }
  }

  drawGhost(piece: Piece, ghostY: number, offsetX: number, offsetY: number): void {
    const color = PIECE_COLORS[piece.type];
    this.ctx.globalAlpha = GHOST_ALPHA;
    const blocks = piece.getBlocks().map(b => ({
      x: b.x,
      y: b.y - piece.pos.y + ghostY,
    }));
    for (const { x, y } of blocks) {
      this.drawCell(
        offsetX + x * CELL_SIZE,
        offsetY + y * CELL_SIZE,
        CELL_SIZE,
        color
      );
    }
    this.ctx.globalAlpha = 1;
  }

  drawPreviewPiece(
    type: string,
    label: string,
    x: number,
    y: number
  ): void {
    this.ctx.fillStyle = "#ccc";
    this.ctx.font = "11px Orbitron, monospace";
    this.ctx.fillText(label, x, y);

    const pieceType = type as keyof typeof PIECE_COLORS;
    const shape = PIECE_SHAPES[pieceType][0];
    const color = PIECE_COLORS[pieceType];
    const previewCellSize = 18;
    const py = y + 8;

    for (const [r, c] of shape) {
      this.drawCell(
        x + c * previewCellSize,
        py + r * previewCellSize,
        previewCellSize,
        color
      );
    }
  }

  drawOpponentBoard(grid: number[][], offsetX: number, offsetY: number): void {
    const w = COLS * MINI_CELL_SIZE;
    const h = ROWS * MINI_CELL_SIZE;

    this.ctx.fillStyle = "#0a0a14";
    this.ctx.fillRect(offsetX, offsetY, w, h);

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (grid[y]?.[x]) {
          this.drawCell(
            offsetX + x * MINI_CELL_SIZE,
            offsetY + y * MINI_CELL_SIZE,
            MINI_CELL_SIZE,
            COLOR_MAP[grid[y][x]] ?? GARBAGE_COLOR
          );
        }
      }
    }

    this.ctx.strokeStyle = "rgba(0, 240, 240, 0.12)";
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(offsetX, offsetY, w, h);
  }

  drawGarbageIndicator(
    pending: number,
    x: number,
    y: number,
    height: number
  ): void {
    const maxBars = 20;
    const barHeight = height / maxBars;
    const bars = Math.min(pending, maxBars);

    this.ctx.fillStyle = "#12122a";
    this.ctx.fillRect(x, y, 8, height);

    this.ctx.shadowBlur = 8;
    this.ctx.shadowColor = "#ff00aa";
    this.ctx.fillStyle = "#ff00aa";
    for (let i = 0; i < bars; i++) {
      this.ctx.fillRect(x, y + height - (i + 1) * barHeight, 8, barHeight - 1);
    }
    this.ctx.shadowBlur = 0;
    this.ctx.shadowColor = "transparent";
  }

  drawScore(score: number, combo: number, x: number, y: number): void {
    this.ctx.fillStyle = "#4a4a6a";
    this.ctx.font = "10px Orbitron, monospace";
    this.ctx.fillText("SCORE", x, y);
    this.ctx.fillStyle = "#fff";
    this.ctx.font = "bold 14px Orbitron, monospace";
    this.ctx.fillText(score.toLocaleString(), x, y + 18);
    if (combo > 1) {
      this.ctx.fillStyle = "#ff00aa";
      this.ctx.font = "bold 12px Orbitron, monospace";
      this.ctx.fillText(`×${combo}`, x, y + 36);
    }
  }

  drawCountdown(count: number): void {
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.textAlign = "center";

    if (count > 0) {
      this.ctx.fillStyle = "#fff";
      this.ctx.font = "bold 90px Orbitron, monospace";
      this.ctx.shadowBlur = 20;
      this.ctx.shadowColor = "#00f0f0";
    } else {
      this.ctx.fillStyle = "#00f0f0";
      this.ctx.font = "bold 100px Orbitron, monospace";
      this.ctx.shadowBlur = 40;
      this.ctx.shadowColor = "#00f0f0";
    }

    this.ctx.fillText(
      count > 0 ? String(count) : "GO!",
      this.canvas.width / 2,
      this.canvas.height / 2
    );

    this.ctx.shadowBlur = 0;
    this.ctx.shadowColor = "transparent";
    this.ctx.textAlign = "start";
  }

  drawText(
    text: string,
    x: number,
    y: number,
    opts?: { color?: string; font?: string; align?: CanvasTextAlign }
  ): void {
    this.ctx.fillStyle = opts?.color ?? "#fff";
    this.ctx.font = opts?.font ?? "16px monospace";
    this.ctx.textAlign = opts?.align ?? "start";
    this.ctx.fillText(text, x, y);
    this.ctx.textAlign = "start";
  }

  drawLineClearFlash(y: number, offsetX: number, offsetY: number): void {
    this.ctx.fillStyle = "rgba(255,255,255,0.55)";
    this.ctx.fillRect(offsetX, offsetY + y * CELL_SIZE, this.boardWidth, CELL_SIZE);
  }

  /**
   * Draw snapshotted cleared rows with phased animation.
   * progress: 0→1 over the freeze duration
   * Phase 1 (0-0.3): rows flash white, glow intensifies
   * Phase 2 (0.3-0.6): rows visible with original colors, shrinking height
   * Phase 3 (0.6-1.0): rows dissolve (alpha fades out, cells scatter)
   */
  drawClearingRows(
    snapshots: { row: number; cells: number[] }[],
    offsetX: number,
    offsetY: number,
    progress: number
  ): void {
    if (progress >= 1) return;

    this.ctx.save();

    for (const { row, cells } of snapshots) {
      const baseY = offsetY + row * CELL_SIZE;

      if (progress < 0.3) {
        // Phase 1: white flash glow
        const p = progress / 0.3;
        const glowAlpha = 0.4 + p * 0.5;
        this.ctx.shadowBlur = 15 + p * 25;
        this.ctx.shadowColor = "#fff";
        this.ctx.fillStyle = `rgba(255,255,255,${glowAlpha})`;
        this.ctx.fillRect(offsetX, baseY, this.boardWidth, CELL_SIZE);
      } else if (progress < 0.6) {
        // Phase 2: original colors, shrinking vertically
        const p = (progress - 0.3) / 0.3;
        const shrink = 1 - p * 0.5; // shrink to 50%
        const cellH = CELL_SIZE * shrink;
        const yOff = (CELL_SIZE - cellH) / 2;
        this.ctx.globalAlpha = 1 - p * 0.3;
        for (let x = 0; x < COLS; x++) {
          if (cells[x] !== 0) {
            const color = COLOR_MAP[cells[x]] ?? GARBAGE_COLOR;
            this.ctx.shadowBlur = 8;
            this.ctx.shadowColor = color;
            this.ctx.fillStyle = color;
            this.ctx.fillRect(
              offsetX + x * CELL_SIZE + 1,
              baseY + yOff + 1,
              CELL_SIZE - 2,
              cellH - 2
            );
          }
        }
      } else {
        // Phase 3: dissolve — cells scatter outward, fade
        const p = (progress - 0.6) / 0.4;
        this.ctx.globalAlpha = 1 - p;
        for (let x = 0; x < COLS; x++) {
          if (cells[x] !== 0) {
            const color = COLOR_MAP[cells[x]] ?? GARBAGE_COLOR;
            const scatter = p * 30;
            const dir = x < COLS / 2 ? -1 : 1;
            const sx = offsetX + x * CELL_SIZE + dir * scatter;
            const sy = baseY + (Math.random() - 0.5) * scatter * 0.5;
            const size = CELL_SIZE * (1 - p * 0.5);
            this.ctx.shadowBlur = 6;
            this.ctx.shadowColor = color;
            this.ctx.fillStyle = color;
            this.ctx.fillRect(sx, sy, size, size);
          }
        }
      }
    }

    this.ctx.restore();
  }

  private drawCell(x: number, y: number, size: number, color: string): void {
    this.ctx.shadowBlur = 6;
    this.ctx.shadowColor = color;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
    this.ctx.shadowBlur = 0;
    this.ctx.shadowColor = "transparent";
    this.ctx.fillStyle = "rgba(255,255,255,0.15)";
    this.ctx.fillRect(x + 1, y + 1, size - 2, 2);
    this.ctx.fillRect(x + 1, y + 1, 2, size - 2);
  }
}
