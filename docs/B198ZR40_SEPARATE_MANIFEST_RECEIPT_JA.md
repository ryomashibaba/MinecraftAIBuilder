# MinecraftAIBuilder R40 — 監査束の外側にSHA照合レシートを保管する

## 目的と結論

R38/R39はレビュー申告の保存束（監査束）を作り、内部のSHA256と連鎖を検査できる。しかし、**保存束全体が書き換えられ、すべてのSHAが再計算された場合、内部情報だけでは改変前との差を検出できない**。

R40では、監査束が元の状態の時に生成したSHA照合用レシートを、**監査束の外側の別ファイル**として作成し、後日そのレシートを基準に再検証する。

これは原本の補助的な改変検知。外部認証局への登録、本人確認、署名、公的タイムスタンプ、改ざん不可能な保存、バックアップの確保は行わない。**レシートも同時に改変されたら証明にはならない**。信頼できる場所へ別途保管する責任はユーザー側にある。

## 使い方（PowerShell、Minecraft操作なし）

まず、R39までのコマンドで新しい監査束 `R39_NEW_BUNDLE` を作成しておく。その後、プロジェクトルートで実行：

```powershell
node scripts/b198zr40-separate-receipt-cli.mjs save R39_NEW_BUNDLE R40_MANIFEST_RECEIPT.json
```

レシートを作成できたら、ファイル`R40_MANIFEST_RECEIPT.json`を自分で別の適切な保存場所に控える。**監査束ディレクトリの内側には作れない**。既存のレシートも上書きしない。外部で元から保管してある「候補・元要求・R36レビュー証跡」の3つのSHAを示す`REVIEW_PINS.json`を用意した場合は、さらに照合できる：

```powershell
node scripts/b198zr40-separate-receipt-cli.mjs save R39_NEW_BUNDLE R40_MANIFEST_RECEIPT.json REVIEW_PINS.json
```

保存後、元のレシートを使って読み直す：

```powershell
node scripts/b198zr40-separate-receipt-cli.mjs verify R39_NEW_BUNDLE R40_MANIFEST_RECEIPT.json
```

外部SHAピンも再照合する場合：

```powershell
node scripts/b198zr40-separate-receipt-cli.mjs verify R39_NEW_BUNDLE R40_MANIFEST_RECEIPT.json REVIEW_PINS.json
```

成功ステータスは`SEPARATE_RECEIPT_MATCH_NOT_AUTHENTICATED`。監査束のマニフェストSHA、スナップショットSHA、R37最終ハッシュ、件数、3つのソースSHAが、別に保管したレシートと一致したことだけを示す。**レビューの真偽・本人・建築品質・モデル性能を証明しない**。

## 検出できるもの

- スナップショットを後から変更し、マニフェストSHAも再計算して監査束内で整合させた場合（元レシートを変えていなければ検出）
- マニフェスト・スナップショット・件数・最終R37 SHA・候補/要求/R36のソースSHAの不一致
- レシート自身のJSON形式・スキーマの破損、余分な承認フィールド、シンボリックリンク、サイズ上限違反
- レシート保存先が監査束の内部、または既存ファイルの場合（作成拒否）
- R38の既存検証で検出される不正な記録連鎖や危険なファイル構成

R40の`verify`は**読み取り専用**。不一致時は`HOLD_SEPARATE_RECEIPT_MISMATCH`、入力やバンドル自体の破損時は`HOLD_SEPARATE_RECEIPT_VERIFICATION`で終了コード1となる。修復、ハッシュの再生成、既存レシートへの上書きはしない。

## レシートの内容

レシートには、R38マニフェストSHA256、スナップショットSHA256、R37最終連鎖SHA256、レビュー件数、元候補/日本語依頼/R36証跡の3つのSHAを保存する。**レビュー本文やQwen元応答の全文、Minecraftワールドデータ、画像ファイルは入れない**。

R40はレシートファイルのSHA256を表示するが、値を表示しただけでは信頼できる外部固定にならない。たとえファイルを別フォルダーに保存しても、その保管場所が第三者に変更されないことを本機能は保証しない。

## 成果物

- `scripts/b198zr40-separate-receipt-offline.mjs` — 厳格なファイル内外判定、未上書き保存、R38全検証と独立レシートの照合
- `scripts/b198zr40-separate-receipt-cli.mjs` — 明示的な`save`/`verify`コマンドのみ
- `scripts/b198zr40-separate-receipt-offline.test.mjs` — 合成R37/R38データによるテスト。**内部ハッシュをすべて再計算した監査束の改変も元レシートで検出する**
- `.github/workflows/r40-separate-receipt-offline.yml` — Windows/Ubuntu Node24テスト

## 運用上の固定制限

R25一回限りの実Qwen推論承認は消費済み。R40はQwen推論を行わず、Minecraftワールドへの接続・読取・施工も行わない。R25原本のHOLD、`NOT_PREPARED`、9ゲート`BLOCKED`、`BuildPlan.operations=[]`を維持する。R40の評価はレビュー本文の真偽や設計品質の保証ではない。

## 次工程案：R41

R37の人間レビューがユーザーによって実際に提出されているか、実モデル試験の評価・比較のどこに位置するかを整理し、**監査ログ整備だけを無制限に続けず、建築生成性能を改善する本来の目的へ戻るための再開判断資料**を作る。ただし新規Qwen推論にはユーザーの別途明示承認が必須。
