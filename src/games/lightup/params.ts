import { DailySchedule } from '@studio/engine/daily';
import { CustomField, Preset } from '@studio/engine/puzzle-game';

/**
 * Difficulties, as in the original: Easy needs only simple deductions,
 * Medium (the original's "Tricky") also needs a cleverer one (ruling a
 * square out because a light there would leave something unsatisfiable),
 * and Hard needs a little trial and error.
 */
export const EASY = 0;
export const MEDIUM = 1;
export const HARD = 2;
export const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

/** Symmetry of the black squares, numbered as in the original. */
export const SYMMETRY_NONE = 0;
export const SYMMETRY_MIRROR_2 = 1;
export const SYMMETRY_ROTATE_2 = 2;
export const SYMMETRY_MIRROR_4 = 3;
export const SYMMETRY_ROTATE_4 = 4;

/**
 * Smallest and largest grid sides offered to players. Not 4: the original
 * generator can never make a Hard 4×4 puzzle (it keeps trying forever).
 */
const MIN_SIDE = 5;
const MAX_SIDE = 15;

export interface LightUpParams {
  w: number;
  h: number;
  /** Percentage of black squares to start from (the generator adds more if it must). */
  blackPercent: number;
  symmetry: number;
  difficulty: number;
}

/**
 * The puzzles the app offers: a fifth of the squares black, laid out with
 * 2-way rotational symmetry (which fits any width and height).
 */
function offered(w: number, h: number, difficulty: number): LightUpParams {
  return { w, h, blackPercent: 20, symmetry: SYMMETRY_ROTATE_2, difficulty };
}

export function defaultParams(): LightUpParams {
  return offered(7, 7, EASY);
}

export function presets(): Preset<LightUpParams>[] {
  return [5, 6, 7, 8, 9, 10].map((n) => ({ name: `${n}×${n}`, params: offered(n, n, EASY) }));
}

export function customFields(params: LightUpParams): CustomField[] {
  return [
    { key: 'w', label: 'Width', min: MIN_SIDE, max: MAX_SIDE, value: params.w },
    { key: 'h', label: 'Height', min: MIN_SIDE, max: MAX_SIDE, value: params.h },
  ];
}

export function customParams(values: Readonly<Record<string, number>>): LightUpParams {
  return offered(values['w'], values['h'], EASY);
}

/**
 * The daily puzzles, at each level growing through the week: Easy 5×5 to
 * 7×7 Easy puzzles, Medium 6×6 to 8×8 Medium ones, Hard 7×7 to 9×9 Hard
 * ones. Changing this changes the daily puzzles for everyone (see daily.ts
 * in the engine).
 */
export const daily: DailySchedule<LightUpParams> = {
  firstDay: '2026-11-17',
  levels: [
    { difficulty: EASY, sizes: [5, 5, 6, 6, 6, 7, 7] },
    { difficulty: MEDIUM, sizes: [6, 6, 7, 7, 7, 8, 8] },
    { difficulty: HARD, sizes: [7, 7, 8, 8, 8, 9, 9] },
  ].map(({ difficulty, sizes }) => sizes.map((n) => offered(n, n, difficulty))),
};

/** Text form, the original's full one: "7x7b20s2d0". */
export function encodeParams(params: LightUpParams): string {
  return `${params.w}x${params.h}b${params.blackPercent}s${params.symmetry}d${params.difficulty}`;
}

/**
 * Reads the text form as the original does, starting from the original's
 * default puzzle (7×7, 20% black, 4-way rotational symmetry, Easy), so
 * that a short form such as "10x10" means the same puzzle as there.
 */
export function decodeParams(text: string): LightUpParams {
  const params: LightUpParams = {
    w: 7,
    h: 7,
    blackPercent: 20,
    symmetry: SYMMETRY_ROTATE_4,
    difficulty: EASY,
  };
  let rest = text;
  const number = (): number => {
    const match = /^\d*/.exec(rest)![0];
    rest = rest.slice(match.length);
    return parseInt(match, 10) || 0;
  };

  params.w = number();
  params.h = params.w;
  if (rest.startsWith('x')) {
    rest = rest.slice(1);
    params.h = number();
  }
  if (rest.startsWith('b')) {
    rest = rest.slice(1);
    params.blackPercent = number();
  }
  if (rest.startsWith('s')) {
    rest = rest.slice(1);
    params.symmetry = number();
  } else if (params.symmetry === SYMMETRY_ROTATE_4 && params.w !== params.h) {
    params.symmetry = SYMMETRY_ROTATE_2; // e.g. "18x10": 4-way rotation needs a square
  }
  params.difficulty = EASY;
  if (rest.startsWith('r')) {
    params.difficulty = HARD; // the original's old form
    rest = rest.slice(1);
  }
  if (rest.startsWith('d')) {
    rest = rest.slice(1);
    params.difficulty = number();
  }
  return params;
}

export function validateParams(params: LightUpParams): string | null {
  const { w, h } = params;
  if (w < 2 || h < 2) return 'Width and height must be at least 2';
  if (w * h > 10000) return 'Width times height must not be unreasonably large';
  if (params.blackPercent < 5 || params.blackPercent > 100) {
    return 'Percentage of black squares must be between 5% and 100%';
  }
  if (params.symmetry === SYMMETRY_ROTATE_4 && w !== h)
    return '4-fold symmetry is only available with square grids';
  if (
    (params.symmetry === SYMMETRY_ROTATE_4 || params.symmetry === SYMMETRY_MIRROR_4) &&
    w < 3 &&
    h < 3
  ) {
    return 'Width or height must be at least 3 for 4-way symmetry';
  }
  if (params.symmetry < SYMMETRY_NONE || params.symmetry > SYMMETRY_ROTATE_4)
    return 'Unknown symmetry type';
  if (params.difficulty < EASY || params.difficulty > HARD) return 'Unknown difficulty level';
  if (params.difficulty === HARD && w * h <= 16) return 'Hard puzzles need a grid bigger than 4×4';
  return null;
}
