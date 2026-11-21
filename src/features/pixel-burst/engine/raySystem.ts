import {
  Color,
  emberColorForAge,
  headColorForAge,
  isInkOrBackground,
  type ColorIndex,
} from "./palette";
import type { PaintGrid } from "./paintGrid";
import type { Random } from "./random";

export const TICKS_PER_SECOND = 60;

export type BurstShape =
  | { kind: "bowtie"; reach: number }
  | { kind: "radial"; minLength: number; maxLength: number };

const MAX_ANGLE_RAD = (80 * Math.PI) / 180;
const ANGLE_BIAS = 1.7;
const MIN_SPEED_FACTOR = 0.3;
const SPEED_FACTOR_RANGE = 0.65;
const EMISSION_BIAS = 1.6;
const STOP_CHANCE = 0.25;
const STOP_MIN_FACTOR = 0.15;
const STOP_FACTOR_RANGE = 0.55;
const REACH_MIN_FACTOR = 0.6;
const REACH_FACTOR_RANGE = 0.6;
const GAP_CHANCE = 0.22;
const JITTER_CHANCE = 0.05;
const THICK_CHANCE = 0.2;
const SOFT_INK_CHANCE = 0.3;
const MAX_SUBSTEP_CELLS = 0.5;
const RADIAL_TRAVEL_TICKS = 30;
const NO_CELL = -1;

interface Ray {
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  speed: number;
  spawnTick: number;
  age: number;
  remaining: number;
  cell: number;
  under: ColorIndex;
  thick: boolean;
  ink: ColorIndex;
  debris: boolean;
  alive: boolean;
}

export class RaySystem {
  private readonly grid: PaintGrid;
  private readonly random: Random;
  private readonly halfSpan: number;
  private rays: Ray[] = [];

  constructor(grid: PaintGrid, random: Random) {
    this.grid = grid;
    this.random = random;
    this.halfSpan = Math.max(grid.cols, grid.rows) / 2;
  }

  public spawnBurst(
    col: number,
    row: number,
    count: number,
    emissionTicks: number,
    currentTick: number,
    shape: BurstShape,
  ): void {
    for (let i = 0; i < count; i += 1) {
      if (shape.kind === "bowtie") {
        const side = this.random() < 0.5 ? -1 : 1;
        const spread = MAX_ANGLE_RAD * this.random() ** ANGLE_BIAS;
        const vSign = this.random() < 0.5 ? -1 : 1;
        const dirX = side * Math.cos(spread);
        const dirY = vSign * Math.sin(spread);
        const speed =
          (this.halfSpan *
            (MIN_SPEED_FACTOR + SPEED_FACTOR_RANGE * this.random())) /
          TICKS_PER_SECOND;
        const spawnTick =
          currentTick +
          Math.floor(emissionTicks * this.random() ** EMISSION_BIAS);
        const stopLimit =
          this.random() < STOP_CHANCE
            ? this.halfSpan *
              (STOP_MIN_FACTOR + STOP_FACTOR_RANGE * this.random())
            : Infinity;
        const thick = this.random() < THICK_CHANCE;
        const ink =
          this.random() < SOFT_INK_CHANCE ? Color.TrailSoft : Color.Trail;
        const reachFactor = this.random();
        const limit =
          this.halfSpan *
          shape.reach *
          (REACH_MIN_FACTOR + REACH_FACTOR_RANGE * reachFactor);
        const remaining = Math.min(stopLimit, limit);

        this.rays.push({
          x: col + 0.5,
          y: row + 0.5,
          dirX,
          dirY,
          speed,
          spawnTick,
          age: 0,
          remaining,
          cell: NO_CELL,
          under: Color.Background,
          thick,
          ink,
          debris: false,
          alive: true,
        });
      } else {
        const angle = this.random() * 2 * Math.PI;
        const dirX = Math.cos(angle);
        const dirY = Math.sin(angle);
        const speed =
          (shape.maxLength / RADIAL_TRAVEL_TICKS) *
          (0.5 + 0.5 * this.random());
        const spawnTick =
          currentTick + Math.floor(emissionTicks * this.random());
        const remaining =
          shape.minLength +
          (shape.maxLength - shape.minLength) * this.random();
        const thick = this.random() < THICK_CHANCE;
        const ink =
          this.random() < SOFT_INK_CHANCE ? Color.DebrisSoft : Color.Debris;

        this.rays.push({
          x: col + 0.5,
          y: row + 0.5,
          dirX,
          dirY,
          speed,
          spawnTick,
          age: 0,
          remaining,
          cell: NO_CELL,
          under: Color.Background,
          thick,
          ink,
          debris: true,
          alive: true,
        });
      }
    }
  }

  public step(currentTick: number): void {
    for (let i = 0; i < this.rays.length; i += 1) {
      const ray = this.rays[i];
      if (!ray.alive || currentTick < ray.spawnTick) continue;

      if (ray.cell === NO_CELL) {
        ray.cell = this.grid.index(Math.floor(ray.x), Math.floor(ray.y));
        ray.under = this.grid.get(ray.cell);
        this.grid.paint(ray.cell, this.colorForHead(ray, 0));
        continue;
      }

      ray.age += 1;
      const substeps = Math.ceil(ray.speed / MAX_SUBSTEP_CELLS);
      const stepLength = ray.speed / substeps;

      for (let s = 0; s < substeps; s += 1) {
        ray.x += ray.dirX * stepLength;
        ray.y += ray.dirY * stepLength;
        const col = Math.floor(ray.x);
        const row = Math.floor(ray.y);

        if (!this.grid.inBounds(col, row)) {
          this.leaveCell(ray);
          ray.alive = false;
          break;
        }

        const next = this.grid.index(col, row);
        if (next !== ray.cell) {
          this.leaveCell(ray);
          ray.cell = next;
          ray.under = this.grid.get(next);
          this.grid.paint(next, this.colorForHead(ray, ray.age));

          if (this.random() < JITTER_CHANCE) {
            const sign = this.random() < 0.5 ? -1 : 1;
            ray.x += -ray.dirY * sign;
            ray.y += ray.dirX * sign;
          }

          ray.remaining -= 1;
          if (ray.remaining <= 0) {
            ray.alive = false;
            break;
          }
        }
      }

      if (ray.alive) {
        this.grid.paint(ray.cell, this.colorForHead(ray, ray.age));
      }
    }

    let writeIndex = 0;
    for (let i = 0; i < this.rays.length; i += 1) {
      if (this.rays[i].alive) {
        this.rays[writeIndex] = this.rays[i];
        writeIndex += 1;
      }
    }
    this.rays.length = writeIndex;
  }

  public isSettled(): boolean {
    return this.rays.length === 0;
  }

  public clear(): void {
    this.rays.length = 0;
  }

  private colorForHead(ray: Ray, age: number): ColorIndex {
    return ray.debris ? emberColorForAge(age) : headColorForAge(age);
  }

  private leaveCell(ray: Ray): void {
    if (this.random() < GAP_CHANCE && isInkOrBackground(ray.under)) {
      this.grid.paint(ray.cell, ray.under);
      return;
    }

    this.grid.paint(ray.cell, ray.ink);
    if (ray.thick) {
      const col = ray.cell % this.grid.cols;
      const row = Math.floor(ray.cell / this.grid.cols);
      const horizontal = Math.abs(ray.dirX) >= Math.abs(ray.dirY);
      const neighborCol = horizontal ? col : col + 1;
      const neighborRow = horizontal ? row + 1 : row;
      if (this.grid.inBounds(neighborCol, neighborRow)) {
        this.grid.paint(
          this.grid.index(neighborCol, neighborRow),
          ray.debris ? Color.DebrisSoft : Color.TrailSoft,
        );
      }
    }
  }
}
