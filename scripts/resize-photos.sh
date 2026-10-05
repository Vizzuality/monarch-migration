#!/bin/sh
# Resizes the original photos into the two sizes an Album uses:
# the lightbox photo and the card thumbnail. macOS only (sips).
#   scripts/resize-photos.sh <source dir> <name>=<source file> ...
set -eu

src=$1
shift
out=$(dirname "$0")/../src/assets/photos
mkdir -p "$out"

for pair in "$@"; do
  name=${pair%%=*}
  file=$src/${pair#*=}
  sips -s format jpeg -s formatOptions 78 -Z 1600 "$file" --out "$out/$name.jpg" >/dev/null
  sips -s format jpeg -s formatOptions 80 -Z 240 "$file" --out "$out/$name-thumb.jpg" >/dev/null
done
