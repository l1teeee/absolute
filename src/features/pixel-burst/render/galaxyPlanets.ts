import type { Random } from "../engine/random";
import { Galaxy, PLANET_PALETTES, type PlanetPalette } from "./galaxyPalette";
import { BAYER_4X4, type SceneBuffer } from "./galaxyScene";

const LIGHT_X = -0.6;
const LIGHT_Y = -0.8;
const DITHER_STRENGTH = 0.2;
const BAND_DIVISIONS = 3.5;
const RING_RADIUS_X = 2.0;
const RING_RADIUS_Y = 0.6;
const RING_INNER = 0.78;

interface Planet {
  cx: number;
  cy: number;
  radius: number;
  extent: number;
}

export function addPlanets(buffer: SceneBuffer, random: Random): void {
  const specs = [
    { minFactor: 0.09, maxFactor: 0.13, bands: true, ring: false, moon: true },
    { minFactor: 0.05, maxFactor: 0.07, bands: false, ring: false, moon: false },
    { minFactor: 0.028, maxFactor: 0.038, bands: false, ring: true, moon: false },
  ];
  const minDim = Math.min(buffer.cols, buffer.rows);
  const paletteStart = Math.floor(random() * PLANET_PALETTES.length);
  const placed: Planet[] = [];
  for (let k = 0; k < specs.length; k++) {
    const spec = specs[k];
    const radius = minDim * (spec.minFactor + (spec.maxFactor - spec.minFactor) * random());
    const extent = spec.ring ? radius * 2 : radius;
    let planet: Planet | undefined;
    for (let attempt = 0; attempt < 40; attempt++) {
      const cx = buffer.cols * (0.08 + 0.84 * random());
      const cy = buffer.rows * (0.1 + 0.8 * random());
      if (Math.hypot(cx - buffer.cols / 2, cy - buffer.rows / 2) < extent + minDim * 0.22) {
        continue;
      }
      if (placed.some((other) =>
        Math.hypot(cx - other.cx, cy - other.cy) < extent + other.extent + minDim * 0.08)) {
        continue;
      }
      planet = { cx, cy, radius, extent };
      break;
    }
    if (!planet) continue;
    placed.push(planet);
    drawDisc(buffer, planet, PLANET_PALETTES[(paletteStart + k) % PLANET_PALETTES.length],
      spec.bands);
    if (spec.ring) drawRing(buffer, planet);
    if (spec.moon) drawMoon(buffer, planet, random);
  }
}

function writeCell(buffer: SceneBuffer, col: number, row: number, color: number): void {
  const cell = row * buffer.cols + col;
  buffer.display[cell] = color;
  buffer.occluded[cell] = 1;
}

function drawDisc(
  buffer: SceneBuffer, planet: Planet, palette: PlanetPalette, bands: boolean,
): void {
  const { cx, cy, radius } = planet;
  for (let row = Math.max(0, Math.floor(cy - radius));
    row <= Math.min(buffer.rows - 1, Math.ceil(cy + radius)); row++) {
    for (let col = Math.max(0, Math.floor(cx - radius));
      col <= Math.min(buffer.cols - 1, Math.ceil(cx + radius)); col++) {
      const dx = col + 0.5 - cx;
      const dy = row + 0.5 - cy;
      if (Math.hypot(dx, dy) > radius) continue;
      const shade = (dx * LIGHT_X + dy * LIGHT_Y) / radius;
      const v = shade + ((BAYER_4X4[row % 4][col % 4] + 0.5) / 16 - 0.5)
        * DITHER_STRENGTH;
      let color = palette.shadow;
      if (v > 0.3) color = palette.light;
      else if (v > -0.35) color = palette.base;
      if (bands && color === palette.base
        && Math.floor((dy / radius + 1) * BAND_DIVISIONS) % 2 === 1) color = palette.band;
      writeCell(buffer, col, row, color);
    }
  }
}

function drawRing(buffer: SceneBuffer, planet: Planet): void {
  const { cx, cy, radius } = planet;
  for (let row = Math.max(0, Math.floor(cy - RING_RADIUS_Y * radius));
    row <= Math.min(buffer.rows - 1, Math.ceil(cy + RING_RADIUS_Y * radius)); row++) {
    for (let col = Math.max(0, Math.floor(cx - RING_RADIUS_X * radius));
      col <= Math.min(buffer.cols - 1, Math.ceil(cx + RING_RADIUS_X * radius)); col++) {
      const dx = col + 0.5 - cx;
      const dy = row + 0.5 - cy;
      const e = Math.hypot(dx / (RING_RADIUS_X * radius), dy / (RING_RADIUS_Y * radius));
      if (e < RING_INNER || e > 1) continue;
      if (dy < 0 && Math.hypot(dx, dy) <= radius) continue;
      writeCell(buffer, col, row, Galaxy.Ring);
    }
  }
}

function drawMoon(buffer: SceneBuffer, planet: Planet, random: Random): void {
  const radius = Math.max(2, Math.round(planet.radius * 0.16));
  const angle = random() * 2 * Math.PI;
  const distance = planet.radius + radius + 3 + random() * 5;
  const cx = planet.cx + Math.cos(angle) * distance;
  const cy = planet.cy + Math.sin(angle) * distance;
  for (let row = Math.max(0, Math.floor(cy - radius));
    row <= Math.min(buffer.rows - 1, Math.ceil(cy + radius)); row++) {
    for (let col = Math.max(0, Math.floor(cx - radius));
      col <= Math.min(buffer.cols - 1, Math.ceil(cx + radius)); col++) {
      const dx = col + 0.5 - cx;
      const dy = row + 0.5 - cy;
      if (Math.hypot(dx, dy) > radius) continue;
      const shade = (dx * LIGHT_X + dy * LIGHT_Y) / radius;
      writeCell(buffer, col, row, shade > -0.1 ? Galaxy.MoonLight : Galaxy.MoonShadow);
    }
  }
}
