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

    // 1: the first light. Other moves are ignored.
    expect(run.hint).toEqual({ square: { x: 1, y: 0 }, gesture: 'tap' });
    expect(run.move({ kind: 'light', at: { x: 2, y: 0 } })).toBe('refused');
    expect(run.move({ kind: 'light', at: { x: 1, y: 0 } })).toBe('step-done');
    expect(run.next()).toBe(true);

    // 2: the corner 2's other light.
    expect(run.hint).toEqual({ square: { x: 0, y: 1 }, gesture: 'tap' });
    expect(run.move({ kind: 'light', at: { x: 0, y: 1 } })).toBe('step-done');
    expect(run.next()).toBe(true);

    // 3: the (wrong) light in the first light's row.
    expect(run.move({ kind: 'light', at: { x: 3, y: 0 } })).toBe('step-done');
    expect(run.next()).toBe(true);

    // 4: tap it to remove it; tapping elsewhere is ignored.
    expect(run.hint?.note).toBe('Shines on a light');
    expect(run.move({ kind: 'clear', at: { x: 1, y: 0 } })).toBe('refused');
    expect(run.move({ kind: 'clear', at: { x: 3, y: 0 } })).toBe('step-done');
    expect(run.next()).toBe(true);

    // 5: dots on the 0's two neighbours, one swipe each.
    expect(run.hint).toEqual({ square: { x: 3, y: 4 }, gesture: 'swipe' });
    expect(run.move({ kind: 'dot', at: { x: 2, y: 4 } })).toBe('refused');
    expect(run.move({ kind: 'dot', at: { x: 3, y: 4 } })).toBe('applied');
    expect(run.hint).toEqual({ square: { x: 4, y: 3 }, gesture: 'swipe' });
    expect(run.move({ kind: 'dot', at: { x: 4, y: 3 } })).toBe('step-done');
    expect(run.state.marks[23]).toBe(DOT);
    expect(run.state.marks[19]).toBe(DOT);
    expect(run.next()).toBe(true);

    // 6: finish freely.
    expect(run.hint).toBeUndefined();
    expect(run.move({ kind: 'light', at: { x: 4, y: 2 } })).toBe('applied');
    expect(run.move({ kind: 'light', at: { x: 3, y: 3 } })).toBe('applied');
    expect(run.move({ kind: 'light', at: { x: 2, y: 4 } })).toBe('step-done');
    expect(run.next()).toBe(false);
  });
});
