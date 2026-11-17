import {
  F_BLACK,
  F_IMPOSSIBLE,
  F_LIGHT,
  F_NUMBERED,
  F_NUMBERUSED,
  Grid,
  forEachLit,
  gridCorrect,
  gridOverlap,
  listLights,
  setLight,
  surrounds,
} from '../grid';
import { combinations } from './combinations';

/**
 * The original's solver, ported exactly: the generator relies on it to
 * decide which numbers a puzzle needs and how hard it is, so it must make
 * the same deductions in the same order.
 *
 * Easy: a square that only one place can light gets that light; a number
 * with all its lights placed rules out its other neighbours; a number with
 * exactly as many free neighbours as lights still needed fills them all.
 * Medium adds set reduction (below). Hard adds trial and error, up to 5
 * guesses deep.
 */

/** The puzzle must have exactly one solution (otherwise any solution will do). */
export const SOLVE_FORCE_UNIQUE = 1;
/** Use set reduction (Medium and Hard). */
export const SOLVE_DISCOUNT_SETS = 2;
/** Allow trial and error (Hard). */
export const SOLVE_ALLOW_RECURSE = 4;

const MAX_RECURSE = 5;

export function flagsFromDifficulty(difficulty: number): number {
  let flags = SOLVE_FORCE_UNIQUE;
  if (difficulty >= 1) flags |= SOLVE_DISCOUNT_SETS;
  if (difficulty >= 2) flags |= SOLVE_ALLOW_RECURSE;
  return flags;
}

/** A square in a set being reduced, with a counter. */
interface ScratchEntry {
  x: number;
  y: number;
  n: number;
}

function couldPlaceLight(flags: number, lights: number): boolean {
  if (flags & (F_BLACK | F_IMPOSSIBLE)) return false;
  return !(lights > 0);
}

function couldPlaceLightAt(grid: Grid, x: number, y: number): boolean {
  return couldPlaceLight(grid.flagsAt(x, y), grid.lightsAt(x, y));
}

/** An unlit white square that only one square can light: put a light there. */
function trySolveLight(grid: Grid, ox: number, oy: number, flags: number, lights: number): boolean {
  if (lights > 0) return false;
  if (flags & F_BLACK) return false;

  let sx = 0;
  let sy = 0;
  let n = 0;
  forEachLit(listLights(grid, ox, oy, true), (lx, ly) => {
    if (grid.flagsAt(lx, ly) & F_IMPOSSIBLE) return;
    if (grid.lightsAt(lx, ly) > 0) return;
    sx = lx;
    sy = ly;
    n++;
  });
  if (n === 1) {
    setLight(grid, sx, sy, true);
    return true;
  }
  return false;
}

/** A number whose lights are all placed, or whose free neighbours must all be lights. */
function trySolveNumber(
  grid: Grid,
  nx: number,
  ny: number,
  nflags: number,
  nlights: number,
): boolean {
  if (!(nflags & F_NUMBERED)) return false;
  let nl = nlights;
  const points = surrounds(grid, nx, ny);
  let ns = points.length;
  const ignored = points.map((p) => {
    const flags = grid.flagsAt(p.x, p.y);
    if (flags & F_LIGHT) {
      nl--;
      ns--;
      return true;
    }
    if (!couldPlaceLight(flags, grid.lightsAt(p.x, p.y))) {
      ns--;
      return true;
    }
    return false;
  });
  if (ns === 0) return false;

  let changed = false;
  if (nl === 0) {
    grid.flags[ny * grid.w + nx] |= F_NUMBERUSED;
    points.forEach((p, i) => {
      if (!ignored[i]) {
        grid.flags[p.y * grid.w + p.x] |= F_IMPOSSIBLE;
        changed = true;
      }
    });
  } else if (nl === ns) {
    grid.flags[ny * grid.w + nx] |= F_NUMBERUSED;
    points.forEach((p, i) => {
      if (!ignored[i]) {
        setLight(grid, p.x, p.y, true);
        changed = true;
      }
    });
  }
  return changed;
}

/*
 * Set reduction ("discounting"), as in the original:
 *
 * A set of squares of which at least one must hold a light (the squares
 * that could light an unlit square, or enough of a number's free
 * neighbours) is a MAKESLIGHT set. A light at a square rules out other
 * squares: those it lights, and, if it would be the last light a
 * neighbouring number needs, that number's other free neighbours. If a
 * light at some square would rule out every square of a MAKESLIGHT set,
 * there can't be a light there.
 *
 * To find such squares cheaply, take the square of the set with the
 * fewest squares that rule it out, and check only those.
 */

/**
 * Calls `visit` with every square that would rule out a light at (x, y):
 * the squares that would light it, then the other free neighbours of any
 * neighbouring number that a light at (x, y) would complete.
 */
function tryRuleOut(
  grid: Grid,
  x: number,
  y: number,
  visit: (dx: number, dy: number) => void,
): void {
  forEachLit(listLights(grid, x, y, false), (lx, ly) => {
    if (couldPlaceLightAt(grid, lx, ly)) visit(lx, ly);
  });

  for (const clue of surrounds(grid, x, y)) {
    if (!(grid.flagsAt(clue.x, clue.y) & F_NUMBERED)) continue;
    const around = surrounds(grid, clue.x, clue.y);
    const current = around.filter((p) => grid.flagsAt(p.x, p.y) & F_LIGHT).length;
    if (current + 1 === grid.lightsAt(clue.x, clue.y)) {
      for (const p of around) {
        if (p.x === x && p.y === y) continue;
        if (couldPlaceLightAt(grid, p.x, p.y)) visit(p.x, p.y);
      }
    }
  }
}

/** Rules out every square that would rule out the whole set `scratch`. */
function discountSet(grid: Grid, scratch: ScratchEntry[]): boolean {
  const n = scratch.length;
  if (n === 0) return false;

  for (const entry of scratch) {
    tryRuleOut(grid, entry.x, entry.y, () => {
      entry.n++;
    });
  }

  let best = -1;
  let bestN = grid.w + grid.h; // the original's scratch size
  for (let i = 0; i < n; i++) {
    if (scratch[i].n < bestN) {
      bestN = scratch[i].n;
      best = i;
    }
  }
  if (best < 0) return false; // can't happen: no square is ruled out by that many

  let changed = false;
  tryRuleOut(grid, scratch[best].x, scratch[best].y, (dx, dy) => {
    if (grid.flagsAt(dx, dy) & F_IMPOSSIBLE) return;

    // Does a light at (dx, dy) rule out everything in the set? (The squares
    // that would rule out (dx, dy) are the squares it would rule out.)
    for (const entry of scratch) entry.n = 0;
    tryRuleOut(grid, dx, dy, (sx, sy) => {
      const found = scratch.find((entry) => entry.x === sx && entry.y === sy);
      if (found) found.n = 1;
    });
    if (scratch.some((entry) => entry.n === 0)) return;

    grid.flags[dy * grid.w + dx] |= F_IMPOSSIBLE;
    changed = true;
  });
  return changed;
}

/** Set reduction on the squares that could light the unlit square (x, y). */
function discountUnlit(grid: Grid, x: number, y: number): boolean {
  const scratch: ScratchEntry[] = [];
  forEachLit(listLights(grid, x, y, true), (lx, ly) => {
    if (couldPlaceLightAt(grid, lx, ly)) scratch.push({ x: lx, y: ly, n: 0 });
  });
  return discountSet(grid, scratch);
}

/**
 * Set reduction on a number's free neighbours: if it has N free neighbours
 * and still needs M lights, every N-M+1 of them hold at least one light.
 */
function discountClue(grid: Grid, x: number, y: number): boolean {
  let m = grid.lightsAt(x, y);
  if (m === 0) return false;

  const empty: { x: number; y: number }[] = [];
  for (const p of surrounds(grid, x, y)) {
    const flags = grid.flagsAt(p.x, p.y);
    if (flags & F_LIGHT) m--;
    if (couldPlaceLight(flags, grid.lightsAt(p.x, p.y))) empty.push(p);
  }
  const n = empty.length;
  if (n === 0) return false; // the number is full already
  if (m < 0 || m > n) return false; // it can't be satisfied

  let changed = false;
  for (const subset of combinations(n - m + 1, n)) {
    const scratch = subset.map((i) => ({ x: empty[i].x, y: empty[i].y, n: 0 }));
    if (discountSet(grid, scratch)) changed = true;
  }
  return changed;
}

/**
 * Solves as far as it can, filling in `grid`. Returns the number of
 * solutions found (0: none; with a unique solution required, 1 means
 * exactly one, and `grid` is then solved), or -1 if trial and error went
 * too deep to tell.
 */
function solveSub(
  grid: Grid,
  flags: number,
  depth: number,
  maxDepth: { value: number } | null,
): number {
  if (maxDepth && maxDepth.value < depth) maxDepth.value = depth;
  const maxRecurse = flags & SOLVE_ALLOW_RECURSE ? MAX_RECURSE : 0;

  for (;;) {
    // Lights shining on each other: no solution from here.
    if (gridOverlap(grid)) return 0;
    if (gridCorrect(grid)) return 1;

    let canPlace = 0;
    let changed = false;
    for (let x = 0; x < grid.w; x++) {
      for (let y = 0; y < grid.h; y++) {
        const f = grid.flagsAt(x, y);
        const lights = grid.lightsAt(x, y);
        if (couldPlaceLight(f, lights)) canPlace++;
        if (trySolveLight(grid, x, y, f, lights)) changed = true;
        if (trySolveNumber(grid, x, y, f, lights)) changed = true;
      }
    }
    if (changed) continue;
    if (!canPlace) return 0; // nowhere left to put a light

    if (flags & SOLVE_DISCOUNT_SETS) {
      search: for (let x = 0; x < grid.w; x++) {
        for (let y = 0; y < grid.h; y++) {
          const f = grid.flagsAt(x, y);
          if (!(f & F_BLACK) && grid.lightsAt(x, y) === 0) {
            if (discountUnlit(grid, x, y)) {
              changed = true;
              break search;
            }
          } else if (f & F_NUMBERED) {
            if (discountClue(grid, x, y)) {
              changed = true;
              break search;
            }
          }
        }
      }
    }
    if (changed) continue;

    // A guess is needed.
    if (depth >= maxRecurse) return -1;

    // Guess at the square that would light the most unlit squares.
    let bestN = 0;
    let bestX = -1;
    let bestY = -1;
    for (let x = 0; x < grid.w; x++) {
      for (let y = 0; y < grid.h; y++) {
        if (!couldPlaceLightAt(grid, x, y)) continue;
        let n = 0;
        forEachLit(listLights(grid, x, y, true), (lx, ly) => {
          if (grid.lightsAt(lx, ly) === 0) n++;
        });
        if (n > bestN) {
          bestN = n;
          bestX = x;
          bestY = y;
        }
      }
    }

    // Try it once as "no light" (in grid) and once as a light (in a copy).
    const copy = grid.copy();
    grid.flags[bestY * grid.w + bestX] |= F_IMPOSSIBLE;
    const selfSoluble = solveSub(grid, flags, depth + 1, maxDepth);

    if (!(flags & SOLVE_FORCE_UNIQUE) && selfSoluble > 0) return selfSoluble;

    setLight(copy, bestX, bestY, true);
    const copySoluble = solveSub(copy, flags, depth + 1, maxDepth);

    if (flags & SOLVE_FORCE_UNIQUE && (copySoluble < 0 || selfSoluble < 0)) return -1;
    if (copySoluble <= 0) return selfSoluble;
    if (selfSoluble <= 0) {
      grid.lights.set(copy.lights);
      grid.flags.set(copy.flags);
      return copySoluble;
    }
    return copySoluble + selfSoluble;
  }
}

/**
 * Fills in `grid` as far as it can; returns the number of solutions found
 * (see solveSub). If positive, `grid` holds a solution. `maxDepth`, if
 * given, receives how deep trial and error had to go.
 */
export function solve(
  grid: Grid,
  flags: number,
  maxDepth: { value: number } | null = null,
): number {
  for (let i = 0; i < grid.flags.length; i++) grid.flags[i] &= ~F_NUMBERUSED;
  return solveSub(grid, flags, 0, maxDepth);
}
