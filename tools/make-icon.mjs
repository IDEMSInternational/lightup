// Draws Light Up's app icon: a light next to a black "1" square, shining
// along its row and column, on the board's grid, in the game's own colours.
//
// Usage: node tools/make-icon.mjs   (then: npm run app-images)
import { resolve } from 'node:path';
import { makeAppIcon } from '../games-common-core/tools/make-app-icon.mjs';

// Colours from theme.scss and lightup-board.scss.
const BOARD = '#fffdf8';
const GRID = '#d9d3c5';
const LIT = '#fff1b8';
const BULB = '#f7c531';
const BULB_EDGE = '#a87f00';
const GLOW = 'rgb(247 197 49 / 0.35)';
const BLACK_SQUARE = '#33363d';
const ON_BLACK = '#ffffff';

/** The icon in board units, centred on the black square and the light, (0, 0) to (2, 1). */
function svg(zoomOut) {
  const half = 1.3 * zoomOut;
  const [cx, cy] = [1, 0.5]; // the middle of the black square and the light
  const grid = [];
  for (let i = -4; i <= 7; i++) {
    grid.push(`<line x1="${i}" y1="-5" x2="${i}" y2="7"/>`, `<line x1="-5" y1="${i}" x2="8" y2="${i}"/>`);
  }
  // The light at (1, 0) lights its column, and its row to the right (the black square stops it on the left).
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${cx - half} ${cy - half} ${2 * half} ${2 * half}">
  <rect x="-5" y="-5" width="13" height="12" fill="${BOARD}"/>
  <rect x="1" y="-5" width="1" height="12" fill="${LIT}"/>
  <rect x="1" y="0" width="7" height="1" fill="${LIT}"/>
  <g stroke="${GRID}" stroke-width="0.025">${grid.join('')}</g>
  <rect x="0.04" y="0.04" width="0.92" height="0.92" rx="0.14" fill="${BLACK_SQUARE}"/>
  <text x="0.5" y="0.53" font-family="system-ui, 'Segoe UI', Roboto, sans-serif" font-size="0.5" font-weight="650"
    text-anchor="middle" dominant-baseline="middle" fill="${ON_BLACK}">1</text>
  <circle cx="1.5" cy="0.5" r="0.4" fill="${GLOW}"/>
  <circle cx="1.5" cy="0.5" r="0.27" fill="${BULB}" stroke="${BULB_EDGE}" stroke-width="0.05"/>
</svg>`;
}

makeAppIcon(resolve(import.meta.dirname, '..'), svg, BOARD);
