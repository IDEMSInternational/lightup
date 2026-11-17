import { RandomState } from '@studio/engine/random/random-state';
import { shuffle } from '@studio/engine/random/shuffle';
import {
  F_BLACK,
  F_LIGHT,
  F_MARK,
  F_NUMBERED,
  Grid,
  forEachLit,
  gridOverlap,
  listLights,
  setLight,
  surrounds,
} from '../grid';

/** True if taking the light off (x, y) would leave a square dark. */
function wouldGoDark(grid: Grid, x: number, y: number): boolean {
  let dark = false;
  forEachLit(listLights(grid, x, y, true), (lx, ly) => (dark = grid.lightsAt(lx, ly) === 1));
  return dark;
}

/**
 * Places lights that solve the grid (every white square lit, no light
 * shining on another): a light on every white square, then, in a random
 * order, a square's light is kept and the lights it shines on removed,
 * whenever that leaves nothing dark.
 */
export function placeLights(grid: Grid, random: RandomState): void {
  const { w, h } = grid;
  const order = Array.from({ length: w * h }, (_, i) => i);
  shuffle(order, random);

  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      grid.flags[y * w + x] &= ~F_MARK;
      if (grid.flagsAt(x, y) & F_BLACK) continue;
      setLight(grid, x, y, true);
    }
  }

  for (const i of order) {
    const x = i % w;
    const y = Math.floor(i / w);
    if (!(grid.flags[i] & F_LIGHT)) continue;
    if (grid.flags[i] & F_MARK) continue;
    const lines = listLights(grid, x, y, false);

    // Does this light shine on any other?
    let n = 0;
    forEachLit(lines, (lx, ly) => {
      if (grid.flagsAt(lx, ly) & F_LIGHT) n++;
    });
    if (n === 0) continue;

    // Would removing them leave a square dark? If not, remove them all.
    n = 0;
    forEachLit(lines, (lx, ly) => {
      if (grid.flagsAt(lx, ly) & F_LIGHT && wouldGoDark(grid, lx, ly)) n++;
    });
    if (n === 0) {
      forEachLit(lines, (lx, ly) => setLight(grid, lx, ly, false));
      grid.flags[i] |= F_MARK;
    }

    if (!gridOverlap(grid)) return;
  }
  if (gridOverlap(grid)) throw new Error('placeLights failed to resolve overlapping lights');
}

/** Numbers every black square with how many lights are next to it. */
export function placeNumbers(grid: Grid): void {
  for (let x = 0; x < grid.w; x++) {
    for (let y = 0; y < grid.h; y++) {
      if (!(grid.flagsAt(x, y) & F_BLACK)) continue;
      const n = surrounds(grid, x, y).filter((p) => grid.flagsAt(p.x, p.y) & F_LIGHT).length;
      grid.flags[y * grid.w + x] |= F_NUMBERED;
      grid.lights[y * grid.w + x] = n;
    }
  }
}
