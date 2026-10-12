# MinecraftAIBuilder B38 — 再開手順

ZIP最初に `00_START_HERE.md` を読む。次に `docs/B38_LANDING_FLOOR_HEIGHT_AND_EDGE_GATE.md` と `reports/B38_LANDING_FLOOR_HEIGHT_REPORT.json` を確認する。

**B38の実装成果**: 東側2×2候補（5階×A/B）に対して、床4セル保持・長方形被覆・階高整合は確認済み。一方、最上段と東側入口の水平距離は2セルで**直接辺接続ができていない**。10条件すべて未採用・未施工。

実装: `runner/step8b-landing-floor-height-b38.mjs` / `tools/RUN_B38_OFFLINE.mjs`。

QA:
```sh
cd source
node verify-b38-package.mjs
node --test tests/step8b-landing-floor-height-b38.test.mjs
```

新規27/27、関連B35～B37 94/94 PASS。新しい画面・Windows手動操作はなし。次は B39「最上段と踊り場を辺で接続できる階段経路の局所再設計（非施工）」を優先する。

**絶対条件**: 既存建築、Legacy、凍結証拠を変更しない。材料/ワールド座標を推定しない。承認なしの施工はしない。`NOT PREPARED` / `BLOCKED` / BuildPlan.operations=[]。
