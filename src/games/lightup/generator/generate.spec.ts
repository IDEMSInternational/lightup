import { RandomState } from '@studio/engine/random/random-state';
import { referencePuzzlesToCheck } from '@studio/engine/reference-puzzles';
import { decodeDescription } from '../description';
import { lightUpGame as game } from '../lightup-game';
import { decodeParams } from '../params';
import { originalSolveMove, solvePuzzle } from '../solution';
import reference from '../testing/reference-puzzles.json';
import { generateLightUp } from './generate';

/**
 * The recorded puzzles were generated, and solved, by the original C code
 * (see tools/c-reference). The port must reproduce each one exactly: the
 * puzzle, and the solver's answer (the original stores no solution, so
 * Solve always uses the solver), which completes it. `npm test` checks a
 * sample, `npm run test:puzzles` all of them.
 */
describe('Light Up matches the original C code', () => {
  for (const ref of referencePuzzlesToCheck(reference)) {
    it(`${ref.params}#${ref.seed}`, () => {
      const params = decodeParams(ref.params);
      const puzzle = generateLightUp(params, new RandomState(ref.seed));
      expect(puzzle.description).toBe(ref.description);

      const solved = solvePuzzle(params, decodeDescription(params.w * params.h, ref.description));
      expect(solved && originalSolveMove(solved)).toBe(ref.solution);
      const initial = game.newGame(params, ref.description);
      const finished = game.applyMove(initial, game.solve(initial)!)!;
      expect([finished.completed, finished.cheated]).toEqual([true, true]);
    });
  }
});
