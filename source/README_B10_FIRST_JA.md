# MinecraftAIBuilder Step8B/B10 — 最初に読む

1. `docs/STEP8B_B10_IMPLEMENTATION_AND_NEXT.md`：B10の実装と限界。
2. `previews/B10_3D_STATIC_REVIEW.html`：オフライン立体レビュー（凍結5案＋Pareto14形状）。
3. `reports/B10_CONTRACT_REPORT.json`：新しい内部配置契約・差分結果。
4. `runner/step8b-interior-contract-b10.mjs`：読み取り専用の概念vsエンジン予測照合。
5. `qa/B10_VERIFICATION_SUMMARY.md`：270件PASS、残るHOLD条件。

単独生成（任意）：`node tools/RUN_B10_OFFLINE.mjs <NEW_EMPTY_OUTPUT_DIRECTORY>`。
出力先は未作成ディレクトリのみで、書き込むのはJSONとHTMLの2ファイルのみです。通常は添付済みHTMLを見るだけで十分です。

**禁止：既存建築・Legacy・凍結証拠の変更、新規施工、材料や世界座標の推測補完。NOT PREPARED / BLOCKED / operations=[] / commandCount=0。**
