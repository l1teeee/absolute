import { Color, isTransientColor, type ColorIndex } from "./palette";
import type { PaintGrid } from "./paintGrid";

export interface LitCell {
  cell: number;
  under: ColorIndex;
  shown: ColorIndex;
}

export function createLitCell(grid: PaintGrid, cell: number): LitCell {
  const current = grid.get(cell);
  return { cell, under: current, shown: current };
}

export function showLitCell(
  grid: PaintGrid,
  lit: LitCell,
  color: ColorIndex,
): void {
  const current = grid.get(lit.cell);
  if (current !== lit.shown) {
    lit.under = current;
  }
  if (current !== color) {
    grid.paint(lit.cell, color);
    lit.shown = color;
  }
}

export function restoreLitCell(grid: PaintGrid, lit: LitCell): void {
  if (grid.get(lit.cell) === lit.shown) {
    // A captured transient color would leave a stale light if another effect overlapped this cell.
    grid.paint(
      lit.cell,
      isTransientColor(lit.under) ? Color.Background : lit.under,
    );
  }
}
