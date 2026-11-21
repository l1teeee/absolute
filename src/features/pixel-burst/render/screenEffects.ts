const LAUNCH_SHAKE_TICKS = 8;
const LAUNCH_SHAKE_CELLS = 1;
const IMPACT_SHAKE_BASE_TICKS = 18;
const IMPACT_SHAKE_EXTRA_TICKS = 18;
const IMPACT_SHAKE_BASE_CELLS = 1;
const IMPACT_SHAKE_EXTRA_CELLS = 2;
const FLASH_BASE = 0.35;
const FLASH_EXTRA = 0.45;
const FLASH_DECAY = 0.82;
const FLASH_CUTOFF = 0.01;

export class ScreenEffects {
  private shakeTicksLeft = 0;
  private shakeTotalTicks = 0;
  private shakeCells = 0;
  private flashLevel = 0;

  public constructor(
    private readonly stage: HTMLElement,
    private readonly flash: HTMLElement,
  ) {}

  public heavyLaunch(): void {
    if (this.shakeTicksLeft > 0 && this.shakeCells > LAUNCH_SHAKE_CELLS) return;
    this.startShake(LAUNCH_SHAKE_TICKS, LAUNCH_SHAKE_CELLS);
  }

  public heavyImpact(strength: number): void {
    this.startShake(
      Math.round(IMPACT_SHAKE_BASE_TICKS + IMPACT_SHAKE_EXTRA_TICKS * strength),
      IMPACT_SHAKE_BASE_CELLS + Math.round(IMPACT_SHAKE_EXTRA_CELLS * strength),
    );
    this.flashLevel = Math.max(this.flashLevel, FLASH_BASE + FLASH_EXTRA * strength);
  }

  public update(ticks: number, cssCell: number): void {
    if (this.shakeTicksLeft > 0) {
      const amplitude = Math.ceil(this.shakeCells * this.shakeTicksLeft / this.shakeTotalTicks);
      const dx = (Math.floor(Math.random() * (2 * amplitude + 1)) - amplitude) * cssCell;
      const dy = (Math.floor(Math.random() * (2 * amplitude + 1)) - amplitude) * cssCell;
      this.stage.style.transform = `translate(${dx}px, ${dy}px)`;
      this.shakeTicksLeft = Math.max(0, this.shakeTicksLeft - ticks);
      if (this.shakeTicksLeft === 0) this.stage.style.transform = "";
    }
    this.flash.style.opacity = String(this.flashLevel);
    this.flashLevel *= FLASH_DECAY;
    if (this.flashLevel < FLASH_CUTOFF) this.flashLevel = 0;
  }

  public reset(): void {
    this.shakeTicksLeft = 0;
    this.shakeTotalTicks = 0;
    this.shakeCells = 0;
    this.flashLevel = 0;
    this.stage.style.transform = "";
    this.flash.style.opacity = "0";
  }

  private startShake(ticks: number, cells: number): void {
    this.shakeTicksLeft = ticks;
    this.shakeTotalTicks = ticks;
    this.shakeCells = cells;
  }
}
