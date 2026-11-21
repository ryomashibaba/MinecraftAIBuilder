# B198Z-R110 — 右翼tier2のR91→閲覧室を実床に沿って再構成する経路案

2026-10-24 JST。既存PR #128 Draft／未マージ。人手/コードによる《潮光の裂帆図書館》独立研究であり、実Qwenによる生成改善を示すものではない。

## 実験開始根拠（確定）
- [R109実メッシュCI](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39969992086) はWindows／Ubuntu両OS成功。両ログ同値：R91右tier2の頭上Rayは元の5側方経路合計2、実床標高を両端で取る比較線では条件付き1。+0.023はR94入口敷居の源床を参照することで1→0、+0.035はR94敷居とR87テラス床を両端に参照しても1→1で不合格。
- 全5経路の足元支持未検出・横断交差は0。床の撤去や新規増設が必要だという証拠は**まだない**。新しい床を捏造したり、検査の陰性だけで美術・歩行を合格扱いしない。

## 形状・機能の設計上の対応
- [R110モジュール](../scripts/b198zr110-source-contoured-right-room-approach.mjs)／[専用テスト](../scripts/b198zr110-source-contoured-right-room-approach.test.mjs)ではR107本物の建築メッシュと原R98のSHAを照合し、R109「1件残存」の診断値が変わったらfail closed。
- 問題が残る+0.035側のR91実床端点を基準に9地点（t=0, 0.125,...,1）を定め、各地点でR94入口敷居／R87テラス／R91床の**実際の三角形のXZ内挿標高**を取得する。提案足元の床上オフセット4種類（+0.003/+0.004/+0.005/+0.006）を比較し、3横幅サンプルすべての床近接、8つの小区間の勾配≦0.28、厳格なR99足元・頭上・横断Ray、セグメント網羅を検査。欠落・断絶・新衝突があれば案はHOLD。
- R107/R109の旧経路および旧三角形は**一切変更しない**。合格条件を満たした候補だけ、3D空間を通る経路点列・OBJ line として出力する（OBJ lineは床メッシュでも実建築でもない）。適切な連続標高が存在しなければ、建築として本当に必要な敷居移行部の形状設計へ進む。
- R60/R102既存レビュー出力へ `R110_R91_SOURCE_CONTOURED_ROUTE_EVIDENCE.json` と `R110_R91_SOURCE_CONTOURED_ROUTE.obj` を追加。別のZIP・CMD・ワークフローは追加しない。

## 判定の限界
- 9点の実床を調べることは、隙間・傾斜・段差の全測定や連続接地・人体幅の安全認証ではない。部分的なソース幾何改善と実際の通行、美術品質、Minecraft実機、汎用生成モデル性能は独立した審査のまま。
- R110の実メッシュテストは[Windows/Ubuntu Actions](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39976426159)で起動。**結果を確認する前は候補成立・改善件数を断定しない**。Push/PRは軽量スモークへ戻し、フルR58〜R110履歴は既存手動R60回帰に残す。
- 人間の正面/斜視/側面/俯瞰/内部/入口美術審査は未実施。設計の有用性を数値PASSで代用しない。

## 不変条件
`NOT_PREPARED` ／ `constructionApproved=false` ／ `executionAllowed=false` ／ 9 `BLOCKED` ／ `BuildPlan.operations=[]`。追加Qwen/Gemma推論、Minecraft接続・読取・書込・施工、ローカルWorkを実行しない。B143/Qwen原本、main、旧Freeze、R98/R109旧形状、PR #128 Draft状態を維持。
