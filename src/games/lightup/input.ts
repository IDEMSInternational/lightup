import { Point, Size, squareAt } from '@studio/engine/geometry';
import { WHITE } from './description';
import { LightUpMove } from './moves';
import { CROSS, EMPTY, LightUpState } from './state';

/**
 * How far (in squares) the finger may wander and still make a tap. Further
 * makes a swipe, which puts a cross on the square.
 */
export const DEFAULT_SLOP = 0.25;

/**
 * One touch on the board, which acts on the square where it starts only.
 * A tap on an empty white square places a light; a tap on a light or a cross
 * takes it off. A short swipe puts a cross ("no light here") on an empty
 * white square, or takes a cross off. Positions are in squares.
 *
 * In thinking mode, new lights and crosses are tentative (drawn dotted),
 * and solid ones are protected: they can't be tapped or swiped away, so
 * discarding a hypothesis never loses work the player was sure of.
 */
export class LightUpTouch {
  private readonly state: LightUpState;
  private readonly start: { x: number; y: number };
  private readonly slop: number;
  private readonly thinking: boolean;
  /** The square the touch acts on. */
  readonly square: Point;
  /** True once the finger has moved further than the slop from where it touched down. */
  private moved = false;

  /**
   * `slop`: how far (in squares) the finger may move and still tap, see
   * DEFAULT_SLOP. `thinking`: thinking mode.
   */
  constructor(
    state: LightUpState,
    start: { x: number; y: number },
    { slop = DEFAULT_SLOP, thinking = false } = {},
  ) {
    this.state = state;
    this.start = start;
    this.slop = slop;
    this.thinking = thinking;
    this.square = squareAt(state, start.x, start.y);
  }

  /** Follows the finger. */
  moveTo(p: { x: number; y: number }): void {
    if (Math.hypot(p.x - this.start.x, p.y - this.start.y) > this.slop) this.moved = true;
  }

  /** True once the finger has moved beyond the slop: a swipe, not a tap. */
  get isSwipe(): boolean {
    return this.moved;
  }

  /** The move this touch makes when released, or null if it would do nothing. */
  finish(): LightUpMove | null {
    const at = this.square;
    if (this.state.squares[at.y * this.state.w + at.x] !== WHITE) return null; // a black square
    const mark = this.mark;
    const solid = mark !== EMPTY && !this.state.tentative[at.y * this.state.w + at.x];
    if (this.thinking && solid) return null; // protected while thinking
    const tentative = this.thinking ? { tentative: true } : {};
    if (this.isSwipe) {
      if (mark === EMPTY) return { kind: 'cross', at, ...tentative };
      return mark === CROSS ? { kind: 'clear', at } : null; // a swipe leaves a light alone
    }
    return mark === EMPTY ? { kind: 'light', at, ...tentative } : { kind: 'clear', at };
  }

  private get mark(): number {
    return this.state.marks[this.square.y * this.state.w + this.square.x];
  }
}
