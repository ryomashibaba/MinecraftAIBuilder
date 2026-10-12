# MinecraftAIBuilder B36 引継ぎ — 2026-10-11

1. ZIPルートの `00_START_HERE.md` を最初に読む。
2. `docs/B36_STAIR_SECTION_AND_LANDING.md` と `reports/B36_SUMMARY.json` を読む。
3. `node verify-b36-package.mjs` で旧B35全602ファイルの原本照合、B36レポート再現性、QA証拠と成果物の整合性を確認。
4. 工程B36は階段移設 `(0,+1)` の局所断面/踊り場出入口の非施工診断のみ。実プランナーを実行せず、材料・ワールド座標・操作は作らない。
5. 前進：A/Bの入口候補を分離し、B21の仮想階段段・頭上空間を移動先へ投影。未検証：実踊り場、実壁、荷重支持、実開口、Minecraftの通行性。B案を自動採用しない。

**`NOT_PREPARED` / 9ゲートBLOCKED / BuildPlan.operations=[] / Windows操作0回**。
