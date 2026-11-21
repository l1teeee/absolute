import { Color, PALETTE_HEX, type ColorIndex } from "../engine/palette";
import type { PaintGrid } from "../engine/paintGrid";

export const CELL_SIZE_PX = 6;

export function cellDevicePixels(dpr: number): number {
  return Math.max(1, Math.round(CELL_SIZE_PX * dpr));
}

export class CanvasRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly cellDevicePx: number;

  constructor(
    canvas: HTMLCanvasElement,
    cols: number,
    rows: number,
    cellDevicePx: number,
  ) {
    this.canvas = canvas;
    this.cellDevicePx = cellDevicePx;
    canvas.width = cols * cellDevicePx;
    canvas.height = rows * cellDevicePx;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas 2D context unavailable");
    }
    this.ctx = ctx;
    ctx.imageSmoothingEnabled = false;
  }

  public drawAll(grid: PaintGrid): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const cells = grid.cells;
    for (let i = 0; i < cells.length; i += 1) {
      const color = cells[i] as ColorIndex;
      if (color !== Color.Background) {
        this.fillCell(grid.cols, i, color);
      }
    }

    grid.drainDirty((index, color) => this.fillCell(grid.cols, index, color));
  }

  public drawDirty(grid: PaintGrid): void {
    grid.drainDirty((index, color) => this.fillCell(grid.cols, index, color));
  }

  private fillCell(cols: number, index: number, color: ColorIndex): void {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = col * this.cellDevicePx;
    const y = row * this.cellDevicePx;

    if (color === Color.Background) {
      this.ctx.clearRect(x, y, this.cellDevicePx, this.cellDevicePx);
    } else {
      this.ctx.fillStyle = PALETTE_HEX[color];
      this.ctx.fillRect(x, y, this.cellDevicePx, this.cellDevicePx);
    }
  }
}
