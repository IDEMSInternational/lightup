import { RandomState } from '@studio/engine/random/random-state';
import { decodeDescription } from '../description';
import { decodeParams } from '../params';
import { originalSolveMove, solvePuzzle } from '../solution';
import reference from '../testing/reference-puzzles.json';
import { generateLightUp } from './generate';

/**
 * The reference puzzles were generated, and solved, by the original C code
 * (see tools/c-reference). The port must reproduce every one exactly.
 */
describe('generateLightUp matches the original C generator', () => {
  for (const ref of reference) {
    it(`${ref.params}#${ref.seed}`, () => {
      const puzzle = generateLightUp(decodeParams(ref.params), new RandomState(ref.seed));
      expect(puzzle.description).toBe(ref.description);
    });
  }
});

describe('the solver matches the original C solver', () => {
  for (const ref of reference) {
    it(`${ref.params}#${ref.seed}`, () => {
      const params = decodeParams(ref.params);
      const solved = solvePuzzle(params, decodeDescription(params.w * params.h, ref.description));
      expect(solved && originalSolveMove(solved)).toBe(ref.solution);
    });
  }
});
