# B198Z-R49 — R48実Qwen結果の原本監査と「自己矛盾」オフライン検査

日付：2026-10-21（JST）。Draft PR #128の継続。新しい実Qwen推論・Minecraft接続/施工なし。

## R48の実行結果：確認できたこと

ユーザーが提出した`R48_*_UPLOAD_THIS_RESULT.zip`内で、保存原本、キャプチャ、Windows監査、最終マニフェストのSHAが一致。

- **原本SHA256：`38e58f92ce9e19c312c149f608a74c80147d6508480cb219e0393e63e6451d0c`**
- 5,344 UTF-8 bytes、最上位4キーのJSON正常、29形状（box27、staircase2）。
- モデル名は記録上`qwen3.8:27b`。独立の提供者認証ではない。
- native応答`stop`、1,829 tokens、上限3,072、105.88秒、生成速度21.39token/秒。原本保存前の自動修正は0。
- ネイティブのR47 JSON Schemaは要求パラメータに採用された記録。実Ollama側のスキーマ内部実施状況を独立証明したわけではない。
- R46で起きた`bounds.volume`、`shape`オブジェクト、`CUT.material`、階段33段以上はR48原本では発生しない。
- **正式B143 `B143_OUTSIDE_LOCAL_BOUNDS` FAIL**。R3/3D人間審査は未到達。以前のR25/R44/R46と同様、建築品質は不合格。

## 原文から計算できる独立の重大問題

| 分類 | R48原本の証拠 | 注釈 |
|---|---|---|
| 範囲外4要素 | leftStair/rightStairの最遠端z=-1、loungeGlow/roofGlowのy=40（height=40は0..39） | B143最終コンパイル前の正確な要素包絡域 |
| 範囲外の目的地 | lounge point=[20,40,20] | 位置自体がB143ローカル外 |
| 宣言の経路上限が不可能 | atrium: 最低18 >10、leftShelf:31>15、rightShelf:31>15、lounge:最低39>35 | 障害物を全除去しても不足。R3は歩行時に水平方向移動と1段の上下を同じステップで許可するので、下限はmax(水平,垂直)で算出 |
| 空洞の埋戻し | atrium Glowが後続ADDで64セル、left/right各床3枚+glow3枚がそれぞれ1,440セル重複 | 直方体の座標交差から算出。実コンパイル済みボクセルではない |
| R3プログラム名の重複 | atrium/leftShelf/rightShelfはそれぞれ3か所、loungeは2か所に同じIDを使う | R3の全領域一意ID条件に違反 |
| 外観 | 27直方体+2直線階段、曲面系shapeゼロ | 文中の「曲線的」とソース幾何が一致しない |
| 機能 | 書架の明示的ADDがない、中心のコンクリート塊から切り抜いたアトリウムに接続口を作っていない | 建築意図の評価には3D/歩行の別確認も必要 |

数値は提出ZIPの`R48_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt`を改変せず、記述座標から計算。R48原本そのものはGitHubに自動投稿/上書きしない。

## R49実装

`source/ai/b198zr49-global-source-consistency.mjs` の `inspectR49GlobalConsistency(raw)` は、最大160の任意のB143設計要素について次の独立検査を行う。

1. 全6種類の基本shapeのXYZ包絡域。box/staircase/ellipsoid/cylinder/torus/beamと最後のrepeat位置を調べる。境界超えの全候補を列挙して、B143の「最初の1件のエラー」で原因が隠れないようにする。B143コンパイルを回避して合格させるわけではない。
2. モデルが自己宣言した入口から全目的地への**数学的に必要な最短ステップ下限**。R3の実移動仕様を反映し、上下移動と水平移動を別々に足して過大計上しない。
3. 入口/目的地の範囲外、保護空洞・目的地・機能領域での重複IDを確認。
4. 既存R45の「後続ADDが宣言空洞の直方体へ入り込む」読取専用助言を再利用。B143の最終ボクセルと同じ証拠と偽称しない。
5. `NO_OBVIOUS_CROSS_FIELD_CONTRADICTION_BUT_NOT_CERTIFIED` は品質合格ではない。B143・R3・独立契約・Minecraft実歩行・美観の確認は別に必要。

R49専用の合成フィクスチャはR48実原本を複製せず、境界違反・到達不可能な宣言・数学的下限・repeat範囲外・JSON中断を検査。CIはWindows+Ubuntuで実モデル/ワールドを一切触らない。

## 今後の設計上の結論

**構文をSchema化するだけでは、グローバル座標の意味的整合性と機能を保証できない**。次の生成方針は、モデルが独創的な外観・内装・用途を発想する自由を維持し、構文/範囲/動線を事後の独立チェッカーで正確に判定する。過去原本の自動修復・再推論禁止を保持する。新たな実Qwen推論は新規明示承認が必要。

`NOT_PREPARED`、`constructionApproved=false`、`executionAllowed=false`、9ゲート`BLOCKED`、`BuildPlan.operations=[]`、モデル追加呼び出し0、Minecraft接続・施工0。
