import type { EngineEventQueue } from "./engineEvents";
import type { FlashLayer } from "./flashLayer";
import { Color, type ColorIndex } from "./palette";
import type { PaintGrid } from "./paintGrid";
import type { RaySystem } from "./raySystem";

const MIN_EXPLOSION_SCALE = 0.3;
const EXPLOSION_GROWTH = 0.12;
const MAX_EXPLOSION_SCALE = 1.6;
const INTRO_MISSILES = 2;
const MIN_DEBRIS_RAYS = 6;
const MIN_MAIN_RAYS_SCALED = 40;
const MIN_MAIN_REACH = 0.15;
const MAIN_EMISSION_TICKS = 90;
const MAIN_SHOCK_RADIUS = 16;

const FLASH_COLORS: readonly ColorIndex[] = [
  Color.Flash1,
  Color.Flash2,
  Color.Flash3,
  Color.Flash4,
  Color.Flash5,
];
const FLASH_TICKS_PER_COLOR = 2;
const SHOCK_COLORS: readonly ColorIndex[] = [
  Color.Shock1,
  Color.Shock2,
  Color.Shock3,
  Color.Shock4,
];
const SHOCK_TICKS_PER_COLOR = 2;
const IMPACT_FLASH_RADIUS = 2;
const IMPACT_SHOCK_START = 3;
const IMPACT_SHOCK_RADIUS = 9;
const DEBRIS_RAYS = 28;
const DEBRIS_EMISSION_TICKS = 4;
const DEBRIS_MIN_LENGTH = 4;
const DEBRIS_MAX_LENGTH = 16;
const BIG_FLASH_RADIUS = 3;
const BIG_SHOCK_START = 4;

const HEAVY_BASE_ENERGY = 6;
const HEAVY_CHARGE_ENERGY = 10;
const HEAVY_MIN_SCALE = 1.0;
const HEAVY_CHARGE_SCALE = 0.9;
const HEAVY_FLASH_FACTOR = 1.5;
const HEAVY_SHOCK_FACTOR = 1.4;
const HEAVY_OUTER_START_FACTOR = 0.5;
const HEAVY_OUTER_RADIUS_FACTOR = 1.6;
const HEAVY_SECOND_RING_DELAY = 8;
const HEAVY_DEBRIS_FACTOR = 2;
const HEAVY_DEBRIS_LENGTH_FACTOR = 1.5;
const HEAVY_SHOCK_COLORS: readonly ColorIndex[] = [
  Color.HeavyGlow1,
  Color.HeavyGlow2,
  Color.HeavyGlow3,
  Color.HeavyGlow4,
  Color.HeavyGlow5,
];

export function explosionScale(detonations: number): number {
  return Math.min(
    MAX_EXPLOSION_SCALE,
    MIN_EXPLOSION_SCALE + EXPLOSION_GROWTH * Math.sqrt(detonations),
  );
}

export class ExplosionSystem {
  private readonly grid: PaintGrid;
  private readonly flashes: FlashLayer;
  private readonly rays: RaySystem;
  private readonly events: EngineEventQueue;
  private detonations = 0;

  constructor(
    grid: PaintGrid,
    flashes: FlashLayer,
    rays: RaySystem,
    events: EngineEventQueue,
  ) {
    this.grid = grid;
    this.flashes = flashes;
    this.rays = rays;
    this.events = events;
  }

  public resetEnergy(): void {
    this.detonations = 0;
  }

  public detonate(col: number, row: number, currentTick: number): void {
    this.detonations += 1;
    const scale = explosionScale(this.detonations);
    const flashRadius = Math.max(1, Math.round(IMPACT_FLASH_RADIUS * scale));
    const shockStart = Math.max(2, Math.round(IMPACT_SHOCK_START * scale));
    const shockRadius = Math.max(
      shockStart + 1,
      Math.round(IMPACT_SHOCK_RADIUS * scale),
    );
    const debrisRays = Math.max(
      MIN_DEBRIS_RAYS,
      Math.round(DEBRIS_RAYS * scale),
    );
    const minLength = Math.max(2, Math.round(DEBRIS_MIN_LENGTH * scale));
    const maxLength = Math.max(
      minLength + 1,
      Math.round(DEBRIS_MAX_LENGTH * scale),
    );

    this.flashCore(col, row, flashRadius);
    this.ring(col, row, shockStart, shockRadius, SHOCK_COLORS, 0);
    this.rays.spawnBurst(
      col,
      row,
      debrisRays,
      DEBRIS_EMISSION_TICKS,
      currentTick,
      {
        kind: "radial",
        minLength,
        maxLength,
      },
    );
  }

  public detonateHeavy(
    col: number,
    row: number,
    currentTick: number,
    charge: number,
  ): void {
    this.detonations +=
      HEAVY_BASE_ENERGY + Math.round(HEAVY_CHARGE_ENERGY * charge);
    const scale = Math.max(
      explosionScale(this.detonations),
      HEAVY_MIN_SCALE + HEAVY_CHARGE_SCALE * charge,
    );
    const flashRadius = Math.max(
      2,
      Math.round(IMPACT_FLASH_RADIUS * scale * HEAVY_FLASH_FACTOR),
    );
    const shockStart = Math.max(2, Math.round(IMPACT_SHOCK_START * scale));
    const shockRadius = Math.max(
      shockStart + 2,
      Math.round(IMPACT_SHOCK_RADIUS * scale * HEAVY_SHOCK_FACTOR),
    );
    const outerStart = Math.round(shockRadius * HEAVY_OUTER_START_FACTOR);
    const outerRadius = Math.round(shockRadius * HEAVY_OUTER_RADIUS_FACTOR);

    this.flashCore(col, row, flashRadius);
    this.ring(col, row, shockStart, shockRadius, SHOCK_COLORS, 0);
    this.ring(
      col,
      row,
      outerStart,
      outerRadius,
      HEAVY_SHOCK_COLORS,
      HEAVY_SECOND_RING_DELAY,
    );

    const count = Math.round(DEBRIS_RAYS * scale * HEAVY_DEBRIS_FACTOR);
    const minLength = Math.max(
      2,
      Math.round(DEBRIS_MIN_LENGTH * scale * HEAVY_DEBRIS_LENGTH_FACTOR),
    );
    const maxLength = Math.max(
      minLength + 1,
      Math.round(DEBRIS_MAX_LENGTH * scale * HEAVY_DEBRIS_LENGTH_FACTOR),
    );

    this.rays.spawnBurst(
      col,
      row,
      count,
      DEBRIS_EMISSION_TICKS,
      currentTick,
      {
        kind: "radial",
        minLength,
        maxLength,
      },
    );
    this.events.push({ type: "heavyImpact", strength: charge });
  }

  public mainBurst(
    col: number,
    row: number,
    currentTick: number,
    fullRayCount: number,
  ): void {
    this.detonations += INTRO_MISSILES;
    const scale = explosionScale(this.detonations);
    const ratio = Math.min(1, scale / MAX_EXPLOSION_SCALE);
    const rayCount = Math.max(
      MIN_MAIN_RAYS_SCALED,
      Math.round(fullRayCount * ratio),
    );
    const reach = Math.max(MIN_MAIN_REACH, ratio);

    this.rays.spawnBurst(
      col,
      row,
      rayCount,
      MAIN_EMISSION_TICKS,
      currentTick,
      { kind: "bowtie", reach },
    );
    this.flashCore(col, row, Math.max(2, Math.round(BIG_FLASH_RADIUS * scale)));
    this.ring(
      col,
      row,
      BIG_SHOCK_START,
      Math.max(BIG_SHOCK_START + 2, Math.round(MAIN_SHOCK_RADIUS * ratio)),
      SHOCK_COLORS,
      0,
    );
  }

  private flashCore(col: number, row: number, radius: number): void {
    for (let dr = -radius; dr <= radius; dr += 1) {
      for (let dc = -radius; dc <= radius; dc += 1) {
        const dist = Math.abs(dc) + Math.abs(dr);
        if (dist > radius) continue;
        const c = col + dc;
        const r = row + dr;
        if (this.grid.inBounds(c, r)) {
          this.flashes.light(
            this.grid.index(c, r),
            FLASH_COLORS,
            FLASH_TICKS_PER_COLOR,
            dist,
          );
        }
      }
    }
  }

  private ring(
    col: number,
    row: number,
    fromRadius: number,
    toRadius: number,
    colors: readonly ColorIndex[],
    baseDelay: number,
  ): void {
    for (let r = fromRadius; r <= toRadius; r += 1) {
      const delay = baseDelay + r - fromRadius + 1;
      for (let dr = -r; dr <= r; dr += 1) {
        for (let dc = -r; dc <= r; dc += 1) {
          if (Math.round(Math.hypot(dc, dr)) !== r) continue;
          const c = col + dc;
          const rr = row + dr;
          if (this.grid.inBounds(c, rr)) {
            this.flashes.light(
              this.grid.index(c, rr),
              colors,
              SHOCK_TICKS_PER_COLOR,
              delay,
            );
          }
        }
      }
    }
  }
}
