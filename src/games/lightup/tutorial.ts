import { Tutorial } from '@studio/engine/tutorial';
import { BLACK, WHITE, encodeDescription } from './description';
import { LightUpMove } from './moves';
import { EASY, LightUpParams, defaultParams } from './params';
import { DOT, LIGHT, LightUpState, Point } from './state';

/**
 * Guidance on the board: squares to tap (one) or to drag across (in
 * order, possibly passing over black squares), with an optional note.
 */
export interface LightUpHint {
  squares: readonly Point[];
  gesture: 'tap' | 'drag';
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

const CORNER_LIGHTS: Point[] = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
];
/** A deliberate mistake: a light in the first light's row. */
const CLASHING: Point = { x: 3, y: 0 };
/** The 0's neighbours, and the drag across them (over the 0). */
const BESIDE_ZERO: Point[] = [
  { x: 3, y: 4 },
  { x: 4, y: 3 },
];
const ZERO_DRAG: Point[] = [
  { x: 3, y: 4 },
  { x: 4, y: 4 },
  { x: 4, y: 3 },
];

const markAt = (state: LightUpState, p: Point) => state.marks[p.y * state.w + p.x];
const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y;

/**
 * Teaches by doing, one action per step: place lights, place a wrong one,
 * remove it, mark squares with dots, then finish the puzzle alone.
 */
export const lightUpTutorial: Tutorial<LightUpParams, LightUpState, LightUpMove, LightUpHint> = {
  params: { ...defaultParams(), w: 5, h: 5, difficulty: EASY },
  description: encodeDescription(SQUARES),
  steps: [
    {
      text:
        'Light every white square. A light shines along its row and column, up to a black square, ' +
        'and no light may shine on another. A number tells how many lights are next to it. ' +
        'This 2 has only two white neighbours, so both hold lights. Tap them.',
      hint: (state) => {
        const next = CORNER_LIGHTS.find((p) => markAt(state, p) !== LIGHT);
        return next && { squares: [next], gesture: 'tap' };
      },
      expect: (move) => move.kind === 'light' && CORNER_LIGHTS.some((p) => same(p, move.at)),
      done: (state) => CORNER_LIGHTS.every((p) => markAt(state, p) === LIGHT),
    },
    {
      text: 'Now try a light here.',
      hint: { squares: [CLASHING], gesture: 'tap' },
      expect: (move) => move.kind === 'light' && same(move.at, CLASHING),
      done: (state) => markAt(state, CLASHING) === LIGHT,
    },
    {
      text: 'It shines along the row onto the light at the left, so it can’t stay. Tap it to remove it.',
      hint: { squares: [CLASHING], gesture: 'tap', note: 'Shines on a light' },
      expect: (move) => move.kind === 'clear' && same(move.at, CLASHING),
      done: (state) => markAt(state, CLASHING) !== LIGHT,
    },
    {
      text:
        'The 0 means no lights next to it. Drag across its neighbours to mark them with dots, ' +
        'as a reminder that no light goes there.',
      hint: { squares: ZERO_DRAG, gesture: 'drag' },
      expect: (move) =>
        move.kind === 'dot' && BESIDE_ZERO.every((p) => move.squares.some((q) => same(p, q))),
      done: (state) => BESIDE_ZERO.every((p) => markAt(state, p) === DOT),
    },
    {
      text: 'Now finish the puzzle yourself.',
      done: (state) => state.completed,
    },
  ],
};
