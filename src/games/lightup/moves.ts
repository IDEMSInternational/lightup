import { DOT, EMPTY, LIGHT, LightUpState, Point, isSolved, isWhite } from './state';

export type LightUpMove =
  /** Put a light on an empty white square (a tap). */
  | { kind: 'light'; at: Point }
  /** Take a light or a dot off a square (a tap, or a swipe on a dot). */
  | { kind: 'clear'; at: Point }
  /** Put a dot on an empty white square (a short swipe). */
  | { kind: 'dot'; at: Point }
  /** Replace everything with the solution's lights (marks the game as cheated). */
  | { kind: 'solve'; lights: readonly Point[] };

/** Applies a move, returning a new state, or null if the move is invalid or changes nothing. */
export function applyMove(state: LightUpState, move: LightUpMove): LightUpState | null {
  const marks = state.marks.slice();
  const index = (p: Point) =>
    inside(state, p) && isWhite(state, p.y * state.w + p.x) ? p.y * state.w + p.x : -1;

  switch (move.kind) {
    case 'light': {
      const i = index(move.at);
      if (i < 0 || marks[i] !== EMPTY) return null;
      marks[i] = LIGHT;
      break;
    }
    case 'clear': {
      const i = index(move.at);
      if (i < 0 || marks[i] === EMPTY) return null;
      marks[i] = EMPTY;
      break;
    }
    case 'dot': {
      const i = index(move.at);
      if (i < 0 || marks[i] !== EMPTY) return null;
      marks[i] = DOT;
      break;
    }
    case 'solve': {
      marks.fill(EMPTY);
      for (const p of move.lights) {
        const i = index(p);
        if (i < 0) return null;
        marks[i] = LIGHT;
      }
      break;
    }
  }

  const next = { ...state, marks };
  return {
    ...next,
    completed: state.completed || isSolved(next),
    cheated: state.cheated || move.kind === 'solve',
  };
}

function inside(state: LightUpState, p: Point): boolean {
  return (
    Number.isInteger(p.x) &&
    Number.isInteger(p.y) &&
    p.x >= 0 &&
    p.y >= 0 &&
    p.x < state.w &&
    p.y < state.h
  );
}
