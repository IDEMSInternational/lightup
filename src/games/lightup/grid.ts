/**
 * The working grid used by the generator and the solver: a port of the
 * original's game_state, with the same flags and the same helpers, so the
 * port makes the same decisions in the same order (and therefore the same
 * puzzles from the same seeds).
 *
 * Loops run column by column (x outside, y inside), as in the original:
 * the order matters, because it decides which deductions happen first.
 */

export const F_BLACK = 1;
/** A black square with a number. */
export const F_NUMBERED = 2;
/** The solver used this number (the generator removes numbers it didn't use). */
export const F_NUMBERUSED = 4;
/** A white square that can't hold a light. */
export const F_IMPOSSIBLE = 8;
export const F_LIGHT = 16;
/** Scratch mark used while placing lights. */
export const F_MARK = 32;

export class Grid {
  readonly w: number;
  readonly h: number;
  /** Number of lights placed. */
  nlights = 0;
  /**
   * For a numbered black square, its number. For a white square, how many
   * lights shine on it (a light shines on its own square too).
   */
  readonly lights: Int32Array;
  readonly flags: Int32Array;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.lights = new Int32Array(w * h);
    this.flags = new Int32Array(w * h);
  }

  copy(): Grid {
    const copy = new Grid(this.w, this.h);
    copy.nlights = this.nlights;
    copy.lights.set(this.lights);
    copy.flags.set(this.flags);
    return copy;
  }

  flagsAt(x: number, y: number): number {
    return this.flags[y * this.w + x];
  }

  lightsAt(x: number, y: number): number {
    return this.lights[y * this.w + x];
  }
}

/**
 * The squares a light at (ox, oy) shines on: its row from minx to maxx and
 * its column from miny to maxy, stopped by black squares and the edges.
 */
export interface LitLines {
  ox: number;
  oy: number;
  minx: number;
  maxx: number;
  miny: number;
  maxy: number;
  includeOrigin: boolean;
}

/**
 * The squares a light at (ox, oy) would shine on (equally: the squares
 * from which a light would shine on (ox, oy)), with (ox, oy) itself if
 * `origin` is true.
 */
export function listLights(grid: Grid, ox: number, oy: number, origin: boolean): LitLines {
  const lines: LitLines = { ox, oy, minx: ox, maxx: ox, miny: oy, maxy: oy, includeOrigin: origin };
  const { w, h, flags } = grid;
  for (let x = ox - 1; x >= 0 && !(flags[oy * w + x] & F_BLACK); x--) lines.minx = x;
  for (let x = ox + 1; x < w && !(flags[oy * w + x] & F_BLACK); x++) lines.maxx = x;
  for (let y = oy - 1; y >= 0 && !(flags[y * w + ox] & F_BLACK); y--) lines.miny = y;
  for (let y = oy + 1; y < h && !(flags[y * w + ox] & F_BLACK); y++) lines.maxy = y;
  return lines;
}

/**
 * Visits each square of `lines`, the row first (left to right), then the
 * column (top to bottom, where the origin is visited if included), as the
 * original's FOREACHLIT does. Stops early if `visit` returns true.
 */
export function forEachLit(lines: LitLines, visit: (x: number, y: number) => boolean | void): void {
  for (let x = lines.minx; x <= lines.maxx; x++) {
    if (x === lines.ox) continue;
    if (visit(x, lines.oy)) return;
  }
  for (let y = lines.miny; y <= lines.maxy; y++) {
    if (!lines.includeOrigin && y === lines.oy) continue;
    if (visit(lines.ox, y)) return;
  }
}

/** The squares next to (x, y), in the original's order: left, right, up, down. */
export function surrounds(grid: Grid, x: number, y: number): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  if (x > 0) points.push({ x: x - 1, y });
  if (x < grid.w - 1) points.push({ x: x + 1, y });
  if (y > 0) points.push({ x, y: y - 1 });
  if (y < grid.h - 1) points.push({ x, y: y + 1 });
  return points;
}

/** Puts a light on (x, y) or takes it off, updating how lit each square is. */
export function setLight(grid: Grid, x: number, y: number, on: boolean): void {
  const i = y * grid.w + x;
  let diff = 0;
  if (!on && grid.flags[i] & F_LIGHT) {
    diff = -1;
    grid.flags[i] &= ~F_LIGHT;
    grid.nlights--;
  } else if (on && !(grid.flags[i] & F_LIGHT)) {
    diff = 1;
    grid.flags[i] |= F_LIGHT;
    grid.nlights++;
  }
  if (diff !== 0) {
    forEachLit(listLights(grid, x, y, true), (lx, ly) => {
      grid.lights[ly * grid.w + lx] += diff;
    });
  }
}

/** True if every white square is lit. */
export function gridLit(grid: Grid): boolean {
  for (let i = 0; i < grid.w * grid.h; i++) {
    if (!(grid.flags[i] & F_BLACK) && grid.lights[i] === 0) return false;
  }
  return true;
}

/** True if any light shines on another. */
export function gridOverlap(grid: Grid): boolean {
  for (let i = 0; i < grid.w * grid.h; i++) {
    if (grid.flags[i] & F_LIGHT && grid.lights[i] > 1) return true;
  }
  return false;
}

/** True if the numbered square (x, y) has exactly its number of lights next to it. */
function numberCorrect(grid: Grid, x: number, y: number): boolean {
  const lights = surrounds(grid, x, y).filter((p) => grid.flagsAt(p.x, p.y) & F_LIGHT).length;
  return lights === grid.lightsAt(x, y);
}

/** True if every number has its number of lights next to it. */
export function gridAddsUp(grid: Grid): boolean {
  for (let x = 0; x < grid.w; x++) {
    for (let y = 0; y < grid.h; y++) {
      if (grid.flagsAt(x, y) & F_NUMBERED && !numberCorrect(grid, x, y)) return false;
    }
  }
  return true;
}

/** True if the lights solve the puzzle. */
export function gridCorrect(grid: Grid): boolean {
  return gridLit(grid) && !gridOverlap(grid) && gridAddsUp(grid);
}
