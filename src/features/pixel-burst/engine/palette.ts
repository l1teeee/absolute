export const Color = {
  Background: 0,
  Trail: 1,
  TrailSoft: 2,
  Head1: 3,
  Head2: 4,
  Head3: 5,
  Head4: 6,
  Head5: 7,
  Head6: 8,
  MissileCore: 9,
  MissileGlow1: 10,
  MissileGlow2: 11,
  MissileGlow3: 12,
  MissileGlow4: 13,
  MissileGlow5: 14,
  Spark: 15,
  Flash1: 16,
  Flash2: 17,
  Flash3: 18,
  Flash4: 19,
  Flash5: 20,
  Shock1: 21,
  Shock2: 22,
  Shock3: 23,
  Shock4: 24,
  Debris: 25,
  DebrisSoft: 26,
  Ember1: 27,
  Ember2: 28,
  Ember3: 29,
  Ember4: 30,
  Velocity1: 31,
  Velocity2: 32,
  Velocity3: 33,
  Velocity4: 34,
  Velocity5: 35,
  HeavyCore: 36,
  HeavyGlow1: 37,
  HeavyGlow2: 38,
  HeavyGlow3: 39,
  HeavyGlow4: 40,
  HeavyGlow5: 41,
  HeavyCharge: 42,
} as const;

export type ColorIndex = (typeof Color)[keyof typeof Color];

export const PALETTE_HEX: readonly string[] = [
  "#05040d",
  "#8fa8ff",
  "#4a4fb0",
  "#ffffff",
  "#fff3a8",
  "#ffd04a",
  "#ff8a2a",
  "#ff3f5e",
  "#c22f9e",
  "#ffffff",
  "#7cf7ff",
  "#2fc4ff",
  "#2a6bff",
  "#2b2f9e",
  "#1a1450",
  "#ff2d95",
  "#ffffff",
  "#fff3a8",
  "#ffb13b",
  "#ff5a3c",
  "#a8235a",
  "#c8fbff",
  "#5fd0ff",
  "#2c5fd0",
  "#1b2470",
  "#ffb36b",
  "#a8483a",
  "#fff3a8",
  "#ff9a3c",
  "#e0453a",
  "#7a1f3d",
  "#3b2bd6",
  "#2f6bff",
  "#2fd0ff",
  "#b9fff2",
  "#fff4c2",
  "#fff1e0",
  "#ffb347",
  "#ff6a3d",
  "#e0306a",
  "#8a1f6b",
  "#3d1240",
  "#ff3b3b",
];

export function headColorForAge(ageTicks: number): ColorIndex {
  if (ageTicks < 12) return Color.Head1;
  if (ageTicks < 24) return Color.Head2;
  if (ageTicks < 36) return Color.Head3;
  if (ageTicks < 50) return Color.Head4;
  if (ageTicks < 66) return Color.Head5;
  return Color.Head6;
}

export function emberColorForAge(ageTicks: number): ColorIndex {
  if (ageTicks < 8) return Color.Ember1;
  if (ageTicks < 16) return Color.Ember2;
  if (ageTicks < 26) return Color.Ember3;
  return Color.Ember4;
}

export function isInkOrBackground(color: ColorIndex): boolean {
  return (
    color === Color.Background ||
    color === Color.Trail ||
    color === Color.TrailSoft ||
    color === Color.Debris ||
    color === Color.DebrisSoft
  );
}

export function isTransientColor(color: ColorIndex): boolean {
  return (
    color === Color.MissileCore ||
    color === Color.MissileGlow1 ||
    color === Color.MissileGlow2 ||
    color === Color.MissileGlow3 ||
    color === Color.MissileGlow4 ||
    color === Color.MissileGlow5 ||
    color === Color.Flash1 ||
    color === Color.Flash2 ||
    color === Color.Flash3 ||
    color === Color.Flash4 ||
    color === Color.Flash5 ||
    color === Color.Shock1 ||
    color === Color.Shock2 ||
    color === Color.Shock3 ||
    color === Color.Shock4 ||
    color === Color.Velocity1 ||
    color === Color.Velocity2 ||
    color === Color.Velocity3 ||
    color === Color.Velocity4 ||
    color === Color.Velocity5 ||
    color === Color.HeavyCore ||
    color === Color.HeavyGlow1 ||
    color === Color.HeavyGlow2 ||
    color === Color.HeavyGlow3 ||
    color === Color.HeavyGlow4 ||
    color === Color.HeavyGlow5 ||
    color === Color.HeavyCharge
  );
}
