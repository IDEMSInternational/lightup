import { TutorialRun } from '@studio/engine/tutorial';
import { lightUpGame as game } from './lightup-game';
import { DOT } from './state';
import { lightUpTutorial as tutorial } from './tutorial';

describe('Light Up tutorial', () => {
  it('uses a puzzle with exactly one solution, found without guessing', () => {
    const initial = game.newGame(tutorial.params, tutorial.description);
    const solve = game.solve(initial);
    expect(solve?.kind).toBe('solve');
    expect(game.applyMove(initial, solve!)!.completed).toBe(true);
  });

  it('can be played through from start to finish', () => {
    const run = new TutorialRun(game, tutorial);

    // 1: the two lights next to the corner 2, one after the other. Other moves are ignored.
    expect(run.hint).toEqual({ squares: [{ x: 1, y: 0 }], gesture: 'tap' });
    expect(run.move({ kind: 'light', at: { x: 2, y: 0 } })).toBe('refused');
    expect(run.move({ kind: 'light', at: { x: 1, y: 0 } })).toBe('applied');
    expect(run.hint).toEqual({ squares: [{ x: 0, y: 1 }], gesture: 'tap' });
    expect(run.move({ kind: 'light', at: { x: 0, y: 1 } })).toBe('step-done');
    expect(run.next()).toBe(true);

    // 2: the (wrong) light in the first light's row.
    expect(run.move({ kind: 'light', at: { x: 3, y: 0 } })).toBe('step-done');
    expect(run.next()).toBe(true);

    // 3: tap it to remove it; tapping elsewhere is ignored.
    expect(run.hint?.note).toBe('Shines on a light');
    expect(run.move({ kind: 'clear', at: { x: 1, y: 0 } })).toBe('refused');
    expect(run.move({ kind: 'clear', at: { x: 3, y: 0 } })).toBe('step-done');
    expect(run.next()).toBe(true);

    // 4: dots on the 0's neighbours, in one drag over the 0.
    expect(run.move({ kind: 'dot', squares: [{ x: 3, y: 4 }] })).toBe('refused');
    const drag = [
      { x: 3, y: 4 },
      { x: 4, y: 4 },
      { x: 4, y: 3 },
    ];
    expect(run.move({ kind: 'dot', squares: drag })).toBe('step-done');
    expect(run.state.marks[23]).toBe(DOT);
    expect(run.state.marks[19]).toBe(DOT);
    expect(run.next()).toBe(true);

    // 5: a dot on one square, the already-lit (2, 0), with a short swipe.
    expect(run.hint).toEqual({ squares: [{ x: 2, y: 0 }], gesture: 'swipe' });
    expect(run.move({ kind: 'dot', squares: [{ x: 1, y: 1 }] })).toBe('refused');
    expect(run.move({ kind: 'dot', squares: [{ x: 2, y: 0 }] })).toBe('step-done');
    expect(run.next()).toBe(true);

    // 6: finish freely.
    expect(run.hint).toBeUndefined();
    expect(run.move({ kind: 'light', at: { x: 4, y: 2 } })).toBe('applied');
    expect(run.move({ kind: 'light', at: { x: 3, y: 3 } })).toBe('applied');
    expect(run.move({ kind: 'light', at: { x: 2, y: 4 } })).toBe('step-done');
    expect(run.next()).toBe(false);
  });
});
