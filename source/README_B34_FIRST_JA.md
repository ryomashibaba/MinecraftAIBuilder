# MinecraftAIBuilder Step 8B/B34 — 再開手順

1. ZIPルートの `00_START_HERE.md` を読む。
2. `docs/B34_SHAFT_CONNECTIVITY_AND_REDRAW.md` の結果と未解決条件を確認する。
3. `node verify-b34-package.mjs` で B33原本578ファイル + B34レポート + QA証拠の再現性を照合する。
4. 次は B35 の廊下・階段アクセスの非施工再設計へ進む。特に `(ΔX=0, ΔZ=+1)` の既存廊下5セル衝突に注目。勝手なレイアウト採用はしない。

**Windowsの追加操作なし。既存建築/Legacy/凍結証拠は変更なし。`NOT_PREPARED / BLOCKED / BuildPlan.operations=[]`。**
