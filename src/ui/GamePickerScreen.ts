const PREVIEW_W = 200;
const PREVIEW_H = 260;
const CELL = 12;

export class GamePickerScreen {
  private container: HTMLDivElement;
  private snakeCanvas: HTMLCanvasElement;
  private tetrisCanvas: HTMLCanvasElement;
  private snakeAnimId = 0;
  private tetrisAnimId = 0;

  // Snake state
  private snake: { x: number; y: number }[] = [];
  private snakeDir = { x: 1, y: 0 };
  private food = { x: 0, y: 0 };
  private snakeTick = 0;

  // Tetris state
  private tetrisGrid: number[][] = [];
  private tetrisPiece: { x: number; y: number; blocks: { x: number; y: number }[]; color: number } | null = null;
  private tetrisTick = 0;

  private readonly cols = Math.floor(PREVIEW_W / CELL);
  private readonly rows = Math.floor(PREVIEW_H / CELL);

  constructor(parent: HTMLElement, onDropster: () => void) {
    this.container = document.createElement("div");
    this.container.innerHTML = `
      <div style="text-align:center; padding:clamp(24px,6vw,60px) clamp(16px,4vw,40px); animation:fadeInUp 0.6s ease-out;">
        <h1 style="font-family:var(--font-display); font-size:clamp(28px,7vw,44px); font-weight:900; letter-spacing:0.15em; color:var(--cyan); text-shadow:var(--glow-cyan); margin-bottom:8px;">GAME ZONE</h1>
        <p style="font-family:var(--font-body); font-size:clamp(12px,2.5vw,16px); font-weight:300; color:var(--text-dim); letter-spacing:0.3em; text-transform:uppercase; margin-bottom:clamp(28px,6vw,48px);">Pick your game</p>
        <div style="display:flex; gap:clamp(16px,4vw,32px); justify-content:center; flex-wrap:wrap;">
          <div id="card-snakey" class="game-card" style="cursor:pointer;">
            <canvas id="preview-snake" width="${PREVIEW_W}" height="${PREVIEW_H}"></canvas>
            <div class="game-card-label">SNAKEY</div>
          </div>
          <div id="card-dropster" class="game-card" style="cursor:pointer;">
            <canvas id="preview-tetris" width="${PREVIEW_W}" height="${PREVIEW_H}"></canvas>
            <div class="game-card-label">DROPSTER</div>
          </div>
        </div>
      </div>
    `;
    parent.appendChild(this.container);

    this.snakeCanvas = this.container.querySelector("#preview-snake")!;
    this.tetrisCanvas = this.container.querySelector("#preview-tetris")!;

    const snakeyCard = this.container.querySelector("#card-snakey")!;
    const dropsterCard = this.container.querySelector("#card-dropster")!;

    snakeyCard.addEventListener("click", () => {
      window.location.href = "https://snakey-khaki.vercel.app/";
    });
    snakeyCard.addEventListener("touchend", (e) => {
      e.preventDefault();
      window.location.href = "https://snakey-khaki.vercel.app/";
    }, { passive: false });

    dropsterCard.addEventListener("click", onDropster);
    dropsterCard.addEventListener("touchend", (e) => {
      e.preventDefault();
      onDropster();
    }, { passive: false });

    this.initSnake();
    this.initTetris();
    this.animateSnake();
    this.animateTetris();
  }

  // --- Snake preview ---

  private initSnake(): void {
    const midY = Math.floor(this.rows / 2);
    this.snake = [
      { x: 5, y: midY },
      { x: 4, y: midY },
      { x: 3, y: midY },
    ];
    this.snakeDir = { x: 1, y: 0 };
    this.placeFood();
  }

  private placeFood(): void {
    const occupied = new Set(this.snake.map(s => `${s.x},${s.y}`));
    let x: number, y: number;
    do {
      x = Math.floor(Math.random() * this.cols);
      y = Math.floor(Math.random() * this.rows);
    } while (occupied.has(`${x},${y}`));
    this.food = { x, y };
  }

  private stepSnake(): void {
    const head = this.snake[0];

    // Possible directions (excluding reverse)
    const dirs = [
      { x: 1, y: 0 }, { x: -1, y: 0 },
      { x: 0, y: 1 }, { x: 0, y: -1 },
    ].filter(d => !(d.x === -this.snakeDir.x && d.y === -this.snakeDir.y));

    // Score each direction
    const best = dirs.reduce((best, d) => {
      const nx = head.x + d.x;
      const ny = head.y + d.y;
      // Avoid walls and self
      if (nx < 0 || nx >= this.cols || ny < 0 || ny >= this.rows) return best;
      if (this.snake.some(s => s.x === nx && s.y === ny)) return best;
      const dist = Math.abs(this.food.x - nx) + Math.abs(this.food.y - ny);
      return dist < best.dist ? { d, dist } : best;
    }, { d: this.snakeDir, dist: Infinity });

    this.snakeDir = best.d;

    const newHead = { x: head.x + this.snakeDir.x, y: head.y + this.snakeDir.y };

    // Wrap on walls
    if (newHead.x < 0) newHead.x = this.cols - 1;
    if (newHead.x >= this.cols) newHead.x = 0;
    if (newHead.y < 0) newHead.y = this.rows - 1;
    if (newHead.y >= this.rows) newHead.y = 0;

    // Self collision → reset
    if (this.snake.some(s => s.x === newHead.x && s.y === newHead.y)) {
      this.initSnake();
      return;
    }

    this.snake.unshift(newHead);

    if (newHead.x === this.food.x && newHead.y === this.food.y) {
      this.placeFood();
    } else {
      this.snake.pop();
    }
  }

  private drawSnake(): void {
    const ctx = this.snakeCanvas.getContext("2d")!;
    ctx.fillStyle = "#0a0a1a";
    ctx.fillRect(0, 0, PREVIEW_W, PREVIEW_H);

    // Grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    for (let x = 0; x <= this.cols; x++) {
      ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, PREVIEW_H); ctx.stroke();
    }
    for (let y = 0; y <= this.rows; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(PREVIEW_W, y * CELL); ctx.stroke();
    }

    // Food
    ctx.fillStyle = "#ff3333";
    ctx.shadowColor = "#ff3333";
    ctx.shadowBlur = 6;
    ctx.fillRect(this.food.x * CELL + 1, this.food.y * CELL + 1, CELL - 2, CELL - 2);
    ctx.shadowBlur = 0;

    // Snake
    this.snake.forEach((s, i) => {
      const alpha = 1 - (i / this.snake.length) * 0.5;
      ctx.fillStyle = i === 0 ? "#00ff88" : `rgba(0, 255, 136, ${alpha})`;
      if (i === 0) { ctx.shadowColor = "#00ff88"; ctx.shadowBlur = 8; }
      ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
      if (i === 0) ctx.shadowBlur = 0;
    });
  }

  private animateSnake = (): void => {
    this.snakeTick++;
    if (this.snakeTick % 6 === 0) this.stepSnake();
    this.drawSnake();
    this.snakeAnimId = requestAnimationFrame(this.animateSnake);
  };

  // --- Tetris preview ---

  private initTetris(): void {
    this.tetrisGrid = Array.from({ length: this.rows }, () => Array(this.cols).fill(0));
    this.spawnTetrisPiece();
  }

  private readonly PIECES = [
    { blocks: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }], color: 1 }, // I
    { blocks: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }], color: 2 }, // O
    { blocks: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 1 }], color: 3 }, // T
    { blocks: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }], color: 4 }, // S
    { blocks: [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }], color: 5 }, // Z
    { blocks: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }], color: 6 }, // J
    { blocks: [{ x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }], color: 7 }, // L
  ];

  private readonly COLORS = ["", "#00f0f0", "#f0f000", "#a000f0", "#00f000", "#f00000", "#0000f0", "#f0a000"];

  private spawnTetrisPiece(): void {
    const p = this.PIECES[Math.floor(Math.random() * this.PIECES.length)];
    const offsetX = Math.floor((this.cols - 4) / 2);
    this.tetrisPiece = {
      x: offsetX,
      y: 0,
      blocks: p.blocks.map(b => ({ ...b })),
      color: p.color,
    };
  }

  private canPlace(px: number, py: number, blocks: { x: number; y: number }[]): boolean {
    return blocks.every(b => {
      const nx = px + b.x;
      const ny = py + b.y;
      return nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows && this.tetrisGrid[ny][nx] === 0;
    });
  }

  private stepTetris(): void {
    if (!this.tetrisPiece) return;

    if (this.canPlace(this.tetrisPiece.x, this.tetrisPiece.y + 1, this.tetrisPiece.blocks)) {
      this.tetrisPiece.y++;
    } else {
      // Lock piece
      for (const b of this.tetrisPiece.blocks) {
        const gx = this.tetrisPiece.x + b.x;
        const gy = this.tetrisPiece.y + b.y;
        if (gy >= 0 && gy < this.rows && gx >= 0 && gx < this.cols) {
          this.tetrisGrid[gy][gx] = this.tetrisPiece.color;
        }
      }

      // Clear full rows
      this.tetrisGrid = this.tetrisGrid.filter(row => row.some(c => c === 0));
      while (this.tetrisGrid.length < this.rows) {
        this.tetrisGrid.unshift(Array(this.cols).fill(0));
      }

      // Check if board is too full → clear bottom half
      const filled = this.tetrisGrid.filter(row => row.some(c => c !== 0)).length;
      if (filled > this.rows * 0.7) {
        for (let y = Math.floor(this.rows / 2); y < this.rows; y++) {
          this.tetrisGrid[y] = Array(this.cols).fill(0);
        }
      }

      this.spawnTetrisPiece();
    }
  }

  private drawTetris(): void {
    const ctx = this.tetrisCanvas.getContext("2d")!;
    ctx.fillStyle = "#0a0a1a";
    ctx.fillRect(0, 0, PREVIEW_W, PREVIEW_H);

    // Grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    for (let x = 0; x <= this.cols; x++) {
      ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, PREVIEW_H); ctx.stroke();
    }
    for (let y = 0; y <= this.rows; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(PREVIEW_W, y * CELL); ctx.stroke();
    }

    // Locked blocks
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (this.tetrisGrid[y][x] !== 0) {
          ctx.fillStyle = this.COLORS[this.tetrisGrid[y][x]];
          ctx.shadowColor = this.COLORS[this.tetrisGrid[y][x]];
          ctx.shadowBlur = 4;
          ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
          ctx.shadowBlur = 0;
        }
      }
    }

    // Current piece
    if (this.tetrisPiece) {
      ctx.fillStyle = this.COLORS[this.tetrisPiece.color];
      ctx.shadowColor = this.COLORS[this.tetrisPiece.color];
      ctx.shadowBlur = 6;
      for (const b of this.tetrisPiece.blocks) {
        const px = (this.tetrisPiece.x + b.x) * CELL;
        const py = (this.tetrisPiece.y + b.y) * CELL;
        ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
      }
      ctx.shadowBlur = 0;
    }
  }

  private animateTetris = (): void => {
    this.tetrisTick++;
    if (this.tetrisTick % 10 === 0) this.stepTetris();
    this.drawTetris();
    this.tetrisAnimId = requestAnimationFrame(this.animateTetris);
  };

  destroy(): void {
    cancelAnimationFrame(this.snakeAnimId);
    cancelAnimationFrame(this.tetrisAnimId);
    this.container.remove();
  }
}
