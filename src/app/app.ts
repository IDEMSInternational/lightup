import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PuzzleHome } from '@studio/container/puzzle-home/puzzle-home';
import { PuzzleNotice } from '@studio/container/puzzle-notice/puzzle-notice';
import { PuzzleScreens } from '@studio/container/puzzle-screens';
import { PuzzleShell } from '@studio/container/puzzle-shell/puzzle-shell';
import { PuzzleStage } from '@studio/container/puzzle-stage/puzzle-stage';
import { PuzzleSplash } from '@studio/container/puzzle-splash/puzzle-splash';
import { PuzzleTutorial } from '@studio/container/puzzle-tutorial/puzzle-tutorial';
import { LightUpBoard } from '../games/lightup/board/lightup-board';
import { lightUpGame } from '../games/lightup/lightup-game';
import { lightUpTutorial } from '../games/lightup/tutorial';

import { version } from '../../package.json';

@Component({
  selector: 'app-root',
  imports: [
    PuzzleHome,
    PuzzleNotice,
    PuzzleShell,
    PuzzleStage,
    PuzzleSplash,
    PuzzleTutorial,
    LightUpBoard,
  ],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly game = lightUpGame;
  /** Home page, daily puzzles, Beat the clock, timed play and the tutorial. */
  protected readonly screens = new PuzzleScreens(lightUpGame, lightUpTutorial, version);
}
