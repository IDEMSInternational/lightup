/**
 * Text form of a puzzle, compatible with the original collection, row by
 * row: "B" is a black square, "0" to "4" a black square with that number,
 * and a letter a run of white squares (a = 1 ... z = 26).
 * Example: "b1B" = 2 white squares, a black 1, a black square.
 *
 * In the decoded form each square is WHITE, BLACK, or its number (0 to 4).
 */

export const WHITE = -2;
export const BLACK = -1;

export function encodeDescription(squares: ArrayLike<number>): string {
  let text = '';
  let run = 0;
  for (let i = 0; i < squares.length; i++) {
    const square = squares[i];
    if (square === WHITE) {
      if (run === 26) {
        text += 'z';
        run = 0;
      }
      run++;
      continue;
    }
    if (run) text += String.fromCharCode(96 + run);
    run = 0;
    text += square === BLACK ? 'B' : String(square);
  }
  if (run) text += String.fromCharCode(96 + run);
  return text;
}

/** Returns an error message, or null if `text` describes a grid of `area` squares. */
export function validateDescription(area: number, text: string): string | null {
  let i = 0;
  let p = 0;
  for (; i < area; i++) {
    const c = text[p];
    if (c === undefined) return 'Game description shorter than expected';
    if (c >= 'a' && c <= 'z') i += c.charCodeAt(0) - 97;
    else if (!(c === 'B' || (c >= '0' && c <= '4')))
      return 'Game description contained unexpected character';
    p++;
  }
  if (p < text.length || i > area) return 'Game description longer than expected';
  return null;
}

/** Decodes a valid description into its squares. */
export function decodeDescription(area: number, text: string): Int8Array {
  const error = validateDescription(area, text);
  if (error) throw new Error(error);
  const squares = new Int8Array(area).fill(WHITE);
  let i = 0;
  for (const c of text) {
    if (c >= 'a' && c <= 'z') i += c.charCodeAt(0) - 96;
    else squares[i++] = c === 'B' ? BLACK : Number(c);
  }
  return squares;
}
