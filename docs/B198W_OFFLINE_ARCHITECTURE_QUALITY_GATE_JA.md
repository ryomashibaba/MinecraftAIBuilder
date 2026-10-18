# B198W — 実モデル建築の品質レビューをLLM再実行なしで行う

## 今回の開発工程の位置付け

B198Vで、モデルを1回使って返されたB143ソースを保存し、その後の再検証をダブルクリック・GitHub再取得なし・Ollamaなしで可能にしました。B198Wはこの成果を**実際の建築品質の検証**に接続します。モデルを高速化したり原作の自由設計をテンプレートに置き換えたりする工程ではありません。

以前のQwen3.8 27B試験は119.1秒で応答しましたが、B143範囲エラーで有効な建築は0件でした。B198Uの実モデルZIPはまだ提示されていません。したがって、**今回の実装で実際のQwen建築が完成したという主張はしません**。自動テストに使ったモデルは明示的な決定的モックで、建築の美しさも認証していません。

## 実装内容

1. `scripts/b198w-quality-review.mjs`：独立してコンパイル・SHA一致確認したB143ソースに対し、既存B198Bの幾何ソース評価とB198Cの空間トポロジ監査を再利用します。使用素材、形状種、実占有セル数、高さ、2×2の支持面候補、水平床の連結成分、空洞体積、上部1/4のガラスセル数などを実測します。単なる素材や空洞の存在を「ラウンジがある」「吹き抜けが完成」とは解釈しません。
2. B198Bで凍結された**c01の元の日本語指示と4項目**をそのままレビュー画面に表示します。プログラムによる美しさや意味評価は行わず、全項目を`UNREVIEWED`から開始。人間が3方向（正面・俯瞰・側面）の3Dモデルを確認し、0〜4点と各15文字以上の根拠を入力して初めて自己申告の評価JSONをダウンロードできます。
3. 評価JSONに`sourceSha256`/`geometrySha256`を含め、別の建築へ評価を使い回せないようにします。`validateB198WHumanReview()`は凍結基準・ハッシュ・採点範囲・各根拠を再確認し、結果に**SELF_REPORTED_HUMAN_RATING_NOT_INDEPENDENTLY_VERIFIED**を保持します。モデルの自己評点を品質証拠として受け入れません。
4. `source/ai/b198w-review-board-template.html`：デザイン審査専用の**完全オフライン**の白背景レビュー画面。既存B143 3Dビューアを相対パスで埋め込み、別タブでも閲覧できます。評点はローカルにJSON保存するだけで、通信・データ送信・Minecraftへの接続なし。
5. 一度生成したソースの`ReplayLatest`と、新しいQwenソースが有効だった`SourceProbe`の両方で、`B198W_SOURCE_QUALITY_EVIDENCE.json`と`B198W_REVIEW_BOARD.html`を自動生成。アップロードZIPにも含めるので、従来の3D図とレビュー資料を個別に集める手間を省きます。検証エラー時は元のモデル出力をB198Uどおり保存し、**偽の品質PASSやレビュー画面を作りません**。
6. 既存`tools/B198V_INSTALL_OFFLINE.ps1`をB198Wソース用に更新。ただしインストール先を`offline-workbench-v2`とするため**旧v1キットを上書きしません**。レビュー機能つき新バージョンを独立したキットとして保持できます。

## 初回の新レビューキット導入（LLM実行なし）

```powershell
$p = Join-Path $env:TEMP 'B198W_INSTALL_OFFLINE.ps1'
Invoke-WebRequest 'https://raw.githubusercontent.com/ryomashibaba/MinecraftAIBuilder/feature/b198w-offline-source-quality-review/tools/B198V_INSTALL_OFFLINE.ps1' -OutFile $p
powershell.exe -NoProfile -ExecutionPolicy Bypass -File $p -Model 'qwen3.8:27b'
```

上のコマンドで実モデルは呼び出しません。既存v1と別の`Documents/MinecraftAIBuilder-B198V/offline-workbench-v2`を作成します。

- `REPLAY_LATEST_OFFLINE.cmd`：すでに保存済みの`B198U_ORIGINAL_MODEL_RESPONSE.txt`をB143で再検証し、**Ollamaへの通信0件、GitHubへのソース再取得0件**で3Dと品質レビュー資料を生成します。まだB198U保存済みソースがない場合は正しくHOLDします。
- `RUN_ONE_REAL_MODEL_ONCE.cmd`：新しい独創的な建築が必要な場合だけ、明示的にローカルQwenを1回実行。1回の推論には数分かかる可能性があります。有効なソースなら3D・品質レビューを自動生成し、失敗しても元のAI出力をZIPへ保存します。

生成結果のZIPに同梱される`B198W_REVIEW_BOARD.html`、または`c01_B198W_REVIEW_BOARD.html`をブラウザで開き、3Dを見ながら入力してください。評価JSONも後でChatへ渡せます。ローカルの画面とファイルだけではモデルの美的品質は自動認証されません。

## 検証と制限

- GitHub Actions `B198W Real-Source Human Architecture Quality Dossier`：新規6件を含む従来回帰テスト**137件PASS**。
- Windows PowerShell 5.1：実際のGitHubソースZIPを一度取得してv2を構築、決定的な**非LLM**模擬OllamaでB143ソースを1件作成し、レビューボード・幾何監査・SHA証拠がZIPに存在することを確認。模擬モデルを停止後、同じ生ソースからLLM0件の再検証に成功。
- 新しいレビューボードは新しい描画エンジンではなく、既存の視点回転・階表示・素材表示つきB143 3Dビューアを再利用。
- **品質ゲート**：B143コンパイル、幾何監査、人間の意味・造形判定、さらに将来のMinecraft実機検証を区別して維持。動線、構造安全性、実ブロック配置は未確認。Minecraftのワールドへの書込0件、`NOT_PREPARED`、9ゲート`BLOCKED`、旧Draft PR/main未変更。

## 方針・計画・効率の自己監査

| 軸 | 判断 | 次の判断ポイント |
|---|---|---|
| 方針 | 維持。モデルが自由に形状を設計し、プログラムが実測、人間が意味と造形を判断 | 既存ソースに意味評価を偽造しない |
| 計画 | 正常。B198U生ソース保存→B198V操作短縮→B198W実品質レビューの順に依存関係を解消 | 最初の実QwenコンパイルPASS建築を評価する |
| 効率 | 改善。B143診断・JSON品質メトリクス・人間レビュー画面を同じワンクリックで生成 | 既存の生ソースがある限り再推論しない |

次工程は**B198U以降の最初の本物のQwen出力ZIPの中身を確認し、その3D形状を厳しくレビュー**することです。B198Wの追加のために今すぐモデルを再実行する必要はありません。
