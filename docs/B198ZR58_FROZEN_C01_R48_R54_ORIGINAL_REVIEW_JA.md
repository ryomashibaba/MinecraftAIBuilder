# B198Z-R58 — R48 vs R54 図書館の公正な原本比較・人間品質審査

基準：2026年10月21日 JST。GitHub `ryomashibaba/MinecraftAIBuilder`、Draft PR #128。**実Qwen推論を追加せず、既存のR48・R54原本、main、Minecraftワールドを変更しない。**

## 前工程の確定結果

R57 Windows起動CMDの最終CI（run **39592837918**）は **4/4 PASS**。最外層CMDで`NO`はモデル要求0、先行バインドされた偽Ollamaに対する`YES`はPOST 1、ZIP内の原本SHA・自動R51診断図、消費済みロックによる再実行拒否を確認。

この結果は**本当の`qwen3.8:27b`による新しい建築品質を証明しない**。過去の実R48は正しいJSONになったが、B143の範囲外4要素、実用空間の埋戻し、不可能な宣言経路のためHOLDだった。

## R58で実装したこと

`scripts/b198zr58-frozen-c01-quality-review-packet.mjs`：

1. 設計課題を凍結B198B **c01（海沿いの未来型公共図書館）**に固定し、同じプロンプトSHA、指定モデル文字列、原本の無改変SHA、`CAPTURE_RESULT`と`FINAL_EVIDENCE_MANIFEST`、存在する場合のWindows監査を照合。どれか不整合なら比較を拒否する。
2. 歴史的実R48原本のSHA **`38e58f92ce9e19c312c149f608a74c80147d6508480cb219e0393e63e6451d0c`**を固定。合成原本や別の出力を実R48と偽らず、これに一致する原本がない場合は「R54単独レポート、R48未提出」とする。
3. 未修正の原本から**厳格B143を再コンパイル**し、R49の範囲外・不可能な動線・空間ID重複・形状構成を診断。ただし**B143 PASSは建築完成・動線の正式合格・美観認定ではない**。
4. c01の4つの独立した人間品質基準（図書館としての実用性／吹抜けの成立／最上階ラウンジ／曲面外観の統一感）を、`NOT_REVIEWED`として保持。モデル自己宣言の`spatialPlan`を判定基準に格上げしない。
5. HTMLとJSONの比較レビュー資料を、**新規出力フォルダにのみ**書き出す。ソースの修復、原本への追記、モデル要求、Minecraftの読み取り・書き込みは禁止。

`scripts/b198zr58-frozen-c01-quality-review-packet.test.mjs`：

- R54型合成失敗原本のSHA、B143/49 HOLD、4つの人間基準が未評価のままかを検査。
- B143に合格する合成モデルでさえ**人間品質を自動的にPASSとしない**ことを確認。
- 原本の改変、プロンプトすり替え、モデルID改変、Windows SHA監査HOLDを拒否。
- 合成R48を実R48として受け入れない。SHA固定は合成レポートで置換・無効化しない。
- 新しい出力を生成した後も、証拠フォルダ内の元ファイルは全てバイト単位で一致。二重出力の上書き拒否。

`.github/workflows/r58-c01-fair-review-offline.yml`でWindows/Ubuntu双方の専用QA、R49/R54回帰を実施。

## 実行の考え方（将来のローカル内部用、ユーザー操作を増やさない）

将来の承認済みR54結果ZIPから診断・比較資料を生成する時だけ、保存済み原本のあるディレクトリを入力する。実R48の証拠フォルダも確認できた場合は`--r48-dir`で指定。**実原本が見つからないままR48の数値を捏造して比較しない**。

```
node scripts/b198zr58-frozen-c01-quality-review-packet.mjs --r54-dir "R54_Capture" --out "R58_NewReview" --r48-dir "R48_Capture"
```

R48が未提示なら最後の2引数を省略し、R54だけの基礎報告を出す。HTMLとJSONの2ファイルを作る。今回これをユーザーに実行させない。

## 引き続きHOLD

- R57のCMDは**新しい実Qwen推論の明示承認がないため配布しない**。モック用の`YES`は実ユーザー承認を代替しない。
- 同じ原本SHAがあることは保存時からのバイト不変を示すが、モデル提供元の身元や実行の真正性は証明しない。
- 建築の品質改善、通路の実用性、見た目の独創性は、人間による正式な3D・現場面の審査まで未確定。
- 構築状態は `NOT_PREPARED`、9ゲート `BLOCKED`、`constructionApproved=false`、`executionAllowed=false`、`BuildPlan.operations=[]`。実Qwen追加0、Minecraft接続/施工0。

次の工程ではR58のWindows/Ubuntu CIを確認し、必要なら不整合を修正した上で、将来の結果ZIPの閲覧・人間審査へ自然につなげる。
