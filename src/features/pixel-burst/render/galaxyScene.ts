import { createRandom, type Random } from "../engine/random";
import { Galaxy } from "./galaxyPalette";
import { addPlanets } from "./galaxyPlanets";

export interface Twinkler {
  cells: number[];
  normal: number[];
  bright: number[];
  period: number;
  phase: number;
  isBright: boolean;
}

export interface SceneBuffer {
  cols: number;
  rows: number;
  base: Uint8Array;
  display: Uint8Array;
  occluded: Uint8Array;
}

export const BAYER_4X4 = [
  [0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5],
];

export function buildGalaxyScene(
  cols: number, rows: number, seed: number,
): { display: Uint8Array; twinklers: Twinkler[] } {
  const buffer: SceneBuffer = {
    cols, rows, base: new Uint8Array(cols * rows),
    display: new Uint8Array(cols * rows), occluded: new Uint8Array(cols * rows),
  };
  const random = createRandom(seed);
  addNebulae(buffer, random, seed);
  buffer.display.set(buffer.base);
  const twinklers = addStars(buffer, random);
  addAsteroidBelt(buffer, random);
  addDistantGalaxies(buffer, random);
  addPlanets(buffer, random);
  return { display: buffer.display, twinklers: twinklers.filter(
    (twinkler) => !twinkler.cells.some((cell) => buffer.occluded[cell]),
  ) };
}

export function isTwinklerBright(twinkler: Twinkler, tick: number): boolean {
  return (tick + twinkler.phase) % twinkler.period
    < Math.max(4, Math.floor(twinkler.period * 0.1));
}

function cellNoise(col: number, row: number, seed: number): number {
  let h = (Math.imul(col, 374761393) + Math.imul(row, 668265263) + seed) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function addNebulae(buffer: SceneBuffer, random: Random, seed: number): void {
  const { cols, rows, base } = buffer;
  const count = 2 + Math.floor(random() * 2);
  for (let k = 0; k < count; k++) {
    const centerX = random() * cols;
    const centerY = random() * rows;
    const radius = Math.max(cols, rows) * (0.12 + 0.2 * random());
    const outer = k % 2 === 0 ? Galaxy.VioletOuter : Galaxy.TealOuter;
    const inner = k % 2 === 0 ? Galaxy.VioletInner : Galaxy.TealInner;
    for (let row = Math.max(0, Math.floor(centerY - radius));
      row <= Math.min(rows - 1, Math.ceil(centerY + radius)); row++) {
      for (let col = Math.max(0, Math.floor(centerX - radius));
        col <= Math.min(cols - 1, Math.ceil(centerX + radius)); col++) {
        const d = Math.hypot(col + 0.5 - centerX, row + 0.5 - centerY) / radius;
        if (d >= 1) continue;
        const density = (1 - d) ** 1.5 * (0.7 + 0.6 * cellNoise(col, row, seed));
        const t = (BAYER_4X4[row % 4][col % 4] + 0.5) / 16;
        const cell = row * cols + col;
        const canTakeOuter = base[cell] === Galaxy.Space || base[cell] === Galaxy.VioletOuter
          || base[cell] === Galaxy.TealOuter;
        if (density > 0.62 + 0.3 * t) base[cell] = inner;
        else if (density > 0.12 + 0.5 * t && canTakeOuter) base[cell] = outer;
      }
    }
  }
}

function addStars(buffer: SceneBuffer, random: Random): Twinkler[] {
  const { cols, rows, base, display } = buffer;
  const twinklers: Twinkler[] = [];
  const count = Math.round(cols * rows / 70);
  for (let i = 0; i < count; i++) {
    const col = Math.floor(random() * cols);
    const row = Math.floor(random() * rows);
    const roll = random();
    const cells = [row * cols + col];
    const colors: number[] = [];
    const sparkle = roll >= 0.99;
    if (roll < 0.78) colors.push(Galaxy.StarDim);
    else if (roll < 0.95) colors.push(Galaxy.StarMid);
    else if (roll < 0.99) {
      const pick = random();
      if (pick < 0.4) colors.push(Galaxy.StarBright);
      else if (pick < 0.7) colors.push(Galaxy.StarWarm);
      else colors.push(Galaxy.StarBlue);
    } else {
      colors.push(Galaxy.StarBright);
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const x = col + dx;
        const y = row + dy;
        if (x >= 0 && x < cols && y >= 0 && y < rows) {
          cells.push(y * cols + x);
          colors.push(Galaxy.StarDim);
        }
      }
    }
    let normal = colors;
    if (random() < 0.15) {
      const period = 80 + Math.floor(random() * 120);
      const phase = Math.floor(random() * period);
      if (sparkle) normal = cells.map((cell, index) => index === 0 ? Galaxy.StarMid : base[cell]);
      const bright = sparkle ? colors : [
        colors[0] === Galaxy.StarDim ? Galaxy.StarMid : Galaxy.StarBright,
      ];
      twinklers.push({ cells, normal, bright, period, phase, isBright: false });
    }
    for (let j = 0; j < cells.length; j++) display[cells[j]] = normal[j];
  }
  return twinklers;
}

function addAsteroidBelt(buffer: SceneBuffer, random: Random): void {
  const { cols, rows, display } = buffer;
  const angle = (random() * 2 - 1) * (25 * Math.PI / 180);
  const anchorX = random() * cols;
  const anchorY = random() * rows;
  const count = Math.round(cols / 5);
  for (let i = 0; i < count; i++) {
    const t = (random() * 2 - 1) * cols * 0.6;
    const offset = (random() + random() - 1) * 6;
    const col = Math.round(anchorX + Math.cos(angle) * t - Math.sin(angle) * offset);
    const row = Math.round(anchorY + Math.sin(angle) * t + Math.cos(angle) * offset);
    const color = random() < 0.5 ? Galaxy.AsteroidA : Galaxy.AsteroidB;
    const pair = random() < 0.15;
    if (col >= 0 && col < cols && row >= 0 && row < rows) {
      display[row * cols + col] = color;
      if (pair && col + 1 < cols) display[row * cols + col + 1] = color;
    }
  }
}

function addDistantGalaxies(buffer: SceneBuffer, random: Random): void {
  const { cols, rows, display } = buffer;
  const template = [[0, 1, 1, 0, 0], [1, 0, 2, 0, 1], [0, 0, 1, 1, 0]];
  for (let i = 0; i < 2; i++) {
    const col = Math.floor(random() * (cols - 5));
    const row = Math.floor(random() * (rows - 3));
    const mirror = random() < 0.5;
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 5; x++) {
        const value = template[y][mirror ? 4 - x : x];
        const px = col + x;
        const py = row + y;
        if (value && px >= 0 && px < cols && py >= 0 && py < rows) {
          display[py * cols + px] = value === 1 ? Galaxy.SmudgeDim : Galaxy.SmudgeCore;
        }
      }
    }
  }
}
