import type { PaintGrid } from "./paintGrid";

export interface GridPoint {
  col: number;
  row: number;
}

export function arcPath(
  grid: PaintGrid,
  from: GridPoint,
  to: GridPoint,
  bend: number,
): number[] {
  const dx = to.col - from.col;
  const dy = to.row - from.row;
  const length = Math.hypot(dx, dy);
  const cx = from.col + dx / 2 - dy * bend;
  const cy = from.row + dy / 2 + dx * bend;
  const samples = Math.max(1, Math.ceil(length * 3));

  let prevCol = clamp(Math.round(from.col), 0, grid.cols - 1);
  let prevRow = clamp(Math.round(from.row), 0, grid.rows - 1);
  const path: number[] = [grid.index(prevCol, prevRow)];

  for (let i = 1; i <= samples; i += 1) {
    const t = i / samples;
    const inv = 1 - t;
    const x = inv * inv * from.col + 2 * inv * t * cx + t * t * to.col;
    const y = inv * inv * from.row + 2 * inv * t * cy + t * t * to.row;
    const col = clamp(Math.round(x), 0, grid.cols - 1);
    const row = clamp(Math.round(y), 0, grid.rows - 1);

    if (col === prevCol && row === prevRow) continue;

    while (Math.abs(col - prevCol) > 1 || Math.abs(row - prevRow) > 1) {
      prevCol += Math.sign(col - prevCol);
      prevRow += Math.sign(row - prevRow);
      path.push(grid.index(prevCol, prevRow));
    }

    prevCol = col;
    prevRow = row;
    path.push(grid.index(prevCol, prevRow));
  }

  return path;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
