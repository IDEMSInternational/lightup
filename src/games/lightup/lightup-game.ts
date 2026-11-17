import { PuzzleGame } from '@studio/engine/puzzle-game';
import { decodeDescription, validateDescription } from './description';
import { generateLightUp } from './generator/generate';
import { LightUpMove, applyMove } from './moves';
import {
  DIFFICULTIES,
  LightUpParams,
  customFields,
  customParams,
  daily,
  decodeParams,
  defaultParams,
  encodeParams,
  presets,
  validateParams,
} from './params';
import { lightsOf, solvePuzzle } from './solution';
import { LightUpState } from './state';

/**
 * Light Up (also known as Akari): place lights so that every white square
 * is lit, no light shines on another, and each numbered black square has
 * that many lights next to it.
 */
export const lightUpGame: PuzzleGame<LightUpParams, LightUpState, LightUpMove> = {
  id: 'lightup',
  name: 'Light Up',

  defaultParams,
  presets,
  encodeParams,
  decodeParams,
  validateParams,
  customFields,
  customParams,

  difficulties: DIFFICULTIES,
  difficultyOf: (params) => params.difficulty,
  withDifficulty: (params, difficulty) => ({ ...params, difficulty }),

  generate: generateLightUp,
  validateDescription: (params, description) =>
    validateDescription(params.w * params.h, description),

  newGame(params, description) {
    const squares = decodeDescription(params.w * params.h, description);
    return {
      w: params.w,
      h: params.h,
      squares,
      marks: new Uint8Array(squares.length),
      tentative: new Uint8Array(squares.length),
      completed: false,
      cheated: false,
    };
  },

  applyMove,
  isCompleted: (state) => state.completed,
  canShowMistakes: true,
  daily,

  solve(initial) {
    const solved = solvePuzzle(initial, initial.squares);
    return solved ? { kind: 'solve', lights: lightsOf(solved) } : null;
  },
};
