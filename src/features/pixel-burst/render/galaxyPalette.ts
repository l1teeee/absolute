export const Galaxy = {
  Space: 0, VioletOuter: 1, VioletInner: 2, TealOuter: 3, TealInner: 4,
  StarDim: 5, StarMid: 6, StarBright: 7, StarWarm: 8, StarBlue: 9,
  AsteroidA: 10, AsteroidB: 11, SmudgeDim: 12, SmudgeCore: 13, Ring: 14,
  MoonLight: 15, MoonShadow: 16, RoseLight: 17, RoseBase: 18, RoseBand: 19,
  RoseShadow: 20, TealLight: 21, TealBase: 22, TealBand: 23, TealShadow: 24,
  SandLight: 25, SandBase: 26, SandBand: 27, SandShadow: 28,
  LavenderLight: 29, LavenderBase: 30, LavenderBand: 31, LavenderShadow: 32,
} as const;

export const GALAXY_HEX: readonly string[] = [
  "#05040d", "#0b0819", "#120d26", "#07111b", "#0b1a27", "#262a40", "#4f5672",
  "#a9aec4", "#9c8f76", "#6f86a0", "#2e2a36", "#3d3846", "#231f3a", "#3a3456",
  "#6b6456", "#5f6372", "#33363f", "#7a5260", "#5e3d4a", "#4f3340", "#33212b",
  "#4a6e6e", "#365253", "#2d4546", "#1e2f30", "#8c7a58", "#6c5d43", "#5c4f39",
  "#3c3326", "#625e8c", "#4a476c", "#3f3c5c", "#2a283f",
];

export type GalaxyColor = (typeof Galaxy)[keyof typeof Galaxy];

export interface PlanetPalette {
  light: GalaxyColor;
  base: GalaxyColor;
  band: GalaxyColor;
  shadow: GalaxyColor;
}

export const PLANET_PALETTES: readonly PlanetPalette[] = [
  { light: Galaxy.RoseLight, base: Galaxy.RoseBase, band: Galaxy.RoseBand,
    shadow: Galaxy.RoseShadow },
  { light: Galaxy.TealLight, base: Galaxy.TealBase, band: Galaxy.TealBand,
    shadow: Galaxy.TealShadow },
  { light: Galaxy.SandLight, base: Galaxy.SandBase, band: Galaxy.SandBand,
    shadow: Galaxy.SandShadow },
  { light: Galaxy.LavenderLight, base: Galaxy.LavenderBase, band: Galaxy.LavenderBand,
    shadow: Galaxy.LavenderShadow },
];
