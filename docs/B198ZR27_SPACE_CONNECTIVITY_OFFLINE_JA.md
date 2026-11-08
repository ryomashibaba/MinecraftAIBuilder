# B198Z-R27 — 保存済み実Qwen原本の空間成立性診断

## 位置付け

R25の実Qwen推論は1回実施・承認消費済み。再推論は禁止。
R26の材質違反5件は全てCUTの余分なmaterialで、メモリ上の仮想削除後のB143コンパイルでは53,832ボクセルが得られた。
しかし入口 [23,0,44] はR3のENTRANCE_NOT_STANDABLE、読書領域左右とstar-loungeはそれぞれ100%占有でHOLD。

R27はこの問題の追加調査用。**R25原本を修正する工程ではない。**

## 実装

- scripts/b198zr27-space-connectivity-offline.mjs
- scripts/b198zr27-space-connectivity-offline.test.mjs
- .github/workflows/r27-offline-spatial-diagnostics.yml

R27はR26のSHA固定を通し、CUTの不正materialのみを**メモリ内**で仮想削除する。
ADD材質が不正なら仮想コンパイルを行わずHOLDする。
仮想B143コンパイル成功後、最終概念ボクセルを調べる。

- supported floor: 立ち位置の真下に概念ボクセルがある
- headroom: 宣言された2または3セルが空いている
- connected components: R3と同じ概念グリッド上で水平方向±1と高低差±1の接続を調べる
- zones: 最終占有セル、材質、立てるセル数、属する連結成分、宣言された到達基準を物理的に達成できるか
- entrance: 宣言入口の占有、支持床、頭上空間、y=0問題
- nearestStandableCandidates: 周囲の成立可能な立ち位置の参考情報。**自動的に入口を書き換えない**
- destinations: 立てるか、同一連結成分にいるか。最短経路は未計測と明記
- namedShellBoxAdvisories: shellなどの名称を持つBOXが中実かどうかを注意喚起

## OMEN Work Localでの実行

既存原本のSHA256（R23証拠監査で確認済み）:

`444b14eaedf1136a1cee5eeab94c7b76db51fcd2d3519820ba807727e55817d6`

R25の保存済み原本を対象にする。次は概念例。実際のWork Local環境に合わせてパスを確認する。

```powershell
node scripts/b198zr27-space-connectivity-offline.mjs --raw "C:\Users\ryoma\Documents\Codex\2026-10-20\minecraftaibuilder-r25-omen-ollama-qwen3-8\outputs\R25_RESULT_20261020_083607\capture\R6_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt" --sha256 "444b14eaedf1136a1cee5eeab94c7b76db51fcd2d3519820ba807727e55817d6" --out "C:\Users\ryoma\Documents\Codex\2026-10-20\minecraftaibuilder-r25-omen-ollama-qwen3-8\outputs\R27_OFFLINE_SPATIAL_DIAGNOSTIC.json"
```

既存出力先が存在した場合は上書きせずHOLDする。原本とR25/R26の成果物を変更しない。
Work Localは事前に固定GitコミットのR27ソース・依存関係を取得・検証し、偽データテストを通過させること。

## 合格を意味しない理由

- R27の仮想コンパイルはR25原本のB143不合格を覆さない。
- 周囲に成立する立ち位置があっても、元の宣言入口が成立したことにはならない。
- 同一連結成分にいるだけでは、最短経路・歩行可能性・機能性・造形美を認証できない。
- 抽象グリッドでの結果はMinecraftの実ブロック状態、段差、衝突形状、実歩行とは別。
- R27はモデル呼び出し0、Minecraft接続・読取・施工0、NOT_PREPARED、9ゲートBLOCKED、BuildPlan.operations=[]を維持する。

R28以降の指示改善は、このR27実原本診断を受けて検討する。
