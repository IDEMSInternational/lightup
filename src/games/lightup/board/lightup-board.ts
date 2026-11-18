import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { placeLabel } from '@studio/container/board-label';
import { BoardPointer } from '@studio/container/board-pointer';
import { Point } from '@studio/engine/geometry';
import { WHITE } from '../description';
import { DEFAULT_SLOP, LightUpTouch } from '../input';
import { LightUpMove } from '../moves';
import { CROSS, EMPTY, LIGHT, LightUpState, findMistakes, litCounts } from '../state';
import { LightUpHint } from '../tutorial';

/** Boards created so far, for unique ids. */
let boards = 0;

interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Board for Light Up, drawn as SVG in square units. Emits moves; never changes state itself. */
@Component({
  selector: 'lightup-board',
  templateUrl: './lightup-board.html',
  styleUrl: './lightup-board.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LightUpBoard {
  readonly state = input.required<LightUpState>();
  /** Tutorial guidance: highlights squares and animates the gesture. */
  readonly hint = input<LightUpHint | null>(null);
  /** Thinking mode: new lights and crosses are tentative, drawn dotted. */
  readonly thinking = input(false);
  /** Show mistakes: lights shining on each other, and numbers that can't be right, in red. */
  readonly showMistakes = input(false);
  readonly move = output<LightUpMove>();

  private readonly svg = viewChild.required<ElementRef<SVGSVGElement>>('svg');
  /** The finger on the board. */
  private readonly pointer = new BoardPointer<LightUpTouch>(() => this.svg().nativeElement);
  /** The id of this board's clip path (unique: the tutorial and the game may both have a board). */
  protected readonly clipId = `lightup-paper-${++boards}`;
  /** The square of the swipe in progress, which gains or loses a cross when the finger lifts. */
  protected readonly swipe = signal<Point | null>(null);

  protected readonly viewBox = computed(() => {
    const { w, h } = this.state();
    return `-0.1 -0.1 ${w + 0.2} ${h + 0.2}`;
  });

  protected readonly gridLines = computed(() => {
    const { w, h } = this.state();
    const lines: Segment[] = [];
    for (let x = 1; x < w; x++) lines.push({ x1: x, y1: 0, x2: x, y2: h });
    for (let y = 1; y < h; y++) lines.push({ x1: 0, y1: y, x2: w, y2: y });
    return lines;
  });

  /** Everything on the board, square by square. */
  protected readonly view = computed(() => {
    const state = this.state();
    const lit = litCounts(state);
    const surelyLit = litCounts(state, true);
    const mistakes = this.showMistakes() ? findMistakes(state, lit) : null;
    const swipe = this.swipe();
    const swiped = swipe ? swipe.y * state.w + swipe.x : -1;

    const blacks: { x: number; y: number; number: number | null; wrong: boolean }[] = [];
    /** `maybe`: lit only by tentative lights. */
    const litSquares: { x: number; y: number; maybe: boolean }[] = [];
    const lights: { x: number; y: number; wrong: boolean; tentative: boolean }[] = [];
    const crosses: { x: number; y: number; going: boolean; tentative: boolean }[] = [];
    const newCrosses: { x: number; y: number; tentative: boolean }[] = [];

    state.squares.forEach((square, i) => {
      const x = i % state.w;
      const y = Math.floor(i / state.w);
      if (square !== WHITE) {
        blacks.push({
          x,
          y,
          number: square >= 0 ? square : null,
          wrong: !!mistakes?.numbers.has(i),
        });
        return;
      }
      if (lit[i] > 0) litSquares.push({ x, y, maybe: surelyLit[i] === 0 });
      const mark = state.marks[i];
      const tentative = state.tentative[i] === 1;
      if (mark === LIGHT) lights.push({ x, y, wrong: !!mistakes?.lights.has(i), tentative });
      else if (mark === CROSS) crosses.push({ x, y, going: i === swiped, tentative });
      else if (mark === EMPTY && i === swiped)
        newCrosses.push({ x, y, tentative: this.thinking() });
    });
    return { blacks, litSquares, lights, crosses, newCrosses };
  });

  /** Hint outlines on the white squares, plus where the animated finger goes. */
  protected readonly hintView = computed(() => {
    const hint = this.hint();
    if (!hint) return null;
    const state = this.state();
    const centre = { x: hint.square.x + 0.5, y: hint.square.y + 0.5 };
    return {
      square: state.squares[hint.square.y * state.w + hint.square.x] === WHITE ? hint.square : null,
      gesture: hint.gesture,
      centre,
      // A swipe: a short stroke across the middle of the square.
      path: `M ${centre.x - 0.22} ${centre.y} L ${centre.x + 0.22} ${centre.y}`,
    };
  });

  /** A tutorial note about the hinted square, e.g. "Shines on a light". */
  protected readonly noteLabel = computed(() => {
    const hint = this.hint();
    if (!hint?.note || this.swipe()) return null;
    const { x, y } = hint.square;
    return placeLabel(hint.note, { x, y, w: 1, h: 1 }, this.state());
  });

  /** A small cross in the middle of the square at (x, y): "no light here". */
  protected crossPath({ x, y }: Point): string {
    const cx = x + 0.5;
    const cy = y + 0.5;
    const r = 0.13;
    return `M ${cx - r} ${cy - r} L ${cx + r} ${cy + r} M ${cx + r} ${cy - r} L ${cx - r} ${cy + r}`;
  }

  protected onPointerDown(event: PointerEvent): void {
    this.pointer.down(
      event,
      (at) => new LightUpTouch(this.state(), at, { slop: this.slop(), thinking: this.thinking() }),
    );
  }

  protected onPointerMove(event: PointerEvent): void {
    const touch = this.pointer.move(event);
    if (touch?.isSwipe) this.swipe.set(touch.square);
  }

  protected onPointerUp(event: PointerEvent): void {
    const move = this.pointer.up(event)?.finish();
    this.cancelTouch();
    if (move) this.move.emit(move);
  }

  protected cancelTouch(): void {
    this.pointer.cancel();
    this.swipe.set(null);
  }

  /**
   * How far the finger may wander and still tap, in squares: about 8 pixels
   * (finger jitter), but never so much that a short swipe on a small square
   * can't make a cross.
   */
  private slop(): number {
    const pixelsPerSquare = this.pointer.pixelsPerSquare();
    if (!pixelsPerSquare) return DEFAULT_SLOP;
    return Math.min(Math.max(8 / pixelsPerSquare, 0.1), 0.35);
  }
}
