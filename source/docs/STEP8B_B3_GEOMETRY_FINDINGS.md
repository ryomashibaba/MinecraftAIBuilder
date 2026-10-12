# Step 8B/B3 — 形状・座標プレビュー設計と結果

**2026-10-10 JST / 静的コード解析・非実行アダプター / NOT PREPARED**

## 結論

ユーザーが Windows 上で採取した 2026-10-10 18:27:57 JST のスナップショット（249ソースファイル、サイズ除外0）を再利用。ハッシュ整合性、4つの主要ソース署名、スナップショットのマニフェストSHA-256 `34ef239cd1d6e59c7d36fb070bd305e7572d944dee949c0648312ec94090534c` を照合してからのみ結果を作る。

現行ソースの `engine/src/building-grammar.js` の variation と8種類の massing を、**実エンジンをimportせず**独立した純粋関数で静的予測した。`engine/src/build-anchor.js` の `rotatePlanPoint` を参照し、**プレビュー内の方向変換だけ**を再現。これらは正規の実行経路を使用しておらず、リアルタイムプロセス、ワールド向き、アンカーおよび材料の照合ではない。

## 8形状と変換

- 登録形状：`slab`, `L_shape`, `U_shape`, `courtyard`, `tower_on_podium`, `stepped`, `twin_bar`, `asymmetric_block`。
- `seed % 2`、`seed % (floorCount-1)`、スタイルの `architecture.proportion`、階数による podium 比率をソース予測へ反映。
- 内部長方形は「左上(x,z), width/depth, 半開区間の start/end階」で表現。
- 四方向は `north: (x,z)`, `east:(depth-1-z,x)`, `south:(width-1-x,depth-1-z)`, `west:(z,width-1-x)`。いずれも**アンカー適用前のプレビュー座標**であり、ワールド座標として使うことを禁止。
- 回転に伴い横幅・奥行が交換されること、すべての階の占有セル面積が保存されることをセル単位の独立オラクルと照合。48×12および15×40という境界サイズも検証。

## サンプル5候補（Windowsソース予測に限る）

| 候補 | 確認結果 | 補足 |
| --- | --- | --- |
| Office `tower_on_podium` / south | 概念占有=予測占有 | 方向転換後の座標も予測のみ |
| Office `asymmetric_block` / south | **一致せず** | Step8A.5 `wing=5` vs source-pinned `wing=6`。1～5階で概念のみの22セル/階、6階は13セル（重なり排除済み） |
| Office `slab` / south | 概念占有=予測占有 | フロア内訳まで一致 |
| Apartment `courtyard` / south | 概念占有=予測占有 | 回転・ワールドアンカーは別概念 |
| Hotel `slab` / north | 概念占有=予測占有 | ホテルでslabは明示指定時のみ許可される静的仕様 |

これは**フロア占有形状の一致**であって、ドア・窓・構造材・足場・ガラス板・装飾・施工順・教育版ブロックの動作一致ではない。

## QA

- B3 **11/11 PASS**: 8×4×3×3=288シナリオ、全階セル単位の独立照合、境界長方形、seed/style変化、ソース改ざんの拒否、承認状態改ざんの拒否、入力データ・snapshot不変性。
- 継承B0 **21/21 PASS**、継承B2 **10/10 PASS** を現環境の同じsnapshotに対し再実行。合計 **42/42 PASS / SKIP 0**。
- HTML `previews/` はオフライン静的SVG。色は「両者で一致」「概念のみ」「予測のみ」を区別。ファイル出力は新規パス `wx` のみ。

## 未検証・ゲート閉鎖

1. **稼働中Windowsエンジン実体**が今回のスナップショットと同じであること（ソースSHAだけでは実行中コードを証明できない）。
2. 正規の planner が生成する壁・床・屋根・開口のボクセル出力と安全性。
3. `rotateLocal`, `worldPoint`, `createBuildAnchor` による実環境との接続、座標・方位・スキャンの一致。
4. Minecraft Educationで実際に使用可能なブロック名・状態・ブリッジ接続・認可。
5. 入口通行、階段、エレベーター、支持構造、周辺敷地・衝突、既存建築の保全。
6. そもそも**施工承認**は存在しない。`NOT PREPARED` のまま。

次工程はStep 8B/B4「読み取り専用のランタイム識別／非施工API契約確認の設計」。実機への読み取り専用処理も、新しいWindows操作も、必要と確認されるまで要求しない。
