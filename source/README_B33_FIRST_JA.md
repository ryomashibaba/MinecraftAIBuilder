# B33 — 再開手順

1. `../00_START_HERE.md` → `docs/B33_PINNED_RECTANGLE_FIXTURE_AND_CORE_OPTIONS.md` の順に確認する。
2. `node verify-b33-package.mjs` でB32原本566ファイルの無変更、B33幾何レポート再生成、QA証拠を一括チェック。
3. 変更後は `node --test tests/step8b-emitter-fixture-b33.test.mjs` の差分QAを実行。必要に応じてB31/B32の80件を回帰。
4. `reports/B33_RECTANGLE_EMITTER_LEDGER.json` は30階×元・候補の長方形マスク、`reports/B33_SUMMARY.json` は集計。どちらも非施工。

**確認済み:** 12,778→12,728セル、分解58→128長方形、5件は2D閉じた中庭状空洞側の境界、6件の未承認階段軸移設候補。実際の支持、階段の上下接続、材料、向き、ワールド配置は未検証。

**禁止:** 元の建築/Legacy/凍結証拠の変更、本番エンジンへのパッチ適用、Minecraft施工、承認フラグの変更。

`NOT PREPARED / BLOCKED / BuildPlan.operations=[]`
