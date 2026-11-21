import { Galaxy, GALAXY_HEX } from "./galaxyPalette";
import { buildGalaxyScene, isTwinklerBright, type Twinkler } from "./galaxyScene";

export class GalaxyRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly display: Uint8Array;
  private readonly twinklers: Twinkler[];

  constructor(
    canvas: HTMLCanvasElement,
    private readonly cols: number,
    private readonly rows: number,
    private readonly cellDevicePx: number,
    seed: number,
  ) {
    canvas.width = cols * cellDevicePx;
    canvas.height = rows * cellDevicePx;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    this.ctx = ctx;
    ctx.imageSmoothingEnabled = false;
    const scene = buildGalaxyScene(cols, rows, seed);
    this.display = scene.display;
    this.twinklers = scene.twinklers;
  }

  private fillCell(cell: number, colorIndex: number): void {
    this.ctx.fillStyle = GALAXY_HEX[colorIndex];
    const x = (cell % this.cols) * this.cellDevicePx;
    const y = Math.floor(cell / this.cols) * this.cellDevicePx;
    this.ctx.fillRect(x, y, this.cellDevicePx, this.cellDevicePx);
  }

  public drawAll(): void {
    this.ctx.fillStyle = GALAXY_HEX[Galaxy.Space];
    this.ctx.fillRect(0, 0, this.cols * this.cellDevicePx, this.rows * this.cellDevicePx);
    for (let cell = 0; cell < this.display.length; cell++) {
      if (this.display[cell] !== Galaxy.Space) this.fillCell(cell, this.display[cell]);
    }
    for (const twinkler of this.twinklers) twinkler.isBright = false;
  }

  public update(tick: number): void {
    for (const twinkler of this.twinklers) {
      const isBright = isTwinklerBright(twinkler, tick);
      if (isBright === twinkler.isBright) continue;
      twinkler.isBright = isBright;
      const colors = isBright ? twinkler.bright : twinkler.normal;
      for (let i = 0; i < twinkler.cells.length; i++) this.fillCell(twinkler.cells[i], colors[i]);
    }
  }
}
