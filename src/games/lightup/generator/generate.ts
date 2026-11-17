import { GeneratedPuzzle } from '@studio/engine/puzzle-game';
import { RandomState } from '@studio/engine/random/random-state';
import { shuffle } from '@studio/engine/random/shuffle';
import { BLACK, WHITE, encodeDescription } from '../description';
import { F_BLACK, F_IMPOSSIBLE, F_LIGHT, F_NUMBERED, F_NUMBERUSED, Grid, setLight } from '../grid';
import { LightUpParams } from '../params';
import { flagsFromDifficulty, solve } from '../solver/solver';
import { setBlacks } from './blacks';
import { placeLights, placeNumbers } from './lights';

/** Black layouts tried before adding more black squares. */
const MAX_GRIDGEN_TRIES = 20;

/** Takes off every light and every solver mark, leaving the black squares and numbers. */
function unplaceLights(grid: Grid): void {
  for (let x = 0; x < grid.w; x++) {
    for (let y = 0; y < grid.h; y++) {
      if (grid.flagsAt(x, y) & F_LIGHT) setLight(grid, x, y, false);
      grid.flags[y * grid.w + x] &= ~(F_IMPOSSIBLE | F_NUMBERUSED);
    }
  }
}

/**
 * True if the puzzle has exactly one solution, found by the solver at this
 * difficulty (and, below Hard, without trial and error). Leaves the
 * solver's work in `grid`, including which numbers it used.
 */
function puzzleIsGood(grid: Grid, difficulty: number): boolean {
  const flags = flagsFromDifficulty(difficulty);
  unplaceLights(grid);
  const depth = { value: 0 };
  const solutions = solve(grid, flags, depth);
  if (difficulty < 2 && depth.value > 0) return false;
  return solutions === 1;
}

/** Removes every number the solver didn't use. */
function stripUnusedNumbers(grid: Grid): void {
  for (let i = 0; i < grid.w * grid.h; i++) {
    if (grid.flags[i] & F_NUMBERED && !(grid.flags[i] & F_NUMBERUSED)) {
      grid.flags[i] &= ~F_NUMBERED;
      grid.lights[i] = 0;
    }
  }
}

/**
 * Generates a puzzle, exactly as the original does: black squares, lights
 * that solve them, every black square numbered; then numbers are removed
 * (those the solver didn't need, then any others it can do without) for
 * as long as the puzzle keeps one solution at this difficulty. For Medium
 * and Hard, the result must be too hard for the difficulty below, or the
 * grid is thrown away. After 20 failed grids, more squares are made black.
 *
 * Light Up stores no solution: "Solve" uses the solver.
 */
export function generateLightUp(params: LightUpParams, random: RandomState): GeneratedPuzzle {
  const { w, h, difficulty } = params;
  let blackPercent = params.blackPercent;

  // One random order of the squares, for removing numbers, used for every grid tried.
  const order = Array.from({ length: w * h }, (_, i) => i);
  shuffle(order, random);

  let grid = new Grid(w, h);
  for (;;) {
    for (let attempt = 0; attempt < MAX_GRIDGEN_TRIES; attempt++) {
      setBlacks(grid, params, blackPercent, random);
      placeLights(grid, random);
      placeNumbers(grid);
      if (!puzzleIsGood(grid, difficulty)) continue;

      const stripped = grid.copy();
      stripUnusedNumbers(stripped);
      if (puzzleIsGood(stripped, difficulty)) grid = stripped;

      for (const i of order) {
        if (!(grid.flags[i] & F_NUMBERED)) continue;
        const number = grid.lights[i];
        grid.lights[i] = 0;
        grid.flags[i] &= ~F_NUMBERED;
        if (!puzzleIsGood(grid, difficulty)) {
          grid.lights[i] = number;
          grid.flags[i] |= F_NUMBERED;
        }
      }

      // Is the hardest puzzle found hard enough?
      if (difficulty > 0 && puzzleIsGood(grid, difficulty - 1)) continue;

      return { description: encodeDescription(squaresOf(grid)) };
    }
    if (blackPercent < 90) blackPercent += 5;
  }
}

/** The grid's squares, in the form of description.ts. */
export function squaresOf(grid: Grid): Int8Array {
  return Int8Array.from(grid.flags, (f, i) =>
    !(f & F_BLACK) ? WHITE : f & F_NUMBERED ? grid.lights[i] : BLACK,
  );
}
