import { Color, type ColorIndex } from "./palette";

const INITIAL_EVENT_CAPACITY = 65536;
const INITIAL_TICK_CAPACITY = 1024;

export class PaintGrid {
  public readonly cols: number;
  public readonly rows: number;
  public readonly cells: Uint8Array;

  private eventCells: Int32Array;
  private eventPrev: Uint8Array;
  private tickEnds: Int32Array;
  private eventCount = 0;
  private tickCount = 0;

  private readonly dirty: Int32Array;
  private readonly dirtyFlags: Uint8Array;
  private dirtyCount = 0;

  constructor(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    const total = cols * rows;
    this.cells = new Uint8Array(total);
    this.cells.fill(Color.Background);

    this.eventCells = new Int32Array(INITIAL_EVENT_CAPACITY);
    this.eventPrev = new Uint8Array(INITIAL_EVENT_CAPACITY);
    this.tickEnds = new Int32Array(INITIAL_TICK_CAPACITY);

    this.dirty = new Int32Array(total);
    this.dirtyFlags = new Uint8Array(total);
  }

  public index(col: number, row: number): number {
    return row * this.cols + col;
  }

  public inBounds(col: number, row: number): boolean {
    return col >= 0 && col < this.cols && row >= 0 && row < this.rows;
  }

  public get(index: number): ColorIndex {
    return this.cells[index] as ColorIndex;
  }

  public get recordedTicks(): number {
    return this.tickCount;
  }

  public paint(index: number, color: ColorIndex): void {
    const prev = this.cells[index];
    if (prev === color) return;

    if (this.eventCount === this.eventCells.length) {
      const nextCapacity = this.eventCells.length * 2;
      const nextCells = new Int32Array(nextCapacity);
      nextCells.set(this.eventCells);
      this.eventCells = nextCells;

      const nextPrev = new Uint8Array(nextCapacity);
      nextPrev.set(this.eventPrev);
      this.eventPrev = nextPrev;
    }

    this.eventCells[this.eventCount] = index;
    this.eventPrev[this.eventCount] = prev;
    this.eventCount += 1;

    this.cells[index] = color;
    this.markDirty(index);
  }

  public endTick(): void {
    if (this.tickCount === this.tickEnds.length) {
      const nextEnds = new Int32Array(this.tickEnds.length * 2);
      nextEnds.set(this.tickEnds);
      this.tickEnds = nextEnds;
    }
    this.tickEnds[this.tickCount] = this.eventCount;
    this.tickCount += 1;
  }

  public undoTick(): boolean {
    if (this.tickCount === 0) return false;

    this.tickCount -= 1;
    const start = this.tickCount > 0 ? this.tickEnds[this.tickCount - 1] : 0;

    // Undo last-to-first so a cell painted multiple times within the same tick
    // returns to its pre-tick color.
    for (let i = this.eventCount - 1; i >= start; i -= 1) {
      const index = this.eventCells[i];
      this.cells[index] = this.eventPrev[i];
      this.markDirty(index);
    }

    this.eventCount = start;
    return true;
  }

  public drainDirty(visit: (index: number, color: ColorIndex) => void): void {
    for (let i = 0; i < this.dirtyCount; i += 1) {
      const index = this.dirty[i];
      this.dirtyFlags[index] = 0;
      visit(index, this.cells[index] as ColorIndex);
    }
    this.dirtyCount = 0;
  }

  private markDirty(index: number): void {
    if (this.dirtyFlags[index] === 0) {
      this.dirtyFlags[index] = 1;
      this.dirty[this.dirtyCount] = index;
      this.dirtyCount += 1;
    }
  }
}
