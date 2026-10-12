# MinecraftAIBuilder Step 8B/B42 — 最初に読む

1. `../00_START_HERE.md` → `docs/B42_MACRO_INTEGRATION_AND_UNRESOLVED.md` → `reports/B42_SUMMARY.json` → `reports/B42_MACRO_STAIR_MODULE.json`
2. 今回は**直線階段案に必要な廊下セル・上階床開口・階段踏面を同じ非施工契約に統合**した。実プランナー接続やブロック状態設定は行っていない。
3. **新たな重要発見**：直線階段の上階踊り場 `(15,18)` は概念廊下グラフ上13ドアのうち1件にしか到達しない。最短の幾何学的連絡候補は上階あたり7セルの廊下予約追加と4セルの概念壁重複を含み、採用不能。下階の12/13維持を全建物接続PASSと混同しない。
4. `cd source && node verify-b42-package.mjs` で凍結B41の667ファイル、B42マニフェスト、再生成、QAを点検。
5. `node --test tests/step8b-stair-macro-b42.test.mjs` が新規32件。関連は `step8b-stair-redesign-b41`、`step8b-emitter-fixture-b33`、`step8b-floor-seam-b32` の112件。
6. 不明な実階段状態・接合・壁を無理に解決済み扱いにしない。Windowsでの追加操作不要。

安全契約：既存建築・Legacy・凍結原本・検証証拠を変更禁止。`NOT_PREPARED`、9ゲート`BLOCKED`、BuildPlan `operations=[]`、`materialIds=[]`、`worldCoordinates=null`、施工0件。
