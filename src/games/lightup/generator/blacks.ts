import { RandomState } from '@studio/engine/random/random-state';
import { F_BLACK, Grid } from '../grid';
import {
  LightUpParams,
  SYMMETRY_MIRROR_2,
  SYMMETRY_MIRROR_4,
  SYMMETRY_NONE,
  SYMMETRY_ROTATE_2,
  SYMMETRY_ROTATE_4,
} from '../params';

/** Empties the grid: no lights, no numbers, and (unless kept) no black squares. */
export function cleanBoard(grid: Grid, leaveBlacks: boolean): void {
  for (let i = 0; i < grid.w * grid.h; i++) {
    grid.flags[i] = leaveBlacks ? grid.flags[i] & F_BLACK : 0;
    grid.lights[i] = 0;
  }
  grid.nlights = 0;
}

/**
 * Empties the grid and scatters black squares: `blackPercent` of one part
 * of it at random, copied to the other parts for the symmetry.
 */
export function setBlacks(
  grid: Grid,
  params: LightUpParams,
  blackPercent: number,
  random: RandomState,
): void {
  const { w, h } = grid;
  const wodd = w % 2;
  const hodd = h % 2;

  let degree: number;
  let rotate: boolean;
  switch (params.symmetry) {
    case SYMMETRY_NONE:
      [degree, rotate] = [1, false];
      break;
    case SYMMETRY_ROTATE_2:
      [degree, rotate] = [2, true];
      break;
    case SYMMETRY_MIRROR_2:
      [degree, rotate] = [2, false];
      break;
    case SYMMETRY_ROTATE_4:
      [degree, rotate] = [4, true];
      break;
    case SYMMETRY_MIRROR_4:
      [degree, rotate] = [4, false];
      break;
    default:
      throw new Error('Unknown symmetry type');
  }

  // The part of the grid to fill at random.
  let rw: number;
  let rh: number;
  if (degree === 4) {
    rw = Math.floor(w / 2);
    rh = Math.floor(h / 2);
    if (!rotate) rw += wodd;
    rh += hodd;
  } else if (degree === 2) {
    rw = w;
    rh = Math.floor(h / 2) + hodd;
  } else {
    rw = w;
    rh = h;
  }

  cleanBoard(grid, false);
  const blacks = Math.floor((rw * rh * blackPercent) / 100);
  for (let i = 0; i < blacks; i++) {
    let x: number;
    let y: number;
    do {
      x = random.upto(rw);
      y = random.upto(rh);
    } while (grid.flagsAt(x, y) & F_BLACK);
    grid.flags[y * w + x] |= F_BLACK;
  }

  if (params.symmetry === SYMMETRY_NONE) return;

  // Copy that part to the others.
  for (let x = 0; x < rw; x++) {
    for (let y = 0; y < rh; y++) {
      let xs: number[];
      let ys: number[];
      if (degree === 4) {
        xs = [x, w - 1 - (rotate ? y : x), rotate ? w - 1 - x : x, rotate ? y : w - 1 - x];
        ys = [y, rotate ? x : y, h - 1 - y, h - 1 - (rotate ? x : y)];
      } else {
        xs = [x, rotate ? w - 1 - x : x];
        ys = [y, h - 1 - y];
      }
      for (let i = 1; i < degree; i++)
        grid.flags[ys[i] * w + xs[i]] = grid.flags[ys[0] * w + xs[0]];
    }
  }

  // 4-way rotation misses the middle square of an odd grid.
  if (degree === 4 && rotate && wodd && random.upto(100) <= blackPercent) {
    grid.flags[(Math.floor(h / 2) + hodd - 1) * w + Math.floor(w / 2) + wodd - 1] |= F_BLACK;
  }
}
