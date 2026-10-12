# B14 の再開手順

最初に `docs/STEP8B_B14_IMPLEMENTATION_AND_NEXT.md` と `reports/B14_INPUT_CONTRACT_REPORT.json` を読む。

- B13の内容はすべて保持し、B14新規は `runner/step8b-interior-modules-b14.mjs`, `runner/step8b-visual-b14.mjs`, `tools/RUN_B14_OFFLINE.mjs` とテスト。
- `node verify-b14-package.mjs` でハッシュ・原本・報告・QA・HTML一致を確認。
- 再生成時に限り、既存フォルダやプロジェクト内でない新規出力先を指定して `node tools/RUN_B14_OFFLINE.mjs <新規外部フォルダ>` を実行。出力先は既存・ソース内不可。
- Windows実機操作はこの工程では0回。実エンジン・Minecraft・Bridgeへの接続や施工を行っていない。
- 前工程B13の335/335 PASSは凍結証拠として保持。B14テストは別集計。
- `NOT PREPARED / BLOCKED / commandCount=0 / operations=[]`。
