export const TAP_MAX_TICKS = 12;
export const FULL_CHARGE_TICKS = 120;

export type ChargeRelease =
  | { kind: "tap"; col: number; row: number }
  | { kind: "charged"; col: number; row: number; charge: number };

export class ChargeTracker {
  private active = false;
  private heldTicks = 0;
  private col = 0;
  private row = 0;

  public start(col: number, row: number): void {
    this.active = true;
    this.heldTicks = 0;
    this.col = col;
    this.row = row;
  }

  public move(col: number, row: number): void {
    if (!this.active) return;
    this.col = col;
    this.row = row;
  }

  public advance(ticks: number): void {
    if (this.active) this.heldTicks += ticks;
  }

  public cancel(): void {
    this.active = false;
  }

  public get isActive(): boolean {
    return this.active;
  }

  public get isCharging(): boolean {
    return this.active && this.heldTicks > TAP_MAX_TICKS;
  }

  public get level(): number {
    return this.active ? Math.min(1, this.heldTicks / FULL_CHARGE_TICKS) : 0;
  }

  public get target(): { col: number; row: number } {
    return { col: this.col, row: this.row };
  }

  public release(): ChargeRelease | null {
    if (!this.active) return null;
    this.active = false;
    if (this.heldTicks <= TAP_MAX_TICKS) {
      return { kind: "tap", col: this.col, row: this.row };
    }
    return {
      kind: "charged",
      col: this.col,
      row: this.row,
      charge: Math.min(1, this.heldTicks / FULL_CHARGE_TICKS),
    };
  }
}
