#!/usr/bin/env bash
# 네오브루탈리즘 10초 스팅(video/sting, HyperFrames) → video/out/sting-{ko,en}.mp4
# 사운드트랙은 코드로 합성(audio/build-soundtrack.mjs)하므로 외부 음원이 없다.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/video/sting"
mkdir -p "$ROOT/video/out"

for locale in ko en; do
  node audio/build-soundtrack.mjs --locale "$locale"
  node audio/verify-cues.mjs "$locale" | tail -1
done

npx --yes hyperframes@0.8.145 render . --quality delivery --fps 30 --quiet --output "$ROOT/video/out/sting-ko.mp4"
npx --yes hyperframes@0.8.145 render . --quality delivery --fps 30 --quiet --variables-file vars/en.json --output "$ROOT/video/out/sting-en.mp4"
echo "sting rendered → video/out/sting-{ko,en}.mp4"
