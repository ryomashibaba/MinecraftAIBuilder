# MinecraftAIBuilder — B26 / M4 静的証拠統合（2026-10-11）

## 先に読むもの

1. `../00_START_HERE.md`
2. `docs/B26_M4_SOURCE_GATES_AND_NEXT.md`
3. `reports/B26_M4_READONLY_PREFLIGHT.json`

## 成果

B25の凍結済みコンパイラー（469件のパッケージ原本）を維持したまま、2026-10-10 Windowsソース取得済みの **9ファイル** と Education v26.3 の**過去材料プロファイル**を読み取り専用で集約しました。

- 過去プロファイル966レコード: `verified` 827 / `unsupported` 139。
- `*_door` に該当する正確な状態検証レコードは0。**トラップドア128件をドアの証拠へ流用しない**。
- 壁共有3,990セル、通常のドア314か所、階段接続25件／床開口候補50セルは施工検証未了。
- `BuildPlan.operations=[]`、`commandCount=0`、`worldCoordinates=null`、`materialIds=[]` を維持。
- 9つの未解決ゲートは全件OPEN。`NOT PREPARED / BLOCKED`。

ソースに状態名が現れることは **Minecraft Educationで実際にドア設置が成功する根拠にはなりません**。今回は材質の自動選定、方位のWorld座標化、ゲーム内のブロック変更を一切しません。

## オフライン再検証

```powershell
node verify-b25-package.mjs
node --test tests/step8b-m3g-b25.test.mjs
node --test tests/step8b-m4-static-gate-b26.test.mjs
node --test tests/step8b-m4-windows-assessment-b26.test.mjs
node verify-b26-package.mjs
```

B26報告書を別フォルダへ新規出力するときのみ `node tools/RUN_B26_OFFLINE.mjs <新規の絶対パス.json>`。既存ファイルの上書きは拒否します。

`tools/COLLECT_B26_M4_WINDOWS_READONLY.ps1` は次に必要になった場合の **Windows一括収集用の候補**です。今回Windows PowerShell上での実行は未検証。ソースSHA、材料記録の集計、OSプロセス/待受ポート数を読み取るだけで、BridgeやMinecraftへは接続しません。世界の位置情報やコマンドラインは出力しません。

次回Windows JSONを受け取ったら、`node tools/AUDIT_B26_WINDOWS_READONLY.mjs <添付JSONの絶対パス> <新規出力JSONの絶対パス>` を使用できます。9ファイルの比較と集計のみで、実行中コードの完全な同一性は証明しません。M4判定器の新規18テストはオフラインPASSです。
