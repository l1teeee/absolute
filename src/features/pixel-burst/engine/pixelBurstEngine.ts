import { EngineEventQueue, type EngineEvent } from "./engineEvents";
import { ExplosionSystem } from "./explosionSystem";
import { FlashLayer } from "./flashLayer";
import { IntroSequence } from "./introSequence";
import { MissileSystem } from "./missileSystem";
import { Color, isTransientColor } from "./palette";
import { PaintGrid } from "./paintGrid";
import { createRandom } from "./random";
import { RaySystem, TICKS_PER_SECOND } from "./raySystem";

export { TICKS_PER_SECOND, type EngineEvent };

export type Phase = "intro" | "burst" | "hold" | "reverse" | "rest";

const HOLD_TICKS = 180;
const REST_TICKS = 180;
const MIN_REVERSE_SPEED = 1.5;
const MAX_REVERSE_TICKS = 360;
const CELLS_PER_MAIN_RAY = 80;
const MIN_MAIN_RAYS = 160;
const MAX_MAIN_RAYS = 1400;

export class PixelBurstEngine {
  public readonly grid: PaintGrid;
  private readonly events: EngineEventQueue;
  private readonly flashes: FlashLayer;
  private readonly rays: RaySystem;
  private readonly explosions: ExplosionSystem;
  private readonly missiles: MissileSystem;
  private readonly intro: IntroSequence;
  private readonly mainRayCount: number;
  private phase: Phase = "intro";
  private tickIndex = 0;
  private ticksLeft = 0;
  private reverseSpeed = MIN_REVERSE_SPEED;
  private reverseCredit = 0;

  constructor(cols: number, rows: number, seed: number) {
    this.grid = new PaintGrid(cols, rows);
    const random = createRandom(seed);
    this.events = new EngineEventQueue();
    this.flashes = new FlashLayer(this.grid);
    this.rays = new RaySystem(this.grid, random);
    this.explosions = new ExplosionSystem(
      this.grid,
      this.flashes,
      this.rays,
      this.events,
    );
    this.missiles = new MissileSystem(
      this.grid,
      this.flashes,
      this.explosions,
      random,
    );
    this.intro = new IntroSequence(this.grid, this.flashes, random);
    this.intro.reset();
    this.mainRayCount = Math.max(
      MIN_MAIN_RAYS,
      Math.min(MAX_MAIN_RAYS, Math.round((cols * rows) / CELLS_PER_MAIN_RAY)),
    );
  }

  public get currentPhase(): Phase {
    return this.phase;
  }

  public drainEvents(): EngineEvent[] {
    return this.events.drain();
  }

  public tick(): void {
    if (this.phase === "intro" || this.phase === "burst") {
      if (this.phase === "intro") {
        const origin = this.intro.step();
        if (origin !== null) {
          this.explosions.mainBurst(
            origin.col,
            origin.row,
            this.tickIndex,
            this.mainRayCount,
          );
          this.phase = "burst";
        }
      }

      this.rays.step(this.tickIndex);
      this.missiles.step(this.tickIndex);
      this.flashes.step();
      this.grid.endTick();

      if (
        this.phase === "burst" &&
        this.rays.isSettled() &&
        this.missiles.isSettled() &&
        this.flashes.isSettled()
      ) {
        this.phase = "hold";
        this.ticksLeft = HOLD_TICKS;
      }
    } else if (this.phase === "hold") {
      this.ticksLeft -= 1;
      if (this.ticksLeft <= 0) {
        this.phase = "reverse";
        this.reverseSpeed = Math.max(
          MIN_REVERSE_SPEED,
          this.grid.recordedTicks / MAX_REVERSE_TICKS,
        );
        this.reverseCredit = 0;
      }
    } else if (this.phase === "reverse") {
      this.reverseCredit += this.reverseSpeed;
      while (this.reverseCredit >= 1 && this.grid.recordedTicks > 0) {
        this.grid.undoTick();
        this.reverseCredit -= 1;
      }
      if (this.grid.recordedTicks === 0) {
        this.rays.clear();
        this.missiles.clear();
        this.flashes.clear();
        this.events.clear();
        this.explosions.resetEnergy();
        this.phase = "rest";
        this.ticksLeft = REST_TICKS;
      }
    } else if (this.phase === "rest") {
      this.ticksLeft -= 1;
      if (this.ticksLeft <= 0) {
        this.intro.reset();
        this.phase = "intro";
      }
    }

    this.tickIndex += 1;
  }

  public click(col: number, row: number): void {
    const clampedCol = Math.max(0, Math.min(this.grid.cols - 1, col));
    const clampedRow = Math.max(0, Math.min(this.grid.rows - 1, row));

    this.interruptReplay();
    this.missiles.launchVolley(clampedCol, clampedRow);
  }

  public launchCharged(col: number, row: number, charge: number): void {
    const clampedCol = Math.max(0, Math.min(this.grid.cols - 1, col));
    const clampedRow = Math.max(0, Math.min(this.grid.rows - 1, row));
    const clampedCharge = Math.max(0, Math.min(1, charge));

    this.interruptReplay();
    this.missiles.launchHeavy(clampedCol, clampedRow, clampedCharge);
    this.events.push({ type: "heavyLaunch" });
  }

  public settle(maxTicks: number): void {
    let ran = 0;
    while (this.phase !== "hold" && ran < maxTicks) {
      this.tick();
      ran += 1;
    }
  }

  private interruptReplay(): void {
    if (this.phase === "reverse") {
      // Reverse replay restores flash, shock and missile pixels that no system owns once it stops.
      for (let i = 0; i < this.grid.cells.length; i += 1) {
        const color = this.grid.get(i);
        if (isTransientColor(color) || color === Color.Spark) {
          this.grid.paint(i, Color.Background);
        }
      }
    }

    if (
      this.phase === "hold" ||
      this.phase === "reverse" ||
      this.phase === "rest"
    ) {
      this.phase = "burst";
    }
  }
}
