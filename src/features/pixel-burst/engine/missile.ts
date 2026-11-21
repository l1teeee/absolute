import type { FlashLayer } from "./flashLayer";
import {
  createLitCell,
  restoreLitCell,
  showLitCell,
  type LitCell,
} from "./litCell";
import { Color, type ColorIndex } from "./palette";
import type { PaintGrid } from "./paintGrid";
import type { Random } from "./random";

export interface MissileOptions {
  path: readonly number[];
  flightTicks: number;
  delayTicks: number;
  easing: "linear" | "easeIn";
  velocityTint: boolean;
  heavy?: boolean;
  charge?: number;
}

const CHARGE_TICKS = 24;
const HEAVY_CHARGE_TICKS = 36;
const CHARGE_HALF_PERIOD = 4;
const FLICKER_HALF_PERIOD = 2;
const EASE_IN_POWER = 2.2;
const TAIL_COLORS: readonly ColorIndex[] = [
  Color.MissileGlow1,
  Color.MissileGlow2,
  Color.MissileGlow3,
  Color.MissileGlow4,
  Color.MissileGlow5,
];
const VELOCITY_COLORS: readonly ColorIndex[] = [
  Color.Velocity1,
  Color.Velocity2,
  Color.Velocity3,
  Color.Velocity4,
  Color.Velocity5,
];
const VELOCITY_TAIL_COLORS: readonly ColorIndex[] = [
  Color.MissileGlow1,
  Color.MissileGlow1,
  Color.MissileGlow2,
  Color.MissileGlow2,
  Color.MissileGlow3,
  Color.MissileGlow3,
  Color.MissileGlow4,
  Color.MissileGlow5,
];
const HEAVY_TAIL_COLORS: readonly ColorIndex[] = [
  Color.HeavyGlow1,
  Color.HeavyGlow1,
  Color.HeavyGlow2,
  Color.HeavyGlow2,
  Color.HeavyGlow3,
  Color.HeavyGlow3,
  Color.HeavyGlow4,
  Color.HeavyGlow5,
];
const HEAVY_EXHAUST_SPARKS = 2;
const EXHAUST_CHANCE = 0.55;
const EXHAUST_COLORS: readonly ColorIndex[] = [
  Color.Flash2,
  Color.Flash3,
  Color.Flash4,
  Color.Flash5,
];
const EXHAUST_TICKS_PER_COLOR = 3;
const EXHAUST_MIN_TAIL_INDEX = 2;
const NO_CELL = -1;

type MissileState = "waiting" | "charging" | "flying" | "done";

export class Missile {
  private readonly grid: PaintGrid;
  private readonly flashes: FlashLayer;
  private readonly random: Random;
  private readonly path: readonly number[];
  private readonly flightTicks: number;
  private readonly easing: "linear" | "easeIn";
  private readonly velocityTint: boolean;
  private readonly heavy: boolean;
  private readonly chargeLevel: number;
  private delayTicks: number;
  private state: MissileState = "waiting";
  private ticksInState = 0;
  private flightTick = 0;
  private headIndex = 0;
  private readonly lit: LitCell[] = [];
  private readonly cross: LitCell[] = [];
  private crossCenter = NO_CELL;

  constructor(
    grid: PaintGrid,
    flashes: FlashLayer,
    random: Random,
    options: MissileOptions,
  ) {
    this.grid = grid;
    this.flashes = flashes;
    this.random = random;
    this.path = options.path;
    this.flightTicks = options.flightTicks;
    this.delayTicks = options.delayTicks;
    this.easing = options.easing;
    this.velocityTint = options.velocityTint;
    this.heavy = options.heavy ?? false;
    this.chargeLevel = options.charge ?? 0;
  }

  public get isDone(): boolean {
    return this.state === "done";
  }

  public get isHeavy(): boolean {
    return this.heavy;
  }

  public get charge(): number {
    return this.chargeLevel;
  }

  public get impactCell(): number {
    return this.path[this.path.length - 1];
  }

  public step(): void {
    if (this.state === "waiting") {
      if (this.delayTicks > 0) {
        this.delayTicks -= 1;
        return;
      }
      this.headIndex = 0;
      const initialMaxLit = 1 + this.maxTailLength(0);
      this.enterCell(this.path[0], initialMaxLit);
      this.state = "charging";
      this.ticksInState = 0;
    }

    if (this.state === "charging") {
      const blinkOn =
        Math.floor(this.ticksInState / CHARGE_HALF_PERIOD) % 2 === 0;
      this.refresh(this.chargeColor());
      if (this.heavy) {
        this.updateCross(blinkOn ? Color.HeavyGlow1 : Color.HeavyGlow2);
      }
      this.ticksInState += 1;
      const chargeLimit = this.heavy ? HEAVY_CHARGE_TICKS : CHARGE_TICKS;
      if (this.ticksInState >= chargeLimit) {
        this.state = "flying";
        this.ticksInState = 0;
        this.flightTick = 0;
      }
      return;
    }

    if (this.state === "flying") {
      this.flightTick += 1;
      const fraction = Math.min(this.flightTick / this.flightTicks, 1);
      const lastIndex = this.path.length - 1;

      let progress: number;
      let speedFraction: number;
      if (this.easing === "easeIn") {
        progress = lastIndex * fraction ** EASE_IN_POWER;
        speedFraction = fraction ** (EASE_IN_POWER - 1);
      } else {
        progress = lastIndex * fraction;
        speedFraction = 1;
      }

      const target =
        fraction === 1 ? lastIndex : Math.min(Math.floor(progress), lastIndex);
      const tailLength = this.maxTailLength(speedFraction);

      if (this.heavy && target > this.headIndex) {
        this.clearCross();
      }
      this.advanceHead(target, 1 + tailLength);
      this.refresh(this.flightHeadColor(speedFraction));
      if (this.heavy) {
        const flickerOn =
          Math.floor(this.ticksInState / FLICKER_HALF_PERIOD) % 2 === 0;
        this.updateCross(flickerOn ? Color.HeavyGlow1 : Color.HeavyGlow2);
      }
      this.ticksInState += 1;

      if (this.heavy) {
        for (let i = 0; i < HEAVY_EXHAUST_SPARKS; i += 1) {
          this.emitExhaust(1);
        }
      } else {
        const exhaustChance = this.velocityTint
          ? EXHAUST_CHANCE * speedFraction
          : EXHAUST_CHANCE;
        this.emitExhaust(exhaustChance);
      }

      if (this.headIndex === lastIndex) {
        this.land();
      }
    }
  }

  private chargeColor(): ColorIndex {
    const blinkOn =
      Math.floor(this.ticksInState / CHARGE_HALF_PERIOD) % 2 === 0;
    if (this.heavy) {
      return blinkOn ? Color.HeavyCharge : Color.HeavyGlow4;
    }
    if (this.velocityTint) {
      return blinkOn ? Color.Velocity1 : Color.MissileGlow4;
    }
    return blinkOn ? Color.MissileCore : Color.MissileGlow3;
  }

  private flightHeadColor(speedFraction: number): ColorIndex {
    if (this.heavy) {
      const flickerOn =
        Math.floor(this.ticksInState / FLICKER_HALF_PERIOD) % 2 === 0;
      return flickerOn ? Color.HeavyCore : Color.HeavyGlow1;
    }
    if (this.velocityTint) {
      const index = Math.min(
        VELOCITY_COLORS.length - 1,
        Math.floor(speedFraction * VELOCITY_COLORS.length),
      );
      return VELOCITY_COLORS[index];
    }
    const flickerOn =
      Math.floor(this.ticksInState / FLICKER_HALF_PERIOD) % 2 === 0;
    return flickerOn ? Color.MissileCore : Color.MissileGlow1;
  }

  private tailColors(): readonly ColorIndex[] {
    if (this.heavy) {
      return HEAVY_TAIL_COLORS;
    }
    if (this.velocityTint) {
      return VELOCITY_TAIL_COLORS;
    }
    return TAIL_COLORS;
  }

  private maxTailLength(speedFraction: number): number {
    if (this.heavy) {
      return HEAVY_TAIL_COLORS.length;
    }
    if (this.velocityTint) {
      return 1 + Math.round(speedFraction * (VELOCITY_TAIL_COLORS.length - 1));
    }
    return TAIL_COLORS.length;
  }

  private advanceHead(target: number, maxLit: number): void {
    while (this.headIndex < target) {
      this.headIndex += 1;
      this.enterCell(this.path[this.headIndex], maxLit);
    }
  }

  private updateCross(color: ColorIndex): void {
    const headCell = this.path[this.headIndex];
    if (this.crossCenter !== headCell) {
      this.clearCross();
      this.crossCenter = headCell;
      const col = headCell % this.grid.cols;
      const row = Math.floor(headCell / this.grid.cols);
      const neighbors = [
        [col, row - 1],
        [col, row + 1],
        [col - 1, row],
        [col + 1, row],
      ];
      for (let i = 0; i < neighbors.length; i += 1) {
        const nc = neighbors[i][0];
        const nr = neighbors[i][1];
        if (this.grid.inBounds(nc, nr)) {
          const cell = this.grid.index(nc, nr);
          if (!this.isInLit(cell)) {
            this.cross.push(createLitCell(this.grid, cell));
          }
        }
      }
    }

    for (let i = 0; i < this.cross.length; i += 1) {
      showLitCell(this.grid, this.cross[i], color);
    }
  }

  private isInLit(cell: number): boolean {
    for (let i = 0; i < this.lit.length; i += 1) {
      if (this.lit[i].cell === cell) {
        return true;
      }
    }
    return false;
  }

  private clearCross(): void {
    for (let i = 0; i < this.cross.length; i += 1) {
      restoreLitCell(this.grid, this.cross[i]);
    }
    this.cross.length = 0;
    this.crossCenter = NO_CELL;
  }

  private emitExhaust(chance: number): void {
    if (this.lit.length <= EXHAUST_MIN_TAIL_INDEX || this.random() >= chance) {
      return;
    }
    const tailIndex =
      EXHAUST_MIN_TAIL_INDEX +
      Math.floor(this.random() * (this.lit.length - EXHAUST_MIN_TAIL_INDEX));
    const source = this.lit[tailIndex].cell;
    const dc = Math.floor(this.random() * 3) - 1;
    const dr = Math.floor(this.random() * 3) - 1;
    const col = (source % this.grid.cols) + dc;
    const row = Math.floor(source / this.grid.cols) + dr;
    if (this.grid.inBounds(col, row)) {
      this.flashes.light(
        this.grid.index(col, row),
        EXHAUST_COLORS,
        EXHAUST_TICKS_PER_COLOR,
        0,
      );
    }
  }

  private land(): void {
    this.clearCross();
    for (let i = 0; i < this.lit.length; i += 1) {
      restoreLitCell(this.grid, this.lit[i]);
    }
    this.lit.length = 0;
    this.state = "done";
  }

  private enterCell(cell: number, maxLit: number): void {
    this.lit.unshift(createLitCell(this.grid, cell));
    if (this.lit.length > maxLit) {
      const dropped = this.lit.pop();
      if (dropped) {
        restoreLitCell(this.grid, dropped);
      }
    }
  }

  private refresh(headColor: ColorIndex): void {
    const tailColors = this.tailColors();
    for (let i = 0; i < this.lit.length; i += 1) {
      const desired = i === 0 ? headColor : tailColors[i - 1];
      showLitCell(this.grid, this.lit[i], desired);
    }
  }
}
