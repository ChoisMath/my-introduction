#!/usr/bin/env bash
# Remotion 렌더 → web/public 으로 복사. 배경음악은 video/public/audio/bgm.mp3 가 있을 때만 넣는다.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/video"
mkdir -p out "$ROOT/web/public/video" "$ROOT/web/public/img"

if [ -f public/audio/bgm.mp3 ]; then BGM='"audio/bgm.mp3"'; else BGM='null'; echo "no bgm.mp3 — rendering without music"; fi

npx remotion render src/index.ts Intro-ko out/intro-ko.mp4 --codec h264 --crf 23 --props="{\"locale\":\"ko\",\"bgm\":$BGM}"
npx remotion render src/index.ts HeroLoop out/hero-loop.mp4 --codec h264 --crf 28
npx remotion render src/index.ts HeroLoop out/hero-loop.webm --codec vp8 --crf 34
npx remotion still src/index.ts OgImage out/og.png

ffmpeg -y -loglevel error -ss 5 -i out/hero-loop.mp4 -frames:v 1 -q:v 3 out/hero-poster.jpg

cp out/intro-ko.mp4 out/hero-loop.mp4 out/hero-loop.webm out/hero-poster.jpg "$ROOT/web/public/video/"
cp out/og.png "$ROOT/web/public/img/og.png"

limit() { local f=$1 max=$2; local size; size=$(stat -f%z "$f"); [ "$size" -le "$max" ] || { echo "too big: $f ($size bytes > $max) — raise --crf in scripts/render-video.sh"; exit 1; }; }
limit "$ROOT/web/public/video/intro-ko.mp4" 20971520
limit "$ROOT/web/public/video/hero-loop.mp4" 5242880
limit "$ROOT/web/public/video/hero-loop.webm" 5242880
echo "rendered → web/public/video, web/public/img/og.png"
