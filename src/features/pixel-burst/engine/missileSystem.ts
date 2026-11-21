import type { ExplosionSystem } from "./explosionSystem";
import type { FlashLayer } from "./flashLayer";
import { Missile } from "./missile";
import type { PaintGrid } from "./paintGrid";
import { arcPath } from "./paths";
import type { Random } from "./random";

const MISSILES_PER_VOLLEY = 8;
const LAUNCH_ROW_SPREAD_FACTOR = 0.35;
const IMPACT_SCATTER = 3;
const MAX_BEND = 0.3;
const MIN_FLIGHT_TICKS = 70;
const FLIGHT_TICKS_RANGE = 40;
const MAX_LAUNCH_DELAY_TICKS = 30;

const HEAVY_MISSILES = 2;
const HEAVY_ROW_SPREAD_FACTOR = 0.15;
const HEAVY_IMPACT_SCATTER = 1;
const HEAVY_MAX_BEND = 0.15;
const HEAVY_MIN_FLIGHT_TICKS = 120;
const HEAVY_FLIGHT_TICKS_RANGE = 20;
const HEAVY_LAUNCH_STAGGER_TICKS = 6;

export class MissileSystem {
  private readonly grid: PaintGrid;
  private readonly flashes: FlashLayer;
  private readonly explosions: ExplosionSystem;
  private readonly random: Random;
  private readonly missiles: Missile[] = [];

  constructor(
    grid: PaintGrid,
    flashes: FlashLayer,
    explosions: ExplosionSystem,
    random: Random,
  ) {
    this.grid = grid;
    this.flashes = flashes;
    this.explosions = explosions;
    this.random = random;
  }

  public launchVolley(targetCol: number, targetRow: number): void {
    const spread = Math.max(
      1,
      Math.round(this.grid.rows * LAUNCH_ROW_SPREAD_FACTOR),
    );

    for (let i = 0; i < MISSILES_PER_VOLLEY; i += 1) {
      const fromLeft = i % 2 === 0;
      const launchRow = this.clampRow(
        targetRow + this.randomInt(-spread, spread),
      );
      const impactCol = this.clampCol(
        targetCol + this.randomInt(-IMPACT_SCATTER, IMPACT_SCATTER),
      );
      const impactRow = this.clampRow(
        targetRow + this.randomInt(-IMPACT_SCATTER, IMPACT_SCATTER),
      );
      const bend = (this.random() * 2 - 1) * MAX_BEND;
      const flightTicks =
        MIN_FLIGHT_TICKS + Math.floor(this.random() * FLIGHT_TICKS_RANGE);
      const delayTicks = Math.floor(this.random() * MAX_LAUNCH_DELAY_TICKS);

      const path = arcPath(
        this.grid,
        { col: fromLeft ? 0 : this.grid.cols - 1, row: launchRow },
        { col: impactCol, row: impactRow },
        bend,
      );

      this.missiles.push(
        new Missile(this.grid, this.flashes, this.random, {
          path,
          flightTicks,
          delayTicks,
          easing: "linear",
          velocityTint: false,
          heavy: false,
          charge: 0,
        }),
      );
    }
  }

  public launchHeavy(
    targetCol: number,
    targetRow: number,
    charge: number,
  ): void {
    for (let i = 0; i < HEAVY_MISSILES; i += 1) {
      const fromLeft = i === 0;
      const spread = Math.max(
        1,
        Math.round(this.grid.rows * HEAVY_ROW_SPREAD_FACTOR),
      );
      const launchRow = this.clampRow(
        targetRow + this.randomInt(-spread, spread),
      );
      const impactCol = this.clampCol(
        targetCol + this.randomInt(-HEAVY_IMPACT_SCATTER, HEAVY_IMPACT_SCATTER),
      );
      const impactRow = this.clampRow(
        targetRow + this.randomInt(-HEAVY_IMPACT_SCATTER, HEAVY_IMPACT_SCATTER),
      );
      const bend = (this.random() * 2 - 1) * HEAVY_MAX_BEND;
      const flightTicks =
        HEAVY_MIN_FLIGHT_TICKS +
        Math.floor(this.random() * HEAVY_FLIGHT_TICKS_RANGE);
      const delayTicks = i * HEAVY_LAUNCH_STAGGER_TICKS;

      const path = arcPath(
        this.grid,
        { col: fromLeft ? 0 : this.grid.cols - 1, row: launchRow },
        { col: impactCol, row: impactRow },
        bend,
      );

      this.missiles.push(
        new Missile(this.grid, this.flashes, this.random, {
          path,
          flightTicks,
          delayTicks,
          easing: "easeIn",
          velocityTint: false,
          heavy: true,
          charge,
        }),
      );
    }
  }

  public step(currentTick: number): void {
    let writeIndex = 0;

    for (let i = 0; i < this.missiles.length; i += 1) {
      const missile = this.missiles[i];
      missile.step();

      if (missile.isDone) {
        const impact = missile.impactCell;
        const col = impact % this.grid.cols;
        const row = Math.floor(impact / this.grid.cols);
        if (missile.isHeavy) {
          this.explosions.detonateHeavy(col, row, currentTick, missile.charge);
        } else {
          this.explosions.detonate(col, row, currentTick);
        }
      } else {
        this.missiles[writeIndex] = missile;
        writeIndex += 1;
      }
    }

    this.missiles.length = writeIndex;
  }

  public isSettled(): boolean {
    return this.missiles.length === 0;
  }

  public clear(): void {
    this.missiles.length = 0;
  }

  private randomInt(min: number, max: number): number {
    return min + Math.floor(this.random() * (max - min + 1));
  }

  private clampCol(col: number): number {
    return Math.max(0, Math.min(this.grid.cols - 1, col));
  }

  private clampRow(row: number): number {
    return Math.max(0, Math.min(this.grid.rows - 1, row));
  }
}
