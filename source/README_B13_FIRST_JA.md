# B13 最初に読む — 非施工モジュール契約レビュー

1. `docs/STEP8B_B13_IMPLEMENTATION_AND_NEXT.md` を確認。
2. `reports/B13_MODULE_CONTRACT_REPORT.json` と `previews/B13_MODULE_CONTRACT_REVIEW.html` を見る。
3. `node verify-b13-package.mjs` で原本、QA証拠、生成HTMLを検証。
4. 再出力時のみ `node tools/RUN_B13_OFFLINE.mjs <新規の外部出力フォルダ>` を実行。

B12までの全原本を変更せず継承。今回の検証はLinux/Node.js 22・Chromiumで実施。実エンジンやMinecraftへ接続していない。

**`NOT PREPARED` / `BLOCKED` / operations=[] / commandCount=0。**
