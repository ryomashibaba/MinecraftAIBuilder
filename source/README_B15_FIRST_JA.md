# MinecraftAIBuilder — B15 再開ガイド

1. 最初に `docs/STEP8B_B15_IMPLEMENTATION_AND_NEXT.md` と `reports/B15_VIRTUAL_REVIEW_REPORT.json` を確認。
2. `node verify-b15-package.mjs` でファイルSHA-256・B14原本不変・レポート・HTML・テスト証拠を照合。
3. 新しい外部フォルダでの再生成のみ許可: `node tools/RUN_B15_OFFLINE.mjs <存在しない外部フォルダ>`。
4. Windows側での追加操作は不要。Bridge、Minecraft、建築API、実エンジンには接続していない。
5. B15の新規25テストと、前工程の358テストを別々に記録。実行できていないQAはPASS扱いしない。

## 絶対条件

- 既存建築、Legacy設定、凍結証拠は変更禁止。
- `NOT PREPARED` / `BLOCKED` / `commandCount=0` / `operations=[]` を維持。
- 0.25/0.5/1.0は**仮想壁厚**（単位は概念セル）。Minecraftブロック換算、建築可能性、実ドア・階段動作を意味しない。
- オフィス02の外形123セル差分、廊下18セルは未解決。元案への自動反映は禁止。
