import {
  createLitCell,
  restoreLitCell,
  showLitCell,
  type LitCell,
} from "./litCell";
import type { ColorIndex } from "./palette";
import type { PaintGrid } from "./paintGrid";

interface Flash {
  cell: number;
  colors: readonly ColorIndex[];
  ticksPerColor: number;
  delay: number;
  age: number;
  lit: LitCell | null;
}

export class FlashLayer {
  private readonly grid: PaintGrid;
  private readonly flashes: Flash[] = [];

  constructor(grid: PaintGrid) {
    this.grid = grid;
  }

  public light(
    cell: number,
    colors: readonly ColorIndex[],
    ticksPerColor: number,
    delayTicks: number,
  ): void {
    this.flashes.push({
      cell,
      colors,
      ticksPerColor,
      delay: delayTicks,
      age: 0,
      lit: null,
    });
  }

  public step(): void {
    let writeIndex = 0;

    for (let i = 0; i < this.flashes.length; i += 1) {
      const flash = this.flashes[i];

      if (flash.delay > 0) {
        flash.delay -= 1;
        this.flashes[writeIndex] = flash;
        writeIndex += 1;
        continue;
      }

      if (flash.lit === null) {
        flash.lit = createLitCell(this.grid, flash.cell);
      }

      const colorIndex = Math.floor(flash.age / flash.ticksPerColor);
      if (colorIndex >= flash.colors.length) {
        restoreLitCell(this.grid, flash.lit);
        continue;
      }

      showLitCell(this.grid, flash.lit, flash.colors[colorIndex]);
      flash.age += 1;
      this.flashes[writeIndex] = flash;
      writeIndex += 1;
    }

    this.flashes.length = writeIndex;
  }

  public isSettled(): boolean {
    return this.flashes.length === 0;
  }

  public clear(): void {
    this.flashes.length = 0;
  }
}
