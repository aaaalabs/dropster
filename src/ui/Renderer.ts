import { Grid } from "../types";
import { COLS, ROWS, PIECE_COLORS } from "../game/constants";
import { Piece } from "../game/Piece";
import { PIECE_SHAPES } from "../game/constants";

const CELL_SIZE = 28;
const MINI_CELL_SIZE = 12;
const GRID_LINE_COLOR = "#1a1a2e";
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

  drawBoard(grid: Grid, offsetX: number, offsetY: number): void {
    this.ctx.fillStyle = "#0a0a14";
    this.ctx.fillRect(offsetX, offsetY, this.boardWidth, this.boardHeight);

    this.ctx.strokeStyle = GRID_LINE_COLOR;
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
    this.ctx.font = "14px monospace";
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

    this.ctx.strokeStyle = "#333";
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

    this.ctx.fillStyle = "#333";
    this.ctx.fillRect(x, y, 10, height);

    this.ctx.fillStyle = "#ff3333";
    for (let i = 0; i < bars; i++) {
      this.ctx.fillRect(x, y + height - (i + 1) * barHeight, 10, barHeight - 1);
    }
  }

  drawScore(score: number, combo: number, x: number, y: number): void {
    this.ctx.fillStyle = "#ccc";
    this.ctx.font = "14px monospace";
    this.ctx.fillText(`Score: ${score}`, x, y);
    if (combo > 1) {
      this.ctx.fillStyle = "#ffaa00";
      this.ctx.fillText(`Combo x${combo}`, x, y + 20);
    }
  }

  drawCountdown(count: number): void {
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = "#fff";
    this.ctx.font = "bold 72px monospace";
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      count > 0 ? String(count) : "GO!",
      this.canvas.width / 2,
      this.canvas.height / 2
    );
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
