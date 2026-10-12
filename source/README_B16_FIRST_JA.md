# MinecraftAIBuilder B16 — 最初に読む

1. `docs/STEP8B_B16_IMPLEMENTATION_AND_NEXT.md` と `reports/B16_CONNECTIVITY_REPORT.json` を確認。
2. `node verify-b16-package.mjs` で、B15原本・レポート・HTML・QA証拠の不変性を検証。
3. レビュー専用UI: `previews/B16_CONNECTIVITY_REVIEW.html`（ブラウザ単独動作、通信不要）。
4. 生成をやり直す場合だけ `node tools/RUN_B16_OFFLINE.mjs <新しい外部フォルダ>`。既存フォルダ上書き禁止。
5. Windows追加操作は不要。Minecraft、Bridge、実稼働エンジンには一切接続していない。

## 安全契約

- **NOT PREPARED / BLOCKED / operations=[] / commandCount=0**。施工は未承認。
- 既存建築、Legacy設定、凍結証拠、B15以前のファイルを変更禁止。
- 30階の4近傍廊下グラフとドア点314件は**概念レベル**。物理的通行性・避難安全性・階段の使用可能性は未検証。
- オフィス02の廊下端18セルは非適用のレビュー補正のみ。外形123セル差分は未解決。
