import { TestBed } from '@angular/core/testing';
import { whiteSquares } from '../games/lightup/testing/squares';
import { App } from './app';

/**
 * Light Up in the shared app. The shared screens' own tests are in
 * games-common-core, beside the code in src/container, and run with these.
 */
describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    history.replaceState(null, ''); // the home page
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('renders a Light Up board inside the puzzle shell', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toContain('Light Up');
    expect(element.querySelector('lightup-board svg')).toBeTruthy();
    expect(element.querySelectorAll('.black').length).toBeGreaterThan(0);
    expect(element.querySelector('puzzle-splash img')?.getAttribute('src')).toBe(
      'studio/idems-games-logo.jpg',
    );
  });

  it('has a Thinking switch whose dotted lights can be kept or discarded', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance as unknown as {
      screens: {
        endTutorial(): void;
        openFreePlay(): void;
        play(): { move(m: unknown): void; state(): { tentative: Uint8Array } };
      };
    };
    app.screens.endTutorial();
    app.screens.openFreePlay();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const buttons = () =>
      Array.from(element.querySelectorAll('.thinking button')).map((b) => b.textContent?.trim());

    expect(buttons()).toEqual([]); // Keep and Discard appear only while thinking
    (element.querySelector('.thinking input[role="switch"]') as HTMLInputElement).click();
    await fixture.whenStable();
    expect(buttons()).toEqual(['Keep', 'Discard']);

    const at = whiteSquares(app.screens.play()!.state() as never)[0];
    app.screens.play()!.move({ kind: 'light', at, tentative: true });
    await fixture.whenStable();
    expect(element.querySelector('lightup-board .light.tentative')).toBeTruthy();

    (element.querySelectorAll('.thinking button')[1] as HTMLButtonElement).click(); // Discard
    await fixture.whenStable();
    expect(element.querySelector('lightup-board .light')).toBeNull();
  });
});
