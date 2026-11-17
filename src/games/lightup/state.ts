import { BLACK, WHITE } from './description';

/** What the player has put on a white square. */
export const EMPTY = 0;
export const LIGHT = 1;
/** A note: "no light here". Dots never count towards the solution. */
export const DOT = 2;

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  w: number;
  h: number;
}

/** A position in a game of Light Up. Treated as immutable. */
export interface LightUpState extends Size {
  /** Each square, indexed y * w + x: WHITE, BLACK, or a black square's number (0 to 4). */
  readonly squares: Int8Array;
  /** The player's EMPTY, LIGHT or DOT on each white square (EMPTY on black ones). */
  readonly marks: Uint8Array;
  readonly completed: boolean;
  /** True once the player has used "Solve". */
  readonly cheated: boolean;
}

export function isWhite(state: LightUpState, i: number): boolean {
  return state.squares[i] === WHITE;
}

/** True for a black square with a number. */
export function isNumbered(state: LightUpState, i: number): boolean {
  return state.squares[i] !== WHITE && state.squares[i] !== BLACK;
}

/** The squares next to square i (left, right, up, down), as indices. */
export function neighbours(size: Size, i: number): number[] {
  const x = i % size.w;
  const y = Math.floor(i / size.w);
  const list: number[] = [];
  if (x > 0) list.push(i - 1);
  if (x < size.w - 1) list.push(i + 1);
  if (y > 0) list.push(i - size.w);
  if (y < size.h - 1) list.push(i + size.w);
  return list;
}

/**
 * How many lights shine on each white square: a light shines on its own
 * square and along its row and column until a black square or the edge.
 */
export function litCounts(state: LightUpState): Int32Array {
  const { w, h } = state;
  const counts = new Int32Array(w * h);
  state.marks.forEach((mark, i) => {
    if (mark !== LIGHT) return;
    counts[i]++;
    const x = i % w;
    const y = Math.floor(i / w);
    for (const [dx, dy] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      for (
        let lx = x + dx, ly = y + dy;
        lx >= 0 && lx < w && ly >= 0 && ly < h;
        lx += dx, ly += dy
      ) {
        if (!isWhite(state, ly * w + lx)) break;
        counts[ly * w + lx]++;
      }
    }
  });
  return counts;
}

/** Rule breaks, for "Show mistakes": square indices. */
export interface Mistakes {
  /** Lights that shine on another light. */
  readonly lights: ReadonlySet<number>;
  /**
   * Numbers with too many lights next to them, or with too few that can no
   * longer be made up (every other neighbour is black or already lit).
   */
  readonly numbers: ReadonlySet<number>;
}

export function findMistakes(state: LightUpState, lit = litCounts(state)): Mistakes {
  const lights = new Set<number>();
  const numbers = new Set<number>();
  state.squares.forEach((square, i) => {
    if (state.marks[i] === LIGHT && lit[i] > 1) lights.add(i);
    if (!isNumbered(state, i)) return;
    let placed = 0;
    let room = 0;
    for (const n of neighbours(state, i)) {
      if (state.marks[n] === LIGHT) placed++;
      else if (isWhite(state, n) && lit[n] === 0) room++;
    }
    if (placed > square || placed + room < square) numbers.add(i);
  });
  return { lights, numbers };
}

/**
 * True when the lights solve the puzzle: every white square lit, no light
 * shining on another, and every number with exactly that many lights next
 * to it. Dots don't matter.
 */
export function isSolved(state: LightUpState): boolean {
  const lit = litCounts(state);
  for (let i = 0; i < state.squares.length; i++) {
    const square = state.squares[i];
    if (square === WHITE) {
      if (lit[i] === 0 || (state.marks[i] === LIGHT && lit[i] > 1)) return false;
    } else if (square !== BLACK) {
      const placed = neighbours(state, i).filter((n) => state.marks[n] === LIGHT).length;
      if (placed !== square) return false;
    }
  }
  return true;
}
