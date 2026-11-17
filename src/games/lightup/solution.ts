import { BLACK, WHITE } from './description';
import { F_BLACK, F_IMPOSSIBLE, F_LIGHT, F_NUMBERED, Grid } from './grid';
import { SOLVE_ALLOW_RECURSE, SOLVE_DISCOUNT_SETS, solve } from './solver/solver';
import { Point, Size } from './state';

/** A working grid for the solver, holding the puzzle's black squares and numbers. */
export function gridFromSquares(size: Size, squares: ArrayLike<number>): Grid {
  const grid = new Grid(size.w, size.h);
  for (let i = 0; i < squares.length; i++) {
    if (squares[i] === WHITE) continue;
    grid.flags[i] = F_BLACK;
    if (squares[i] !== BLACK) {
      grid.flags[i] |= F_NUMBERED;
      grid.lights[i] = squares[i];
    }
  }
  return grid;
}

/**
 * Solves a puzzle as the original's Solve does (any solution will do, with
 * every technique allowed); returns the solved grid, or null if there is
 * no solution.
 */
export function solvePuzzle(size: Size, squares: ArrayLike<number>): Grid | null {
  const grid = gridFromSquares(size, squares);
  return solve(grid, SOLVE_ALLOW_RECURSE | SOLVE_DISCOUNT_SETS) > 0 ? grid : null;
}

/** The lights of a solved grid. */
export function lightsOf(grid: Grid): Point[] {
  const lights: Point[] = [];
  for (let y = 0; y < grid.h; y++) {
    for (let x = 0; x < grid.w; x++) if (grid.flagsAt(x, y) & F_LIGHT) lights.push({ x, y });
  }
  return lights;
}

/**
 * The original's Solve move from an empty board to the solved grid, e.g.
 * "S;L0,1;I2,0": a light (L) or a square ruled out (I), column by column.
 * Only for checking the port against the original.
 */
export function originalSolveMove(grid: Grid): string {
  let text = 'S';
  for (let x = 0; x < grid.w; x++) {
    for (let y = 0; y < grid.h; y++) {
      const flags = grid.flagsAt(x, y);
      if (flags & F_LIGHT) text += `;L${x},${y}`;
      else if (flags & F_IMPOSSIBLE) text += `;I${x},${y}`;
    }
  }
  return text;
}
