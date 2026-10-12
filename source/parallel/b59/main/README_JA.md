# B59 — Conceptual Corridor Gap vs Bare Floor Connectivity

## 目的
B58の床・縦コア候補と、B31の314概念ドア、B42のアパート上階5連絡点を組み合わせ、**実際のドア到達を証明していない位置**を定量的に区別する。

## 成果
- 5棟30階・314概念ドアを、B57の原本床ラスタで独立照合。
- アパート上階5層・65概念ドアに対し、旧B42の候補階段コネクタ（各階10ローカルセル）を起点とした床面4近傍の最短候補経路を、現行B57床とB42上階代理床の両方で比較。
- B42歴史レビューの「上階着地点から13ドア中1件だけ到達・12件未到達」を変更せず、床・壁・廊下・実ドアを区別。
- B42代理マスクの2セル欠落×5階間を維持。基準間で無断の床修復・同一視をしない。
- 出力には各ドアの床のみの最短経路・距離・未検証属性を記録（実際の廊下予約や建築命令に転用不可）。

## 数値の意味
`nominalFloodReachable = 314`、`upperNominalBareFloorReachable = 65` は**壁がないと仮定した単一の床面連結性の証明**。廊下が生成された、部屋間を歩ける、実際の階段を置ける、という意味ではない。

`historicReportedReachable = 5` および `historicUnverified = 60` はB42の旧概念廊下レビューからの値。数値のモデルが違うため、比率を同じ意味で比較して機能改善を主張しない。

## 実行
```
cd source
node verify-b59-package.mjs
node --test parallel/b59/main/compile-b59.test.mjs
node parallel/b59/main/run-b59.mjs
```
すべて読み取り専用。ファイルの上書き、Minecraft/Bridge/WebSocket接続、コマンド発行、施工・スキャンなし。

## 次工程
本番 `engine/src/architectural-quality.js` と `modules/architectural-library.js` 等の原本をWindows読み取り専用収集ツール経由で取得し、版ハッシュと本番生成機構を比較。取得できなければ、B42の概念廊下・部屋境界・ドアに関する十分な資料を優先して取り込む。実装がないものを本番互換とみなさない。
