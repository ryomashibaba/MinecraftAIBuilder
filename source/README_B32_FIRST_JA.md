# B32 — まずここから

1. `../00_START_HERE.md` と `docs/B32_FLOOR_EMITTER_SEAM_AND_RISK.md` を読む。
2. `node verify-b32-package.mjs` で凍結済みB31の553ファイル・B32レポート・安全契約を一括照合する。
3. 必要な差分QAは `node --test tests/step8b-floor-seam-b32.test.mjs`。旧テストはB29/B30/B31のみ再実行済み。
4. 診断データは `reports/B32_FLOOR_SEAM_LEDGER.json`、簡易集計は `reports/B32_SUMMARY.json`。

**重要:** 本物の建築プランナーを修正していない。`dev/general-building-planner.B32_GUARDED_DEV_COPY.txt` は常時エラーで停止する開発用ソース表示に過ぎず、実行・配布・施工へ転用しないこと。

新しく判明した外周隣接の床開口候補5セルは要レビュー。基礎・屋根・外壁のマスク入力は今回の独立計算で不変、物理構造の安全性は未証明。

Windows操作0回。元の建築・Legacy・凍結証拠は全て変更禁止。`NOT PREPARED / BLOCKED / 施工命令0件`。
