# MinecraftAIBuilder — Step 8B/B4.3 + B4.4 + B5 引継ぎ

**最初に `docs/STEP8B_B45_IMPLEMENTATION_AND_NEXT.md` を読むこと。**

## 現在の状態

- 完了: B4.3 実機証拠の時系列照合器、B4.4 異常/偽装/プライバシー検証、B5 3用途の施工前チェックマトリックス。
- Linuxのオフラインで **173/173 PASS / FAIL 0 / SKIP 0**（Step8A系80件＋Step8B系93件）。
- B4.1のWindows実機ログを入力したbaseline-onlyレポートは生成済み。B4.2の新Windowsログは**まだ無い**。
- 既存建築/Legacy/凍結証拠は不変。**新規施工 NOT PREPARED**、施工命令0件。

## 同梱

- `runner/step8b-evidence-b43.mjs` / `runner/step8b-readiness-b5.mjs`: 新規非実行判定器。
- `tools/RUN_B43_B5_OFFLINE.mjs`: B4.1 + 任意B4.2 を1回のオフラインコマンドで比較し、2レポート出力。
- `tools/COLLECT_WINDOWS_B42_READONLY.ps1`: Windowsの1回操作用コレクター。B4.2原本をそのまま保持、**Windows実機で未検証**。
- `reports/B43_BASELINE_ONLY_ASSESSMENT.json` / `reports/B5_BASELINE_ONLY_READINESS.json`。
- `tests/step8b-evidence-b43.test.mjs`, `tests/step8b-guardrails-b44.test.mjs`, `tests/step8b-readiness-b5.test.mjs` とQAログ。

## 続き

B4.2 Windows実機収集JSONを受け取れば、B4.3の本当の時系列比較を実施できる。B5判定も自動更新する。**Nodeプロセス・ポートのヒントだけで実行同一性が証明されたとはみなさない。** 施工承認は依然別ゲート。

`FILE_SHA256.json` と `verify-package.mjs` でバンドル整合性確認可能。生WindowsソースZIP、B4統合大容量ZIPは同梱しない。
