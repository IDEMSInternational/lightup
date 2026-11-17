import { WHITE } from './description';
import { LightUpMove } from './moves';
import { DOT, EMPTY, LightUpState, Point, Size } from './state';

/** The square under a position given in squares (e.g. 2.4, 0.9), clamped to the board. */
export function squareAt(size: Size, x: number, y: number): Point {
  return {
    x: Math.min(Math.max(Math.floor(x), 0), size.w - 1),
    y: Math.min(Math.max(Math.floor(y), 0), size.h - 1),
  };
}

/** Spacing (in squares) of the points checked between two finger positions. */
const STEP = 0.25;

/**
 * How far (in squares) the finger may wander and still make a tap. Further,
 * even inside one square, makes a drag: a short swipe puts a dot on a square.
 */
export const DEFAULT_SLOP = 0.25;

/**
 * One touch on the board. A tap on an empty white square places a light;
 * a tap on a light or a dot takes it off. Dragging across squares marks
 * them with dots ("no light here"), or, if the drag starts on a dot, takes
 * the dots off the squares it crosses; a short swipe within one square
 * counts, so a single square can be dotted without leaving it. Positions
 * are in squares.
 */
export class LightUpTouch {
  private readonly size: Size;
  private readonly state: LightUpState;
  private readonly start: { x: number; y: number };
  private readonly slop: number;
  private last: { x: number; y: number };
  /** True once the finger has moved further than the slop from where it touched down. */
  private moved = false;
  /** The squares touched, in order, each once. */
  private readonly path: Point[] = [];

  /** `slop`: how far (in squares) the finger may move and still tap, see DEFAULT_SLOP. */
  constructor(state: LightUpState, start: { x: number; y: number }, slop = DEFAULT_SLOP) {
    this.size = state;
    this.state = state;
    this.start = start;
    this.slop = slop;
    this.last = start;
    this.path.push(squareAt(state, start.x, start.y));
  }

  /** Follows the finger, adding every square crossed since its last position. */
  moveTo(p: { x: number; y: number }): void {
    const steps = Math.max(1, Math.ceil(Math.hypot(p.x - this.last.x, p.y - this.last.y) / STEP));
    for (let i = 1; i <= steps; i++) {
      const square = squareAt(
        this.size,
        this.last.x + ((p.x - this.last.x) * i) / steps,
        this.last.y + ((p.y - this.last.y) * i) / steps,
      );
      if (!this.path.some((q) => q.x === square.x && q.y === square.y)) this.path.push(square);
    }
    this.last = p;
    if (Math.hypot(p.x - this.start.x, p.y - this.start.y) > this.slop) this.moved = true;
  }

  /** True once the finger has moved beyond the slop or left its first square: a drag, not a tap. */
  get isDrag(): boolean {
    return this.moved || this.path.length > 1;
  }

  /** True if this drag takes dots off (it started on a dot) rather than putting them on. */
  get erasing(): boolean {
    const start = this.path[0];
    return this.state.marks[start.y * this.state.w + start.x] === DOT;
  }

  /** The squares this drag would change, for showing it while the finger moves. */
  get squares(): readonly Point[] {
    return this.isDrag ? this.path : [];
  }

  /** The move this touch makes when released, or null if it would do nothing. */
  finish(): LightUpMove | null {
    if (this.isDrag) return { kind: this.erasing ? 'undot' : 'dot', squares: this.path };
    const at = this.path[0];
    const i = at.y * this.state.w + at.x;
    if (this.state.squares[i] !== WHITE) return null; // a black square
    return this.state.marks[i] === EMPTY ? { kind: 'light', at } : { kind: 'clear', at };
  }
}
