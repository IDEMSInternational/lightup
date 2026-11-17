import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LEGAL_VERSION } from '@studio/container/legal';
import { PuzzleScreens } from '@studio/container/puzzle-screens';
import { LightUpMove } from '../games/lightup/moves';
import { LightUpParams } from '../games/lightup/params';
import { LightUpState } from '../games/lightup/state';
import { App } from './app';

type Screens = PuzzleScreens<LightUpParams, LightUpState, LightUpMove, unknown>;

/** The ladder in a game with difficulties: it asks for one first. */
describe('Ladder (Light Up)', () => {
  let fixture: ComponentFixture<App>;
  let screens: Screens;
  let element: HTMLElement;

  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('lightup.noticeSeen', LEGAL_VERSION);
    localStorage.setItem('lightup.tutorialSeen', '1');
    history.replaceState(null, '');
    await TestBed.configureTestingModule({ imports: [App] }).compileComponents();
    fixture = TestBed.createComponent(App);
    screens = (fixture.componentInstance as unknown as { screens: Screens }).screens;
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  const text = (selector: string) => element.querySelector(selector)?.textContent?.trim();
  const texts = (selector: string) =>
    Array.from(element.querySelectorAll(selector), (b) => b.textContent!.trim());
  async function openSheet(): Promise<void> {
    screens.openChallenges();
    await fixture.whenStable();
    (element.querySelectorAll('puzzle-home .card button.primary')[2] as HTMLButtonElement).click();
    await fixture.whenStable();
  }

  it('asks for Easy, Medium or Hard, then climbs every size at it', async () => {
    localStorage.setItem('lightup.ladder.best', JSON.stringify({ 2: 754_000 }));
    await openSheet();
    expect(text('.chooser p')).toBe('Choose a difficulty');
    expect(texts('.chooser .level .name')).toEqual(['Easy', 'Medium', 'Hard']);
    expect(texts('.chooser .level .state')).toEqual([
      'No best time yet',
      'No best time yet',
      'Your best time: 12:34',
    ]);

    (element.querySelectorAll('.chooser .level')[2] as HTMLButtonElement).click(); // Hard
    await fixture.whenStable();
    const ladder = screens.ladder()!;
    expect(text('h1')).toBe('Ladder');
    expect(ladder.difficultyName).toBe('Hard');
    expect(ladder.label()).toBe('5×5 Hard');
    expect(element.querySelectorAll('.rungs li').length).toBe(6); // 5×5 to 10×10
  });

  it('offers to continue the unfinished ladder, or start again at any difficulty', async () => {
    screens.openLadder(0, true);
    await fixture.whenStable();
    const popped = new Promise((resolve) =>
      window.addEventListener('popstate', resolve, { once: true }),
    );
    screens.goHome();
    await popped;
    await openSheet();
    expect(text('.chooser .level .size')).toBe('Easy · Size 1 of 6');
    expect(text('.chooser p')).toBe('Or start again');
    expect(texts('.chooser .level .name')).toEqual(['Continue', 'Easy', 'Medium', 'Hard']);
  });
});
