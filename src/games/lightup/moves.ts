import { CROSS, EMPTY, LIGHT, LightUpState, Point, isSolved, isWhite } from './state';

export type LightUpMove =
  /** Put a light on an empty white square (a tap); dotted if `tentative` (thinking mode). */
  | { kind: 'light'; at: Point; tentative?: boolean }
  /** Take a light or a cross off a square (a tap, or a swipe on a cross). */
  | { kind: 'clear'; at: Point }
  /** Put a cross on an empty white square (a short swipe); dotted if `tentative`. */
  | { kind: 'cross'; at: Point; tentative?: boolean }
  /** Thinking mode: make every dotted light and cross solid (the hypothesis held). */
  | { kind: 'keep-thoughts' }
  /** Thinking mode: remove every dotted light and cross (the hypothesis failed). */
  | { kind: 'discard-thoughts' }
  /** Replace everything with the solution's lights (marks the game as cheated). */
  | { kind: 'solve'; lights: readonly Point[] };

/** Applies a move, returning a new state, or null if the move is invalid or changes nothing. */
export function applyMove(state: LightUpState, move: LightUpMove): LightUpState | null {
  const marks = state.marks.slice();
  const tentative = state.tentative.slice();
  const index = (p: Point) =>
    inside(state, p) && isWhite(state, p.y * state.w + p.x) ? p.y * state.w + p.x : -1;

  switch (move.kind) {
    case 'light':
    case 'cross': {
      const i = index(move.at);
      if (i < 0 || marks[i] !== EMPTY) return null;
      marks[i] = move.kind === 'light' ? LIGHT : CROSS;
      tentative[i] = move.tentative ? 1 : 0;
      break;
    }
    case 'clear': {
      const i = index(move.at);
      if (i < 0 || marks[i] === EMPTY) return null;
      marks[i] = EMPTY;
      tentative[i] = 0;
      break;
    }
    case 'keep-thoughts':
      if (!tentative.includes(1)) return null;
      tentative.fill(0);
      break;
    case 'discard-thoughts':
      if (!tentative.includes(1)) return null;
      tentative.forEach((t, i) => t && (marks[i] = EMPTY));
      tentative.fill(0);
      break;
    case 'solve': {
      marks.fill(EMPTY);
      tentative.fill(0);
      for (const p of move.lights) {
        const i = index(p);
        if (i < 0) return null;
        marks[i] = LIGHT;
      }
      break;
    }
  }

  const next = { ...state, marks, tentative };
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
