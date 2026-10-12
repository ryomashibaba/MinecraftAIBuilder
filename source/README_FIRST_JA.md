# MinecraftAIBuilder — Step8B B8統合非施工プレビュー

最初に `docs/STEP8B_B8_IMPLEMENTATION_AND_NEXT.md` を確認してください。B7以前のドキュメントは変更していません。

このパッケージは**施工機能を持たない**設計レビュー専用です。3用途×4形状×3スタイル×3seed×4方向の432静的条件の比較・フィルタ・最大3候補の階表示、境界ホテル36件の入口問題レビュー、ローカルの未承認JSONメモ出力を追加しました。

`previews/B8_CANDIDATE_REVIEW.html` を通常のブラウザで開きます。Windowsの操作・Bridgeへの接続・Minecraft起動は不要です。建築やワールドの変更はありません。

テスト：**Step8B 157/157、Step8A 80/80、計237/237 PASS**（Linux Node.js 22）。実Windowsランタイムで新規試験したことは意味しません。

安全： `NOT_PREPARED` / `operations=[]` / `commandCount=0` / `BLOCKED` / `constructionApproved=false` を維持。既存建築・Legacy・凍結証拠には手を加えていません。実行中エンジンの同一性、材料ID、ワールド位置、施工の安全性などは未証明です。

元のWindows 249ファイルソーススナップショット、B4.2 Windows証拠JSON、過去の大型ZIPをこの軽量ZIPに重複同梱していません。元データと原本は別に保全してください。
