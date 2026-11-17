import { GameSession } from '@studio/engine/game-session';
import { decodeDescription, encodeDescription, validateDescription } from './description';
import { LightUpTouch, squareAt } from './input';
import { lightUpGame as game } from './lightup-game';
import { decodeParams, encodeParams } from './params';
import { DOT, EMPTY, LIGHT, LightUpState, findMistakes, isSolved, litCounts } from './state';
import reference from './testing/reference-puzzles.json';
import { lightsOn } from './testing/squares';
import { lightUpTutorial } from './tutorial';

/** The tutorial puzzle: a 2 top-left, a black square and a 2 in the middle row, a 0 bottom-right. */
const tutorialState = () => game.newGame(lightUpTutorial.params, lightUpTutorial.description);

const place = (state: LightUpState, ...points: [number, number][]) =>
  points.reduce((s, [x, y]) => game.applyMove(s, { kind: 'light', at: { x, y } })!, state);

/** A finger touching down at (x, y) (in squares), moving through `path`, and lifting. */
function touch(state: LightUpState, start: [number, number], ...path: [number, number][]) {
  const t = new LightUpTouch(state, { x: start[0], y: start[1] });
  for (const [x, y] of path) t.moveTo({ x, y });
  return t.finish();
}

describe('Light Up descriptions', () => {
  it('reads and writes the original format', () => {
    expect(lightUpTutorial.description).toBe('2kB2j0');
    const squares = decodeDescription(25, '2kB2j0');
    expect(encodeDescription(squares)).toBe('2kB2j0');
    expect(encodeDescription(new Int8Array(30).fill(-2))).toBe('zd');
  });

  it('rejects descriptions of the wrong length or with unknown characters', () => {
    expect(validateDescription(25, '2kB2i0')).toBe('Game description shorter than expected');
    expect(validateDescription(25, '2kB2k0')).toBe('Game description longer than expected');
    expect(validateDescription(25, '2kB2j5')).toBe(
      'Game description contained unexpected character',
    );
    expect(validateDescription(25, '2kB2j05')).toBe('Game description longer than expected'); // as in the original
  });
});

describe('Light Up rules', () => {
  it('lights a light’s row and column up to black squares', () => {
    const state = place(tutorialState(), [4, 2]);
    const lit = litCounts(state);
    const litSquares = Array.from(lit.keys()).filter((i) => lit[i] > 0);
    // Column 4 down to the 0 at (4, 4); in row 2 the 2 at (3, 2) stops it at once.
    expect(litSquares).toEqual([4, 9, 14, 19]);
  });

  it('is solved by the lights alone, whatever the dots', () => {
    let state = place(tutorialState(), [1, 0], [0, 1], [4, 2], [3, 3]);
    expect(isSolved(state)).toBe(false); // (2, 4) is dark
    state = game.applyMove(state, {
      kind: 'dot',
      squares: [
        { x: 2, y: 3 },
        { x: 0, y: 4 },
      ],
    })!;
    state = place(state, [2, 4]);
    expect(state.completed).toBe(true);
  });

  it('flags lights that shine on each other, and numbers that are over or can’t be met', () => {
    const state = place(tutorialState(), [1, 0], [3, 0]);
    const mistakes = findMistakes(state);
    expect([...mistakes.lights]).toEqual([1, 3]); // (1, 0) and (3, 0) see each other along row 0
    // Both 2s can still get their lights.
    expect(mistakes.numbers.size).toBe(0);

    // Three lights next to the middle 2; the one at (3, 1) also lights the corner 2's
    // neighbour (0, 1), so that 2 can't get its two lights either.
    const crowded = place(tutorialState(), [3, 1], [4, 2], [3, 3]);
    expect([...findMistakes(crowded).numbers]).toEqual([0, 13]);

    // The corner 2 with one light, its other neighbour lit from below: it can't reach 2.
    const starved = place(tutorialState(), [1, 0], [0, 3]);
    expect([...findMistakes(starved).numbers]).toEqual([0]);
  });

  it('does not flag a light that obeys the rules but is not in the solution', () => {
    const state = place(tutorialState(), [2, 3]);
    const mistakes = findMistakes(state);
    expect(mistakes.lights.size + mistakes.numbers.size).toBe(0);
  });
});

describe('Light Up solver', () => {
  it('solves every reference puzzle', () => {
    for (const ref of reference) {
      const params = decodeParams(ref.params);
      const initial = game.newGame(params, ref.description);
      const solved = game.applyMove(initial, game.solve(initial)!)!;
      expect(solved.completed, `${ref.params}#${ref.seed}`).toBe(true);
      expect(solved.cheated).toBe(true);
    }
  });
});

describe('Light Up play', () => {
  it('places a light with a tap on an empty white square, and takes it off with another', () => {
    let state = tutorialState();
    const tap = touch(state, [1.5, 0.5]);
    expect(tap).toEqual({ kind: 'light', at: { x: 1, y: 0 } });
    state = game.applyMove(state, tap!)!;
    expect(touch(state, [1.4, 0.6])).toEqual({ kind: 'clear', at: { x: 1, y: 0 } });
    state = game.applyMove(state, touch(state, [1.4, 0.6])!)!;
    expect(lightsOn(state)).toEqual([]);
  });

  it('ignores taps on black squares', () => {
    expect(touch(tutorialState(), [0.5, 0.5])).toBeNull();
  });

  it('marks every square a drag crosses with a dot, skipping black squares and lights', () => {
    let state = place(tutorialState(), [2, 3]);
    // From (0, 2) along row 2 and down: crosses the black square at (2, 2) and the light at (2, 3).
    const drag = touch(state, [0.5, 2.5], [2.5, 2.5], [2.5, 3.5]);
    expect(drag).toEqual({
      kind: 'dot',
      squares: [
        { x: 0, y: 2 },
        { x: 1, y: 2 },
        { x: 2, y: 2 },
        { x: 2, y: 3 },
      ],
    });
    state = game.applyMove(state, drag!)!;
    expect(Array.from(state.marks.slice(10, 12))).toEqual([DOT, DOT]);
    expect(state.marks[17]).toBe(LIGHT);
  });

  it('follows a fast swipe through every square in between', () => {
    const state = tutorialState();
    const drag = touch(state, [0.5, 3.5], [4.5, 3.5]);
    expect(drag?.kind === 'dot' && drag.squares.length).toBe(5);
  });

  it('takes dots off with a drag that starts on a dot, and with a tap', () => {
    let state = game.applyMove(tutorialState(), {
      kind: 'dot',
      squares: [0, 1, 2, 3].map((x) => ({ x, y: 3 })),
    })!;
    state = game.applyMove(state, touch(state, [0.5, 3.5], [1.5, 3.5])!)!;
    expect(Array.from(state.marks.slice(15, 19))).toEqual([EMPTY, EMPTY, DOT, DOT]);
    state = game.applyMove(state, touch(state, [2.5, 3.5])!)!;
    expect(Array.from(state.marks.slice(15, 19))).toEqual([EMPTY, EMPTY, EMPTY, DOT]);
  });

  it('rejects moves that change nothing', () => {
    const state = place(tutorialState(), [1, 0]);
    expect(game.applyMove(state, { kind: 'light', at: { x: 1, y: 0 } })).toBeNull();
    expect(game.applyMove(state, { kind: 'light', at: { x: 0, y: 0 } })).toBeNull(); // black
    expect(game.applyMove(state, { kind: 'clear', at: { x: 2, y: 0 } })).toBeNull();
    expect(game.applyMove(state, { kind: 'dot', squares: [{ x: 1, y: 0 }] })).toBeNull(); // a light
    expect(game.applyMove(state, { kind: 'undot', squares: [{ x: 2, y: 0 }] })).toBeNull();
  });

  it('clamps touches to the board', () => {
    expect(squareAt({ w: 5, h: 5 }, -0.3, 7)).toEqual({ x: 0, y: 4 });
  });
});

describe('Light Up sizes and difficulties', () => {
  it('offers 5×5 to 10×10 in steps of one, at Easy, Medium and Hard', () => {
    expect(game.presets().map((p) => p.name)).toEqual(['5×5', '6×6', '7×7', '8×8', '9×9', '10×10']);
    expect(game.difficulties).toEqual(['Easy', 'Medium', 'Hard']);
  });

  it('writes the original’s full parameters, and reads its short ones', () => {
    expect(encodeParams(game.defaultParams())).toBe('7x7b20s2d0');
    expect(encodeParams(decodeParams('7x7'))).toBe('7x7b20s4d0'); // the original's default symmetry
    expect(encodeParams(decodeParams('18x10'))).toBe('18x10b20s2d0'); // 4-way rotation needs a square
    expect(encodeParams(decodeParams('9x9r'))).toBe('9x9b20s4d2'); // the original's old form of Hard
  });

  it('refuses Hard 4×4, which the original can never generate', () => {
    expect(game.validateParams(decodeParams('4x4b20s2d2'))).toBe(
      'Hard puzzles need a grid bigger than 4×4',
    );
    expect(game.validateParams(decodeParams('4x4b20s2d1'))).toBeNull();
  });

  it('generates solvable puzzles for every preset and difficulty, and for custom sizes', () => {
    const sizes = [
      ...game.presets().map((p) => p.params),
      game.customParams({ w: 5, h: 9 }),
      game.customParams({ w: 15, h: 15 }),
    ];
    for (const params of sizes) {
      for (const difficulty of [0, 1, 2]) {
        const session = new GameSession(game, game.withDifficulty!(params, difficulty));
        session.newGame(undefined, '1');
        expect(session.solve(), session.gameId).toBe(true);
        expect(session.isCompleted).toBe(true);
      }
    }
  }, 30_000); // 24 puzzles, up to 15×15 Hard: slow on a busy machine

  it('fills custom fields from the current size', () => {
    expect(
      game.customFields(decodeParams('6x9')).map((f) => [f.key, f.value, f.min, f.max]),
    ).toEqual([
      ['w', 6, 5, 15],
      ['h', 9, 5, 15],
    ]);
  });
});

describe('GameSession with Light Up', () => {
  it('regenerates the same puzzle from a seed, and supports undo/redo', () => {
    const session = new GameSession(game, decodeParams('7x7b20s2d0'));
    session.newGame(undefined, '1');
    expect(session.description).toBe(
      reference.find((r) => r.params === '7x7b20s2d0' && r.seed === '1')!.description,
    );
    expect(session.gameId).toBe('7x7b20s2d0#1');

    const white = session.state.squares.indexOf(-2);
    const at = { x: white % 7, y: Math.floor(white / 7) };
    expect(session.move({ kind: 'light', at })).toBe(true);
    session.undo();
    expect(lightsOn(session.state)).toEqual([]);
    session.redo();
    expect(lightsOn(session.state)).toEqual([at]);
  });
});
