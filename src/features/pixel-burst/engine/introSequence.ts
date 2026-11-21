import type { FlashLayer } from "./flashLayer";
import { Missile } from "./missile";
import { Color, isTransientColor, type ColorIndex } from "./palette";
import type { PaintGrid } from "./paintGrid";
import { arcPath } from "./paths";
import type { Random } from "./random";

const INTRO_FLIGHT_TICKS = 240;
const BAR_HOLD_TICKS = 8;
const DARK_HOLD_TICKS = 10;
const SPARK_HOLD_TICKS = 6;

export class IntroSequence {
  private readonly grid: PaintGrid;
  private readonly flashes: FlashLayer;
  private readonly random: Random;
  private t = 0;
  private arrivalTick: number | null = null;
  private cx = 0;
  private cy = 0;
  private leftEnd = 0;
  private left!: Missile;
  private right!: Missile;
  private leftBarCell = 0;
  private rightBarCell = 0;
  private leftBarUnder: ColorIndex = Color.Background;
  private rightBarUnder: ColorIndex = Color.Background;

  constructor(grid: PaintGrid, flashes: FlashLayer, random: Random) {
    this.grid = grid;
    this.flashes = flashes;
    this.random = random;
    this.reset();
  }

  public reset(): void {
    this.t = 0;
    this.arrivalTick = null;
    this.cx = Math.floor(this.grid.cols / 2);
    this.cy = Math.floor(this.grid.rows / 2);
    this.leftEnd = Math.max(0, this.cx - 1);

    const leftPath = arcPath(
      this.grid,
      { col: 0, row: this.cy },
      { col: this.leftEnd, row: this.cy },
      0,
    );
    this.left = new Missile(this.grid, this.flashes, this.random, {
      path: leftPath,
      flightTicks: INTRO_FLIGHT_TICKS,
      delayTicks: 0,
      easing: "easeIn",
      velocityTint: true,
    });

    const rightPath = arcPath(
      this.grid,
      { col: this.grid.cols - 1, row: this.cy },
      { col: this.cx, row: this.cy },
      0,
    );
    this.right = new Missile(this.grid, this.flashes, this.random, {
      path: rightPath,
      flightTicks: INTRO_FLIGHT_TICKS,
      delayTicks: 0,
      easing: "easeIn",
      velocityTint: true,
    });
  }

  public step(): { col: number; row: number } | null {
    const t = this.t;
    this.t += 1;

    if (this.arrivalTick === null) {
      this.left.step();
      this.right.step();

      if (this.left.isDone && this.right.isDone) {
        this.arrivalTick = t;
        this.leftBarCell = this.grid.index(this.leftEnd, this.cy);
        this.rightBarCell = this.grid.index(this.cx, this.cy);
        this.leftBarUnder = this.grid.get(this.leftBarCell);
        this.grid.paint(this.leftBarCell, Color.Velocity5);
        this.rightBarUnder = this.grid.get(this.rightBarCell);
        this.grid.paint(this.rightBarCell, Color.Velocity5);
      }

      return null;
    }

    const k = t - this.arrivalTick;
    if (k === BAR_HOLD_TICKS) {
      this.grid.paint(
        this.leftBarCell,
        isTransientColor(this.leftBarUnder)
          ? Color.Background
          : this.leftBarUnder,
      );
      this.grid.paint(
        this.rightBarCell,
        isTransientColor(this.rightBarUnder)
          ? Color.Background
          : this.rightBarUnder,
      );
      this.grid.paint(this.grid.index(this.cx, this.cy), Color.Trail);
      return null;
    }

    if (k === BAR_HOLD_TICKS + DARK_HOLD_TICKS) {
      this.grid.paint(this.grid.index(this.cx, this.cy), Color.Spark);
      return null;
    }

    if (k === BAR_HOLD_TICKS + DARK_HOLD_TICKS + SPARK_HOLD_TICKS) {
      this.grid.paint(this.grid.index(this.cx, this.cy), Color.Head1);
      return { col: this.cx, row: this.cy };
    }

    return null;
  }
}
