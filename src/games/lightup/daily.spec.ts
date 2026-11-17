import { dailyPuzzle } from '@studio/engine/daily';
import { GameSession } from '@studio/engine/game-session';
import { lightUpGame } from './lightup-game';

describe('Light Up daily puzzles', () => {
  // A promise to players: everyone gets the same puzzle on the same day,
  // whatever the version. If this fails, the generator, the schedule or
  // the date rule has changed the daily puzzles.
  it.each([
    ['2026-11-23', 0, '5x5b20s2d0:c0fBcBf3c'], // Monday, Easy
    ['2026-11-23', 1, '8x8b20s2d0:bBb2Bj2BBcBg0BgBc2B1jBBb1b'], // Monday, Medium: a big Easy one
    ['2026-11-23', 2, '8x8b20s2d1:b0fBe1cBfBd11d3f1c0eBf1b'], // Monday, Hard: a big Medium one
    ['2026-11-26', 1, '6x6b20s2d1:b0c2b1c2hBc1bBc0b'], // Thursday, Medium
    ['2026-11-26', 2, '7x7b20s2d2:a2a0jBd1b0c1b2d1j0a1a'], // Thursday, Hard
    ['2026-11-29', 0, '7x7b20s2d0:2bBaBf1fBi1fBfBa2bB'], // Sunday, Easy
    ['2026-11-29', 1, '8x8b20s2d1:bB1d0d0dB1xB1d3d2dBBb'], // Sunday, Medium
    ['2026-11-29', 2, '9x9b20s2d2:Ba0cBj0f1cB1b1a0k2a1b10c1fBj2cBa1'], // Sunday, Hard
  ])('%s at level %i is always %s', (date, level, expected) => {
    const puzzle = dailyPuzzle('lightup', lightUpGame.daily!, date, level)!;
    const session = new GameSession(lightUpGame, puzzle.params, puzzle.seed);
    expect(`${lightUpGame.encodeParams(session.params)}:${session.description}`).toBe(expected);
  });

  it('numbers the puzzles from launch day, Tuesday 17 November 2026', () => {
    expect(dailyPuzzle('lightup', lightUpGame.daily!, '2026-11-17', 0)?.number).toBe(1);
  });
});
