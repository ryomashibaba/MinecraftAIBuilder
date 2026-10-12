# B11 引継ぎ（最初に読む）

1. `docs/STEP8B_B11_IMPLEMENTATION_AND_NEXT.md`：実装内容と未検証条件
2. `reports/B11_LOCAL_REPAIR_REPORT.json`：5候補×6階の静的評価（SHA-256固定）
3. `previews/B11_LOCAL_REVIEW.html`：オフライン比較・未承認レビューJSON保存
4. `runner/step8b-interior-repair-b11.mjs`：廊下端の局所修正候補と干渉スクリーニング
5. `qa/B11_VERIFICATION_SUMMARY.md`：QA証拠と再開方針

読み取り専用バッチ：`node tools/RUN_B11_OFFLINE.mjs <新しく作成する出力先>`。出力先は未作成フォルダのみ。静的JSON・HTMLの2ファイル以外は生成せず、Minecraftには接続しません。

**修正案は未適用。すべて `NOT PREPARED` / `BLOCKED`、施工命令0。**
