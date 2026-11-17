#!/bin/sh
# Builds the original C Light Up generator and records reference puzzles,
# with the original solver's answers, for the TypeScript port's tests.
#
# Usage: tools/c-reference/generate-fixtures.sh [path-to-original-puzzles-repo]
# Needs: gcc, node. Default puzzles path: ../puzzles (sibling folder).

set -e

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
PUZZLES="${1:-$ROOT/../puzzles}"
BUILD="$HERE/build"
OUT="$ROOT/src/games/lightup/testing/reference-puzzles.json"

mkdir -p "$BUILD" "$(dirname "$OUT")"
gcc -O2 -std=c99 -I"$PUZZLES" -o "$BUILD/lightup-reference" \
    "$HERE/lightup-reference.c" \
    "$PUZZLES/lightup.c" "$PUZZLES/combi.c" "$PUZZLES/random.c" \
    "$PUZZLES/malloc.c" "$PUZZLES/misc.c" "$PUZZLES/nullfe.c"

# Parameter sets: every size and difficulty the app offers, the original's
# presets, other symmetries and black percentages, odd shapes, and short
# game IDs (which start from the original's defaults).
PARAMS=""
for n in 5 6 7 8 9 10; do
    for d in 0 1 2; do PARAMS="$PARAMS ${n}x${n}b20s2d$d"; done
done
PARAMS="$PARAMS 7x7b20s4d0 7x7b20s4d1 7x7b20s4d2 14x14b20s2d0 14x14b20s2d1"
PARAMS="$PARAMS 6x6b20s0d1 8x8b30s1d0 9x9b25s3d2 8x8b20s4d1 5x9b20s2d2 12x5b20s2d1"
PARAMS="$PARAMS 3x3b20s0d0 2x2b50s0d0 7x7 10x10 18x10 9x9r"

# Seeds: a fixed mix of short seeds and 15-digit seeds like the app makes.
SEEDS=""
i=1
while [ $i -le 20 ]; do
    SEEDS="$SEEDS $i $((i * 7919))$((i * 104729))31337"
    i=$((i + 1))
done

TSV="$BUILD/reference.tsv"
: > "$TSV"
for p in $PARAMS; do
    "$BUILD/lightup-reference" "$p" $SEEDS >> "$TSV"
done

node -e '
const fs = require("fs");
const rows = fs.readFileSync(process.argv[1], "utf8").trim().split(/\r?\n/)
  .map(l => { const [params, seed, description, solution] = l.split("\t");
              return { params, seed, description, solution }; });
fs.writeFileSync(process.argv[2], JSON.stringify(rows, null, 1) + "\n");
console.log(rows.length + " reference puzzles written to " + process.argv[2]);
' "$TSV" "$OUT"
