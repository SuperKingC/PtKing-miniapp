#!/usr/bin/env bash
# 并发逐张重出满幅出血版:每张用自己当前的 -clay.jpg 作 --ref 锁设计,只改构图。
# kit 的 --ref 是全局的,所以按卡单独调用 gen.mjs(1 条提示词 + 1 张参考图);用后台并发跑满。
set -u
cd "$(dirname "$0")/../../.."   # 仓库根

PROMPTS=art/prompts-tarot-cards-bleed.txt
OUT=art/generated-art/tarot-cards-bleed
CARDS=art/generated-art/tarot/cards
TMP=art/generated-art/tarot-cards-bleed/_prompts
LOGS=art/generated-art/tarot-cards-bleed/_logs
mkdir -p "$OUT" "$TMP" "$LOGS"

CARDS_LIST="death high-priestess the-devil the-emperor the-fool the-hanged-man the-hermit the-lovers the-star the-sun the-tower the-world wheel-of-fortune"
PARALLEL=${PARALLEL:-4}

run_one() {
  local name="$1"
  local ref="$CARDS/${name}-clay.jpg"
  [ -f "$ref" ] || { echo "!! missing ref $ref"; return; }
  grep -E "^tarot-clay-${name}\|" "$PROMPTS" > "$TMP/$name.txt"
  [ -s "$TMP/$name.txt" ] || { echo "!! no prompt for $name"; return; }
  node ../miniapp-kit/art/gen.mjs -c art.config.json -p "$TMP/$name.txt" \
    --out "$OUT" --ratio 2:3 --ref "$ref" > "$LOGS/$name.log" 2>&1
  echo "done $name rc=$?"
}

i=0
for name in $CARDS_LIST; do
  run_one "$name" &
  i=$((i+1))
  if [ $((i % PARALLEL)) -eq 0 ]; then wait; fi
done
wait
echo "ALL DONE"
grep -h -E "✓|✗" "$LOGS"/*.log
