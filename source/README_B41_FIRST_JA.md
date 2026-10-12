# MinecraftAIBuilder B41 — 開発再開ガイド

最初に `../00_START_HERE.md`、次に `docs/B41_MACRO_STAIR_STRATEGY_AND_SAFETY.md`、最後に `reports/B41_SUMMARY.json` を読む。

B41の重要な転換：3×3の中で4段を無理に曲げ続ける設計から、階段室を廊下側へ1セル広げる直線4段案まで検査対象にした。対象は集合住宅の5階間のみ。既存の44名目案は上昇時方向転換、うち14案で平面セル再訪（高さ別の可能性あり）。直線案は原形状との静的重なりは0で、5階間とも床数維持。ただし廊下予約・床開口変更が必要で施工未承認。

`runner/step8b-stair-shape-integration-b41.mjs` が純粋な非施工コード。
`node --test tests/step8b-stair-redesign-b41.test.mjs` で新規33件、
`node --test tests/step8b-emitter-fixture-b33.test.mjs tests/step8b-stair-route-b39.test.mjs tests/step8b-crosslevel-b40.test.mjs` で関連96件。
`node verify-b41-package.mjs` は全ファイルハッシュと凍結B40ファイルの不変性、B41レポートの再現性を確認する。

Windows操作：0回。エンジン実行0回。施工0件。原本保全・`NOT PREPARED`と9ゲート全BLOCKEDを維持。
