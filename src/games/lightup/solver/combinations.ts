/**
 * Every way of choosing r of the indices 0 to n-1, in the order of the
 * original's combi.c: ascending index lists in lexicographic order, e.g.
 * r = 2, n = 3 gives [0, 1], [0, 2], [1, 2].
 */
export function* combinations(r: number, n: number): Generator<number[]> {
  if (r > n || n < 1) throw new RangeError(`can't choose ${r} of ${n}`);
  const a = Array.from({ length: r }, (_, i) => i);
  for (;;) {
    yield a.slice();
    let i = r - 1;
    while (i >= 0 && a[i] === n - r + i) i--;
    if (i < 0) return;
    a[i]++;
    for (let j = i + 1; j < r; j++) a[j] = a[i] + j - i;
  }
}
