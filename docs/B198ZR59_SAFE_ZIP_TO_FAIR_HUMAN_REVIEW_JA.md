# B198Z-R59 — 実Qwen結果ZIPを手作業展開なしで公正な建築比較に接続

基準日：2026-10-21 JST。既存PR #128の継続。実Qwenリクエスト0件、Minecraft接続・施工0件。

## R58修正結果

R58の初回Windows/Ubuntu CI（Run 39597180742）は双方失敗。原因は独立審査テスト内で、歴史的R48 SHAを確認する`assert.notEqual`の括弧が1つ不足したNode構文エラー。R59で修正コミット `33f86e8b989b0961cc58167b0063effe99dddb03` を投入し、再実行Run **39601858600** は**Windows/UbuntuともPASS**。R58の設計上の凍結c01・原本SHA・人間未審査の原則は変更していない。

## R59の新規成果

`scripts/b198zr59-safe-result-zip-to-review.mjs` を追加し、今後Chatに提出する形式そのままの`R54_*_UPLOAD_THIS_RESULT.zip`から、利用者にZIP解凍を要求せずR58公正比較資料を準備できる**研究側のオフライン実装**とした。

1. ZIPの中央ディレクトリをNode標準の`zlib`のみで読み、保存型/DEFLATE型の一般的な一枚ZIPに対応。入力ZIPは読み取り専用で1バイトも変更しない。
2. パス横断（`../`、絶対パス、Windowsドライブ指定）、重複ファイル名、非ASCIIの曖昧なZIP名、複数ディスク・ZIP64、暗号化エントリ、不正なサイズ・CRC32、圧縮爆弾相当の容量超過はHOLD。**入力ZIPの全要素を任意フォルダへ展開しない**。
3. R54の`FROZEN_REQUEST`、`CAPTURE_RESULT`、`FINAL_EVIDENCE_MANIFEST`、未変更原本およびWindows SHA監査（存在する場合）**のみ**を検証して一時フォルダへ書く。R48 ZIPも提出された場合だけ、同じ手順を実行する。
4. R58の厳格なc01日本語課題のSHA、モデル指定の一致と履歴R48原本SHA`38e58f92ce9e19c312c149f608a74c80147d6508480cb219e0393e63e6451d0c`を確認。R48がない場合は比較不能を明示し、架空の差分は作らない。
5. 完全に新規の結果フォルダに`R58_C01_FAIR_REVIEW_REPORT.json`、`R58_C01_HUMAN_REVIEW.html`、`R59_ZIP_REVIEW_RECEIPT.json`を作る。レビュー生成後は一時抽出ファイルを消し、元のZIPは保持。
6. 確認できるものは、B143/HOLD・R49範囲外・モデル自身の宣言矛盾・原本ハッシュのみ。独創性、図書館の機能、真の歩行経路は**人間の視覚・意味・実用性審査が済むまで「未審査」**を維持する。

`scripts/b198zr59-safe-result-zip-to-review.test.mjs`では合成ZIPの保存・圧縮型、CRC改変、パス横断、重複、暗号化、R48偽原本、出力先の上書き禁止を検査。Windowsでは実`Compress-Archive`形式のZIPも読めることを確認する。

`.github/workflows/r59-secure-zip-ingest-offline.yml` はWindows/Ubuntuの双方を対象とし、R58の厳格QAも再実行する。

## 今後の低操作フロー

新規の実Qwenリクエストには別途ユーザーからの明示承認が必要。現在のR57 CMD候補は**未配布**。

承認済みの新しいQwen試験で結果ZIPが完成した後は、これまで通り**ZIPをこのチャットに1回提出するだけ**をユーザーの標準操作とする。Chat側がZIPを直接読める場合はそのまま、オフライン比較器が必要ならR59を利用。ユーザー自身にPowerShell、解凍、Git操作を求めない。

CLI例は内部検証用で、現段階のユーザー操作ではない：

```
node scripts/b198zr59-safe-result-zip-to-review.mjs --r54-zip "R54_result.zip" --out "R59_NEW_REVIEW" --r48-zip "R48_result.zip"
```

R48原本がない場合は`--r48-zip`省略。**R48の実原本や実行場所を検索してきたことにして、データを捏造しない**。

## 制約

この工程は原本の完全なモデル提供元認証ではなく、提供された資料内のSHA整合性検証。ZIPのCRCは転送中の損傷を検出するが署名ではない。実QwenによるR50建築設計方式の改善は未検証。B143の構文PASSは実用性・美観を証明しない。

`NOT_PREPARED`、9ゲート`BLOCKED`、`constructionApproved=false`、`executionAllowed=false`、`BuildPlan.operations=[]`を厳格維持する。今回も既存原本・承認・Minecraftワールド・mainは変更しない。
