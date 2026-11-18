import { Point } from '@studio/engine/geometry';
import { LIGHT, LightUpState, isWhite } from '../state';

/** For tests: the white squares of a puzzle, row by row. */
export function whiteSquares(state: LightUpState): Point[] {
  return squaresWhere(state, (i) => isWhite(state, i));
}

/** For tests: the squares holding a light, row by row. */
export function lightsOn(state: LightUpState): Point[] {
  return squaresWhere(state, (i) => state.marks[i] === LIGHT);
}

function squaresWhere(state: LightUpState, test: (i: number) => boolean): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < state.squares.length; i++) {
    if (test(i)) points.push({ x: i % state.w, y: Math.floor(i / state.w) });
  }
  return points;
}
