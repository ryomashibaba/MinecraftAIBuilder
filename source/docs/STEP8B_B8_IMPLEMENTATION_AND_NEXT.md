# Step8B/B8.1–B8.6 開発・検証・次工程（2026-10-10）

## 安全と事実の境界
- 元のB7レビュー結果SHA-256 `4be87b0acfc3641f26a9b71ff329c2386f9e2c8e3461f4d8d70633faf31dcbe8` を検証し、既存5件・差分123セル・ホテルU字入口問題36件をそのまま保持。
- 最新Windowsの静的ソース249件を、B6のマニフェスト・ファイルハッシュに対して再照合。これは実行中コードの証明にはならない。
- ソースコード内の`predictLocalRectangles`, `orientedRectangles`, `footprintSummary`, `evaluateEntrance`だけを呼び出す。Windowsの実planner/Bridgeはインポートせず、Minecraftとは通信しない。
- `BuildPlan.status=NOT_PREPARED / operations=[] / commandCount=0 / deploymentGate=BLOCKED`、承認=falseをすべての静的レポートとレビュー記録で保持。

## B8.1 凍結基準
- B7ハッシュを別定数で固定。改ざんした自己ハッシュ再計算でも元B7を書き換えられない。
- source snapshotのファイル・式とスタイルJSONを読み取り専用で検証。元ソースは変更しない。
- B8配布レポートSHA `5d517c5e23e21fc12a3f5d054b0fed9a3c65f71d42caac831b95f87610e15161` をHTMLレンダラーでも固定。

## B8.2 / B8.3 432候補、レビュー用スコア
- ホテル／集合住宅／オフィスそれぞれ4登録形状 × 3スタイル（modern, urban_japanese, traditional） × 3 seed（0, 1, 5） × 4方向（north, east, south, west）＝144候補、計432候補。
- 寸法はB7の既存代表候補からだけ取得（ホテル26×20×6、集合住宅28×22×6、オフィス24×20×6）。地形、現場の占有権限、ワールド座標、将来設計を意味しない。
- 432件の通常寸法では入口の静的必要run不足0件。ただし**別の境界寸法に関する元の不足36件は残存**しており、合格にはしていない。
- スコア：平均占有率×60、最小階/最大階の保持率×25、階ごとの面積変化（上限付き）×15の丸め値の合計。**並び替え用の独自便宜的な尺度であり、見栄え・構造・安全・実施工成功を意味しない。**

## B8.4 / B8.5 HTMLレビュー
- 自己完結型HTML。432件をフィルタ・並び替え・20件ずつ表示し、最大3件を階別ローカル占有マップで比較する。
- 元の5候補とオフィス差分123セルを別表で維持。ホテル境界36ケースとレビュー専用代替案を表示。自動修正／自動採用は0。
- ユーザーがボタンを押した時だけローカルJSONをエクスポート。`reviewOnly=true`,`constructionApproved=false`,`executionAllowed=false`,`BuildPlan.status=NOT_PREPARED`,`operations=[]`を含む。設計レビューのメモであり施工承認ではない。
- URLへのfetch、WebSocket、localStorage、Minecraft/Bridgeへの接続なし。ブラウザ内でのBlobファイル出力だけを使用。

## B8.6 QAとブラウザ動作
- **Step8B 157/157 PASS、Step8A 40/40 + 40/40 PASS、合計237/237 PASS**（失敗0、SKIP0）。Windows実機テストではない。
- 最初にStep8A統合再実行が時間上限に到達したため、必須環境変数の設定後、ファイル群を分割して検証。分割した80テストも全件PASS。
- HTMLのインラインJavaScriptに1か所の文字列改行エスケープミスを発見・修正。以後 `node --check -` による生成済みJS検証をテストに追加。
- ChromiumでHTMLを読み込み、432件表示→ホテル144件絞り込み→2案選択→階別プレビュー→JSONダウンロードが動くこと、ブラウザJS例外なし、出力の未承認状態を確認。試験ブラウザ環境では直接file://の読み込みが管理制限されたため、同一HTML文字列を`set_content`で読み込んでスモーク検証。一般のWindowsローカルfile://動作はまだ実機未検証。
- report SHA, source file hashes, package inventory SHA照合を記録して引き継ぐ。

## 主要な新規ファイル
- `runner/step8b-candidate-review-b8.mjs`：source-pinnedレビュー候補と独自スコア、全面施工禁止
- `runner/step8b-review-ui-b8.mjs`：オフライン比較・ローカルレビュー記録HTML
- `tools/RUN_B8_OFFLINE.mjs`：新規フォルダのみに2ファイルを出力
- `tests/step8b-candidate-review-b8.test.mjs`：22テスト、静的ソース式照合・不正入力・不正承認・ブラウザJS構文など
- `reports/B8_REVIEW_CATALOG.json`、`previews/B8_CANDIDATE_REVIEW.html`、`qa/B8_STEP8B_QA.tap`など

## 再実行
Windowsスナップショット249件を別の読み取り専用フォルダに展開した上で、環境変数`STEP8B_SOURCE_DIR`を指定する。B6のテストには追加で`STEP8B_LATEST_EVIDENCE`（B4.2実機JSON）を指定する。Linux例：

```bash
export STEP8B_SOURCE_DIR=/path/to/unchanged-windows-snapshot
export STEP8B_LATEST_EVIDENCE=/path/to/unchanged-b42-runtime-evidence.json
node --test --test-concurrency=2 tests/step8b*.test.mjs
node --test --test-concurrency=1 tests/step8a-architecture.test.mjs tests/step8a-design.test.mjs tests/step8a-detail.test.mjs
node --test --test-concurrency=1 tests/step8a-optimize.test.mjs tests/step8a-physical.test.mjs tests/step8a-review.test.mjs
node tools/RUN_B8_OFFLINE.mjs "$STEP8B_SOURCE_DIR" /path/to/new-output-directory
node verify-package.mjs
```

## 次工程B9
1. このB8レビューUIの候補群の偏り（同形状・同面積・回転重複）を抑えて比較しやすい「形状多様性 / Pareto候補選別」を静的実装。ただし見栄えの客観保証はしない。
2. ユーザーが指定した寸法・用途でも、厳密な制約付きレビュー候補を生成するための安全なオフライン形式を追加（認可・世界座標とは完全分離）。
3. 入口以外の静的配置（内装、階段位置、屋根、モジュール相互干渉）の証拠付き事前診断へ進める。実Plannerへの接続やMinecraft施工は承認と十分な安全証拠が揃うまで禁止。
4. Windows側の操作を増やさず、差分QA・短いチェックポイント保存を継続する。
