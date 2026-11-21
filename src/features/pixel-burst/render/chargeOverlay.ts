const TRACK = "#14183a";
const COLD = "#2f6bff";
const WARM = "#ffb347";
const HOT = "#ff6a3d";
const FULL = "#ff3b3b";
const FULL_BLINK = "#fff1e0";

export interface ChargeOverlayState {
  col: number;
  row: number;
  level: number;
  tick: number;
}

function levelColor(level: number, tick: number): string {
  if (level >= 1) {
    if (Math.floor(tick / 8) % 2 === 0) return FULL;
    return FULL_BLINK;
  }
  if (level >= 0.66) return HOT;
  if (level >= 0.33) return WARM;
  return COLD;
}

export class ChargeOverlayRenderer {
  private readonly context: CanvasRenderingContext2D;
  private readonly perimeter: { col: number; row: number }[] = [];
  private hasContent = false;

  public constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly cols: number,
    private readonly rows: number,
    private readonly cellDevicePx: number,
  ) {
    canvas.width = cols * cellDevicePx;
    canvas.height = rows * cellDevicePx;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D context unavailable");
    this.context = context;
    context.imageSmoothingEnabled = false;
    const middle = Math.floor(cols / 2);
    for (let col = middle; col < cols; col++) this.perimeter.push({ col, row: 0 });
    for (let row = 1; row < rows; row++) this.perimeter.push({ col: cols - 1, row });
    for (let col = cols - 2; col >= 0; col--) this.perimeter.push({ col, row: rows - 1 });
    for (let row = rows - 2; row >= 1; row--) this.perimeter.push({ col: 0, row });
    for (let col = 0; col < middle; col++) this.perimeter.push({ col, row: 0 });
  }

  public draw(state: ChargeOverlayState): void {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.fillStyle = TRACK;
    for (const cell of this.perimeter) this.fillCell(cell.col, cell.row);
    this.context.fillStyle = levelColor(state.level, state.tick);
    const filled = Math.floor(state.level * this.perimeter.length);
    for (let i = 0; i < filled; i++) {
      this.fillCell(this.perimeter[i].col, this.perimeter[i].row);
    }
    if (state.level >= 1) {
      for (let col = 1; col < this.cols - 1; col++) {
        this.fillCell(col, 1);
        this.fillCell(col, this.rows - 2);
      }
      for (let row = 2; row < this.rows - 2; row++) {
        this.fillCell(1, row);
        this.fillCell(this.cols - 2, row);
      }
    }
    const pulse = Math.max(2, Math.round(10 - 8 * state.level));
    if (Math.floor(state.tick / pulse) % 2 === 0) {
      for (let row = state.row - 1; row <= state.row + 1; row++) {
        for (const col of [0, 1, this.cols - 2, this.cols - 1]) this.fillCell(col, row);
      }
    }
    const gap = Math.round(8 - 5 * state.level);
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        const col = state.col + sx * gap;
        const row = state.row + sy * gap;
        this.fillCell(col, row);
        for (let offset = 1; offset <= 2; offset++) {
          this.fillCell(col - sx * offset, row);
          this.fillCell(col, row - sy * offset);
        }
      }
    }
    this.fillCell(state.col, state.row);
    this.hasContent = true;
  }

  public clear(): void {
    if (!this.hasContent) return;
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.hasContent = false;
  }

  private fillCell(col: number, row: number): void {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return;
    this.context.fillRect(
      col * this.cellDevicePx,
      row * this.cellDevicePx,
      this.cellDevicePx,
      this.cellDevicePx,
    );
  }
}
