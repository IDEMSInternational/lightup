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
import { WHITE } from '../description';
import { LightUpTouch } from '../input';
import { LightUpMove } from '../moves';
import { DOT, EMPTY, LIGHT, LightUpState, Point, findMistakes, litCounts } from '../state';
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
  /** Show mistakes: lights shining on each other, and numbers that can't be right, in red. */
  readonly showMistakes = input(false);
  readonly move = output<LightUpMove>();

  private readonly svg = viewChild.required<ElementRef<SVGSVGElement>>('svg');
  private touch: LightUpTouch | null = null;
  /** The id of this board's clip path (unique: the tutorial and the game may both have a board). */
  protected readonly clipId = `lightup-paper-${++boards}`;
  /** The drag in progress: the squares it crosses, and whether it takes dots off. */
  protected readonly drag = signal<{ squares: readonly Point[]; erasing: boolean } | null>(null);

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
    const mistakes = this.showMistakes() ? findMistakes(state, lit) : null;
    const drag = this.drag();
    const dragged = new Set(drag?.squares.map((p) => p.y * state.w + p.x));

    const blacks: { x: number; y: number; number: number | null; wrong: boolean }[] = [];
    const litSquares: Point[] = [];
    const lights: { x: number; y: number; wrong: boolean }[] = [];
    const dots: { x: number; y: number; going: boolean }[] = [];
    const newDots: Point[] = [];

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
      if (lit[i] > 0) litSquares.push({ x, y });
      const mark = state.marks[i];
      if (mark === LIGHT) lights.push({ x, y, wrong: !!mistakes?.lights.has(i) });
      else if (mark === DOT) dots.push({ x, y, going: !!drag?.erasing && dragged.has(i) });
      else if (mark === EMPTY && drag && !drag.erasing && dragged.has(i)) newDots.push({ x, y });
    });
    return { blacks, litSquares, lights, dots, newDots };
  });

  /** Hint outlines on the white squares, plus where the animated finger goes. */
  protected readonly hintView = computed(() => {
    const hint = this.hint();
    if (!hint) return null;
    const state = this.state();
    const centres = hint.squares.map((p) => ({ x: p.x + 0.5, y: p.y + 0.5 }));
    return {
      squares: hint.squares.filter((p) => state.squares[p.y * state.w + p.x] === WHITE),
      gesture: hint.gesture,
      centre: centres[0],
      path: 'M ' + centres.map((c) => `${c.x} ${c.y}`).join(' L '),
    };
  });

  /** A tutorial note about the hinted square, e.g. "Shines on a light". */
  protected readonly noteLabel = computed(() => {
    const hint = this.hint();
    if (!hint?.note || this.drag()) return null;
    const first = hint.squares[0];
    return placeLabel(hint.note, { x: first.x, y: first.y, w: 1, h: 1 }, this.state());
  });

  protected onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    event.preventDefault();
    this.svg().nativeElement.setPointerCapture(event.pointerId);
    this.touch = new LightUpTouch(this.state(), this.pointUnder(event));
  }

  protected onPointerMove(event: PointerEvent): void {
    if (!this.touch) return;
    this.touch.moveTo(this.pointUnder(event));
    if (this.touch.isDrag)
      this.drag.set({ squares: this.touch.squares, erasing: this.touch.erasing });
  }

  protected onPointerUp(event: PointerEvent): void {
    if (!this.touch) return;
    this.touch.moveTo(this.pointUnder(event));
    const move = this.touch.finish();
    this.cancelTouch();
    if (move) this.move.emit(move);
  }

  protected cancelTouch(): void {
    this.touch = null;
    this.drag.set(null);
  }

  /** The pointer's position on the board, in squares. */
  private pointUnder(event: PointerEvent): { x: number; y: number } {
    const matrix = this.svg().nativeElement.getScreenCTM()?.inverse();
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix);
    return { x: p.x, y: p.y };
  }
}
