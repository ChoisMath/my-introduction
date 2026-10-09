#!/usr/bin/env bash
# asset/ 원본 → web/public/img (+ video/public/img 복사). macOS sips 와 Homebrew cwebp 사용.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/asset"
OUT="$ROOT/web/public/img"
APP="$ROOT/web/src/app"
mkdir -p "$OUT/books" "$OUT/projects" "$ROOT/video/public" "$APP"

command -v cwebp >/dev/null || { echo "cwebp not found: brew install webp"; exit 1; }

cwebp -quiet -q 85 -resize 600 0 "$SRC/최재혁_증명사진.jpg" -o "$OUT/photo.webp"
sips -s format png -Z 512 "$SRC/최재혁_픽토그램.jpg" --out "$OUT/pictogram.png" >/dev/null
cwebp -quiet -q 90 -resize 512 0 "$SRC/최재혁_픽토그램.jpg" -o "$OUT/pictogram.webp"
sips -s format png -Z 180 "$SRC/최재혁_픽토그램.jpg" --out "$APP/apple-icon.png" >/dev/null
sips -s format png -Z 64  "$SRC/최재혁_픽토그램.jpg" --out "$APP/icon.png" >/dev/null

cwebp -quiet -q 85 -resize 600 0 "$SRC/지오지브라_중학교_수학_이미지.png"   -o "$OUT/books/geogebra-middle.webp"
cwebp -quiet -q 85 -resize 600 0 "$SRC/지오지브라_고등학교_수학_이미지.png" -o "$OUT/books/geogebra-high.webp"
cwebp -quiet -q 85 -resize 600 0 "$SRC/에이전틱AI학교교육활용법_이미지.png"  -o "$OUT/books/agentic-ai.webp"

# 목업: 실물 png/jpg 가 있으면 webp 로, 없으면 자리표시 svg 를 그대로 복사
for id in choisnote choisclass posanmeal selfstudy mathcoach; do
  real=""
  for ext in png jpg jpeg; do [ -f "$SRC/projects/$id.$ext" ] && real="$SRC/projects/$id.$ext"; done
  if [ -n "$real" ]; then
    cwebp -quiet -q 85 -resize 1200 0 "$real" -o "$OUT/projects/$id.webp"
    rm -f "$OUT/projects/$id.svg"
    echo "mockup $id: real image → remember to point content/*/projects.json mockup at /img/projects/$id.webp"
  else
    cp "$SRC/projects/$id.svg" "$OUT/projects/$id.svg"
  fi
done

rsync -a --delete "$OUT/" "$ROOT/video/public/img/"
echo "assets ready → $OUT and video/public/img"
