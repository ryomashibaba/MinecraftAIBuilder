# MinecraftAIBuilder — Step8B/B28: M4.4 実機証拠統合

1. `../00_START_HERE.md` に続いて `docs/B28_M4_4_REAL_EVIDENCE_AND_NEXT.md` を確認。
2. 原本を検証：`node verify-b27-package.mjs`。既存ファイル499件を変更しない。
3. 今回の実装：`runner/step8b-m4-reconcile-b28.mjs` と `tools/AUDIT_B28_REAL_WINDOWS_EVIDENCE.mjs`。
4. オフラインテスト：`node --test tests/step8b-m4-real-evidence-b28.test.mjs`（28件）、その他の関連テスト102件。
5. 再計算するときのみ：`node tools/AUDIT_B28_REAL_WINDOWS_EVIDENCE.mjs <B27実機JSONの絶対パス> <新規JSON出力先の絶対パス>`。

B27実機ログはB28に同梱した匿名集計JSONを使用。生のWindowsソースZIP、材料詳細、建築地点や機密情報は同梱しない。

**今回ユーザーのWindows再操作は不要。** 9ハッシュ照合済みで、材料データの過去966件も同一SHA経由で復元済み。しかし、実機稼働状態と施工可能性を証明したわけではない。9項目のゲートはすべて閉じたまま。

`NOT PREPARED / BLOCKED / BuildPlan.operations=[] / commandCount=0 / Legacy and frozen evidence unchanged`
