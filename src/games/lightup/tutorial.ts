import { Tutorial } from '@studio/engine/tutorial';
import { BLACK, WHITE, encodeDescription } from './description';
import { LightUpMove } from './moves';
import { EASY, LightUpParams, defaultParams } from './params';
import { DOT, LIGHT, LightUpState, Point } from './state';

/** Guidance on the board: a square to tap or swipe on, with an optional note. */
export interface LightUpHint {
  square: Point;
  gesture: 'tap' | 'swipe';
  note?: string;
}

const W = WHITE;
const B = BLACK;

/**
 * The tutorial puzzle, with a unique solution (L = light):
 *
 *     2 L · · ·      the 2 in the corner: both its neighbours are lights
 *     L · · · ·
 *     · · # 2 L      the 2: its only free neighbours are lights
 *     · · · L ·
 *     · · L · 0      the 0: no light next to it
 */
// prettier-ignore
const SQUARES = [
  2, W, W, W, W,
  W, W, W, W, W,
  W, W, B, 2, W,
  W, W, W, W, W,
  W, W, W, W, 0,
];

/** The corner 2's neighbours: the first light, then the second. */
const FIRST_LIGHT: Point = { x: 1, y: 0 };
const SECOND_LIGHT: Point = { x: 0, y: 1 };
/** A deliberate mistake: a light in the first light's row. */
const CLASHING: Point = { x: 3, y: 0 };
/** The 0's neighbours, dotted one at a time. */
const BESIDE_ZERO: Point[] = [
  { x: 3, y: 4 },
  { x: 4, y: 3 },
];

const markAt = (state: LightUpState, p: Point) => state.marks[p.y * state.w + p.x];
const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y;

/**
 * Teaches by doing, one action per step: place a light, place a second one
 * for a number, place a wrong one, remove it, mark squares with dots, then
 * finish the puzzle alone.
 */
export const lightUpTutorial: Tutorial<LightUpParams, LightUpState, LightUpMove, LightUpHint> = {
  params: { ...defaultParams(), w: 5, h: 5, difficulty: EASY },
  description: encodeDescription(SQUARES),
  steps: [
    {
      text:
        'Light every white square. A light shines along its row and column, up to a black square, ' +
        'and no light may shine on another. Tap here to place a light.',
      hint: { square: FIRST_LIGHT, gesture: 'tap' },
      expect: (move) => move.kind === 'light' && same(move.at, FIRST_LIGHT),
      done: (state) => markAt(state, FIRST_LIGHT) === LIGHT,
    },
    {
      text:
        'A number tells how many lights are next to it. This 2 has only two white neighbours, ' +
        'so both hold lights. Tap the other one.',
      hint: { square: SECOND_LIGHT, gesture: 'tap' },
      expect: (move) => move.kind === 'light' && same(move.at, SECOND_LIGHT),
      done: (state) => markAt(state, SECOND_LIGHT) === LIGHT,
    },
    {
      text: 'Now try a light here.',
      hint: { square: CLASHING, gesture: 'tap' },
      expect: (move) => move.kind === 'light' && same(move.at, CLASHING),
      done: (state) => markAt(state, CLASHING) === LIGHT,
    },
    {
      text: 'It shines along the row onto the light at the left, so it can’t stay. Tap it to remove it.',
      hint: { square: CLASHING, gesture: 'tap', note: 'Shines on a light' },
      expect: (move) => move.kind === 'clear' && same(move.at, CLASHING),
      done: (state) => markAt(state, CLASHING) !== LIGHT,
    },
    {
      text:
        'The 0 means no lights next to it. Swipe a little inside each of its neighbours to mark it ' +
        'with a dot, as a reminder that no light goes there.',
      hint: (state) => {
        const next = BESIDE_ZERO.find((p) => markAt(state, p) !== DOT);
        return next && { square: next, gesture: 'swipe' };
      },
      expect: (move) => move.kind === 'dot' && BESIDE_ZERO.some((p) => same(p, move.at)),
      done: (state) => BESIDE_ZERO.every((p) => markAt(state, p) === DOT),
    },
    {
      text: 'Now finish the puzzle yourself.',
      done: (state) => state.completed,
    },
  ],
};
