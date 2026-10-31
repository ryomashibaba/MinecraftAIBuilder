# B198Z-R47 — 厳格なOllama JSON SchemaでB143書式違反を生成段階から抑える（候補・未有効）

## なぜ行うか

実Qwenの独立した単発生成は以下の状態。旧原本を後から修正して合格扱いにしない。

- R25：`CUT.material` 不正5件。仮想除去後も中実の部屋、入口・動線が不成立。
- R44：全43要素の`shape`が文字列でなくオブジェクト、厳密B143 `SHAPE_MODE` HOLD。本棚への後続CUTと吹き抜けへの後続ADDの空間衝突も確認。
- R46：`shape` 形式や`CUT.material`は前進。しかし`design.bounds.volume`というB143非対応フィールド、`staircase.steps=36`（最大32）が残り `B143_BOUNDS_FIELDS` HOLD。内部には中実書架、空洞を塞ぐ階段とラウンジ、入口動線などの機能的欠陥も残る。R46の明示承認は**使用済み**。

言葉で「書式を守れ」と指示するだけでなく、次回の**新しい承認が得られた場合だけ**Ollamaネイティブ`/api/chat`へ`format: {JSON Schema}`を渡す候補をR47で開発する。

公式仕様参照: https://docs.ollama.com/capabilities/structured-outputs
（JSON形式だけでなく、JSON Schemaオブジェクトを`format`へ渡せる。ただし実`qwen3.8:27b`との相性、`oneOf`への対応・性能は未検証）。

## 実装

- `source/ai/b198zr47-json-schema-format-gate.mjs`
  - JSON Schemaを純粋なJavaScript定数として定義し、SHA256とUTF-8サイズを固定。
  - 最上位は`design/spatialPlan/explanation/assumptions`の4キーに厳密制限。
  - `bounds`は**width/height/depthのみ**、`volume`や注釈を追加できない。
  - 6種類のshapeとADD/CUTの組合せで11種類の排他的`oneOf`。各要素の`shape`は必ず文字列、素材はADDのみ、CUTには入れられない。
  - 階段はADDに限定、`steps:2..32`、`treadDepth:1..3`、`width:2..12`などB143仕様に沿う。
  - `spatialPlan`の`entrance`は3要素整数配列、`headroom`は2または3の数値。
  - すべての定義済みオブジェクトで`additionalProperties:false`。モデルが任意の余計な属性を付け足す余地を減らす。
  - `inspectR47SavedCandidate(raw)`は保存済みの無改変原文をB143の既存パーサーと最終コンパイラへ渡す。次に**R3でモデル自身の空洞・入口・到達性の宣言**と最終ボクセルを照合する。入口閉塞はHOLD、空洞再充填や断線は個別診断。R3自己宣言契約PASSは第三者審査でなく、独創性・美観・Minecraft実歩行を認証しない。
- `source/ai/b198s-native-ollama-source.mjs`
  - 別スイッチ`r47SchemaFormat:true`を追加。R46/R44/R22/R11などとの併用は禁止。
  - オプトイン時にのみ`format:R47_JSON_SCHEMA`。従来すべての`format:'json'`経路を維持する。
  - 保存する`originalContent`の変更、生成結果の黙示的補正、2回目の生成要求は行わない。
  - R47候補の**模擬試験だけ**であり、実Qwenへの接続や新しい単発ランナーを追加しない。
- `scripts/b198zr47-json-schema-format-gate.test.mjs`
  - schemaの要素種類・フィールド・上限・独立性を検査。
  - B143が`bounds.volume`と36段の階段を厳格に拒否することを確認。最終ADDで空洞を塞いだケース、入口を塞いだケースをR3でHOLDできることを確認。
  - 偽localhostサーバーへ1回だけ`format:{...}`を渡し、原文を保存することを確認。
  - 旧R46プロファイルが`format:'json'`のままであることを確認。
- `.github/workflows/r47-structured-output-offline.yml`
  - Ubuntu/Windowsの双方でR45/R46回帰＋R47模擬テスト。GitHub CIから実Qwenへの問い合わせなし。

## 重要な限界

**このR47を実装してもAIの創造性・建築品質が改善したとは言わない**。

JSON Schemaには次の制約を完全には表現できず、独立のB143/R3/人間の視覚審査を残す：

- 各要素の位置と大きさ・repeat後の全セルがdesign.bounds内か、有限作業量／160,000セル予算に収まるか。
- 殻の厚さと半径、torusの主半径と管半径の相対関係、同じIDの禁止。
- ADD/CUTの順番による書架消失、保護吹き抜けへのADD侵入、入口閉塞。
- 床支持・頭上空間・階段上端の接続・目的地到達性。
- 図書館としての本当の機能、外観の独創性、全体の洗練度、Minecraftで歩けるか。

ネイティブJSON Schemaは推論速度を改善すると限らず、モデル・OllamaバージョンによってはSchema非対応または停止する可能性がある。その際も「自動でformat:'json'へ戻す」「追加推論する」は行わない。旧原本保護は徹底。

## 絶対的な安全状態

`NOT_PREPARED`、`constructionApproved:false`、`executionAllowed:false`、9ゲート`BLOCKED`、`BuildPlan.operations:[]`、今回の新規実Qwen生成0、Minecraftへの接続・読取・施工0。R47の実モデル試験は別途新しい**明示承認**が必要で、現段階は候補実装と偽通信CIのみ。

## 次工程の判断

CI完走後、必要な場合にだけR47用の単発実行器／Windows起動CMDを準備する。R46承認は再利用しない。次の実Qwenは独立した新しい許諾で、同じc01課題・同じ出力予算、原本保存、B143/R3/3D/人間評価の比較条件を固定し、効果を比較する。モデルでしか得られない証拠を新しい合成テストのPASSで代替しない。
