# MinecraftAIBuilder Step 8B/B17 — 最初に読む

## 現在地 / 範囲

B16までのレビュー蓄積を、実際の建築エンジンへの受け渡しを見据えた **B17 中間表現（IR）** に統一した。これは **施工プランではない**。既存の建築・Legacy設定・凍結証拠は一切変更していない。

- 先に `docs/B17_DELIVERY_AND_MILESTONES.md` を読む。
- 新しい機能は `runner/step8b-integration-ir-b17.mjs`、検証は `tests/step8b-integration-ir-b17.test.mjs`。
- 作成済み出力：`reports/B17_INTERIOR_INTEGRATION_IR.json`（概念境界・ドア・階段予約等）、`reports/B17_READINESS_SUMMARY.json`。
- ソースハッシュ監査は5ファイルの既知SHA-256を照合したが、実稼働エンジンへの接続・実行は一切していない。IRの `snapshotSignals` を見る。
- 従来の `previews/B16_CONNECTIVITY_REVIEW.html` は保存済み。B17ではレビューUIを新設しない。

## 安全契約

`NOT PREPARED` / `BLOCKED` / `commandCount=0` / `operations=[]` / `worldCoordinates=null` / `materialIds=[]`。

Minecraft / Bridge / Windows / 実エンジンに接続していない。ユーザー未承認の新規施工は絶対に実施しない。

## QAと再生成

`node --test tests/step8b-integration-ir-b17.test.mjs`

任意：既存データを検証した新しい外部フォルダへのオフライン再生成のみ可能。

`node tools/RUN_B17_OFFLINE.mjs <存在しない外部フォルダ> [Windowsソーススナップショットの展開フォルダ]`

本ツールは出力先の上書きとソース内出力を拒否。古い原本のファイルハッシュは `docs/B16_ORIGINAL_FILE_SHA256_B17.json` に保存。`node verify-b17-package.mjs` で改変を検出。
