# B101への再開方法

1. ZIPを展開し、`B100_START_HERE_FIRST.md` を必ず最初に読む。次に `B100_MAIN_SUMMARY_JA.md` と `B100_QA_SUMMARY_JA.md`。
2. `source/parallel/b100/main/b100-universal-design.mjs` と `compile-b100.mjs`、`B100_GENERIC_DESIGN_REPORT.json` を確認。
3. レポートの再生成：`cd source` → `node --experimental-vm-modules parallel/b100/main/compile-b100.mjs --write`。
4. HTML生成：`python parallel/b100/main/render-b100.py`。生成された `B100_UNIVERSAL_DESIGN_REVIEW.html` をブラウザーで開く。サーバーは不要。
5. B100検証：`node --experimental-vm-modules --test parallel/b100/main/compile-b100.test.mjs`。
6. B92〜B99の回帰検証は各工程の `parallel/b92/main/compile-b92.test.mjs` から `parallel/b99/main/compile-b99.test.mjs` までを列挙し `node --experimental-vm-modules --test ...`。ZIP同封の `B100_TESTS.tap`、`B100_REGRESSION.tap` も参照。
7. 次工程の新規コードは `source/parallel/b101/main/` と `B101_*` のみへ追加。原本変更禁止。`B100_ORIGINAL_FILE_PROTECTION.json`、`B100_INTEGRITY.json` で既存ファイルを照合。
8. **B101は室の必要数と機能の制約、実出口までの経路、3Dの開口、Educationブロックパレット整合の読み取り専用検査**を進める。設計をMinecraftワールドへ送信しない。
9. `NOT_PREPARED`、9 Gate BLOCKED、旧296室の候補未承認、旧18室保留、新規施工・世界接続0を維持する。単に2D候補が成立しただけで世界施工コマンドへ変換しない。
