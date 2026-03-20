// [CP01] Minimal touch input: swipe gestures + optional virtual button overlay

interface TouchCallbacks {
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onSoftDrop: () => void;
  onHardDrop: () => void;
  onRotateCW: () => void;
  onRotateCCW: () => void;
  onHoldPiece: () => void;
}

const SWIPE_MIN_PX = 30;
const TAP_MAX_MS = 200;
const TAP_MAX_MOVE_PX = 10;
const DOUBLE_TAP_MAX_MS = 300;
const LONG_PRESS_MS = 300;
const BTN_SIZE = 56;

export class TouchControls {
  private callbacks: TouchCallbacks;
  private element: HTMLElement;
  private overlay: HTMLElement | null = null;
  private toggleBtn: HTMLElement | null = null;
  private buttonsVisible = false;

  // Gesture tracking
  private touchStartX = 0;
  private touchStartY = 0;
  private touchStartTime = 0;
  private lastTapTime = 0;
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private didSwipe = false;

  // Bound listeners for cleanup
  private handleStart: (e: TouchEvent) => void;
  private handleMove: (e: TouchEvent) => void;
  private handleEnd: (e: TouchEvent) => void;

  constructor(element: HTMLElement, callbacks: TouchCallbacks) {
    this.element = element;
    this.callbacks = callbacks;

    this.handleStart = this.onTouchStart.bind(this);
    this.handleMove = this.onTouchMove.bind(this);
    this.handleEnd = this.onTouchEnd.bind(this);

    if (!("ontouchstart" in window)) return;

    element.addEventListener("touchstart", this.handleStart, { passive: false });
    element.addEventListener("touchmove", this.handleMove, { passive: false });
    element.addEventListener("touchend", this.handleEnd, { passive: false });

    this.createToggleButton();
  }

  // --- Gesture handlers ---

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    const t = e.changedTouches[0];
    this.touchStartX = t.clientX;
    this.touchStartY = t.clientY;
    this.touchStartTime = Date.now();
    this.didSwipe = false;

    this.longPressTimer = setTimeout(() => {
      this.didSwipe = true; // prevent tap from firing
      this.callbacks.onHoldPiece();
    }, LONG_PRESS_MS);
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    const t = e.changedTouches[0];
    const dx = t.clientX - this.touchStartX;
    const dy = t.clientY - this.touchStartY;

    if (this.didSwipe) return;
    if (Math.abs(dx) < SWIPE_MIN_PX && Math.abs(dy) < SWIPE_MIN_PX) return;

    this.didSwipe = true;
    this.clearLongPress();

    if (Math.abs(dx) >= Math.abs(dy)) {
      if (dx < 0) this.callbacks.onMoveLeft();
      else this.callbacks.onMoveRight();
    } else {
      if (dy > 0) this.callbacks.onSoftDrop();
      else this.callbacks.onHardDrop();
    }
  }

  private onTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    this.clearLongPress();

    if (this.didSwipe) return;

    const t = e.changedTouches[0];
    const elapsed = Date.now() - this.touchStartTime;
    const dx = Math.abs(t.clientX - this.touchStartX);
    const dy = Math.abs(t.clientY - this.touchStartY);

    const isTap = elapsed < TAP_MAX_MS && dx < TAP_MAX_MOVE_PX && dy < TAP_MAX_MOVE_PX;
    if (!isTap) return;

    const now = Date.now();
    const sinceLastTap = now - this.lastTapTime;
    if (sinceLastTap < DOUBLE_TAP_MAX_MS) {
      this.lastTapTime = 0;
      this.callbacks.onRotateCCW();
    } else {
      this.lastTapTime = now;
      this.callbacks.onRotateCW();
    }
  }

  private clearLongPress(): void {
    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  // --- Virtual buttons ---

  private createToggleButton(): void {
    const btn = document.createElement("button");
    btn.textContent = "🎮";
    Object.assign(btn.style, {
      position: "fixed",
      bottom: "8px",
      right: "8px",
      zIndex: "1000",
      background: "rgba(0,0,0,0.6)",
      color: "#fff",
      border: "none",
      borderRadius: "8px",
      padding: "8px 10px",
      fontSize: "18px",
      cursor: "pointer",
      touchAction: "none",
    });
    btn.addEventListener("touchstart", (e) => { e.stopPropagation(); e.preventDefault(); this.toggleButtons(); }, { passive: false });
    document.body.appendChild(btn);
    this.toggleBtn = btn;
  }

  private createOverlay(): HTMLElement {
    const overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position: "fixed",
      bottom: "0",
      left: "0",
      right: "0",
      height: `${BTN_SIZE + 32}px`,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "8px 16px",
      zIndex: "999",
      pointerEvents: "none",
    });

    const leftGroup = this.makeGroup([
      { label: "←", action: this.callbacks.onMoveLeft },
      { label: "↓", action: this.callbacks.onSoftDrop },
      { label: "→", action: this.callbacks.onMoveRight },
    ]);

    const rightGroup = this.makeGroup([
      { label: "↻", action: this.callbacks.onRotateCW },
      { label: "⤓", action: this.callbacks.onHardDrop },
      { label: "⊟", action: this.callbacks.onHoldPiece },
    ]);

    overlay.appendChild(leftGroup);
    overlay.appendChild(rightGroup);
    this.element.appendChild(overlay);
    return overlay;
  }

  private makeGroup(btns: { label: string; action: () => void }[]): HTMLElement {
    const group = document.createElement("div");
    Object.assign(group.style, {
      display: "flex",
      gap: "8px",
      pointerEvents: "auto",
    });
    for (const { label, action } of btns) {
      group.appendChild(this.makeBtn(label, action));
    }
    return group;
  }

  private makeBtn(label: string, action: () => void): HTMLElement {
    const btn = document.createElement("button");
    btn.textContent = label;
    Object.assign(btn.style, {
      width: `${BTN_SIZE}px`,
      height: `${BTN_SIZE}px`,
      background: "rgba(0,0,0,0.55)",
      color: "#fff",
      border: "2px solid rgba(255,255,255,0.25)",
      borderRadius: "12px",
      fontSize: "22px",
      cursor: "pointer",
      opacity: "0.8",
      touchAction: "none",
      userSelect: "none",
    });

    btn.addEventListener("touchstart", (e) => {
      e.stopPropagation();
      e.preventDefault();
      btn.style.opacity = "1";
      action();
    }, { passive: false });

    btn.addEventListener("touchend", (e) => {
      e.stopPropagation();
      e.preventDefault();
      btn.style.opacity = "0.8";
    }, { passive: false });

    return btn;
  }

  // --- Public API ---

  showButtons(): void {
    if (!this.overlay) this.overlay = this.createOverlay();
    this.overlay.style.display = "flex";
    this.buttonsVisible = true;
  }

  hideButtons(): void {
    if (this.overlay) this.overlay.style.display = "none";
    this.buttonsVisible = false;
  }

  toggleButtons(): void {
    if (this.buttonsVisible) this.hideButtons();
    else this.showButtons();
  }

  destroy(): void {
    this.clearLongPress();
    this.element.removeEventListener("touchstart", this.handleStart);
    this.element.removeEventListener("touchmove", this.handleMove);
    this.element.removeEventListener("touchend", this.handleEnd);
    if (this.overlay) this.overlay.remove();
    if (this.toggleBtn) this.toggleBtn.remove();
  }
}
