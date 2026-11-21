export type EngineEvent =
  | { type: "heavyLaunch" }
  | { type: "heavyImpact"; strength: number };

export class EngineEventQueue {
  private events: EngineEvent[] = [];

  public push(event: EngineEvent): void {
    this.events.push(event);
  }

  public drain(): EngineEvent[] {
    const drained = this.events;
    this.events = [];
    return drained;
  }

  public clear(): void {
    this.events.length = 0;
  }
}
