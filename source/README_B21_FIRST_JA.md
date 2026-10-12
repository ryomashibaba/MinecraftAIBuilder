# MinecraftAIBuilder B21 / M3-C — ここから再開

**今回の新機能はMinecraftを変更しません。** 既存のB20凍結原本404ファイルを引き継いでいます。

1. `docs/B21_M3C_IMPLEMENTATION_NEXT.md` を読む。
2. `node verify-b21-package.mjs` を実行して不変性/ハッシュ/安全条件を確認。
3. 必要なときだけ `node --test tests/step8b-blockscale-b21.test.mjs`（44件の新規差分QA）。
4. 非施工JSONの再生成: `node tools/RUN_B21_OFFLINE.mjs /新しく作るフォルダの絶対パス`（既存パスを指定すると拒否）。
5. `reports/B21_SUMMARY.json` がコンパクトな重要診断。詳細は `reports/B21_BLOCKSCALE_REVIEW.json`。

**実装の実質的な進捗**：ブロック整数格子に合う壁/ドア/階段の仮想候補と相互干渉検出。
**未解決**：314ドアのうち118件の整数格子競合。50床開口は未適用。現行ビルドエンジン統合/材料ID/ワールド座標/実通行性は未証明。

今回の差分QA **44/44 PASS**、関連B18～B20回帰 **95/95 PASS**。全履歴の再回帰は行っていません。

次工程：M3-D（安全な非実行プランナー接続・干渉VETO）→ M4（Windowsワンパスの読み取り専用証拠収集）。
**`NOT PREPARED / BLOCKED`。既存建築・Legacy・凍結証拠の変更禁止、施工未承認。**
