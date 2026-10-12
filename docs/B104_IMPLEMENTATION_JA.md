# B104 — 部屋と共用廊下の交互最適化（Minecraft Education優先）

## 概要
B103はB102で部屋を配置した後に回廊を再生成していた。B104は**部屋の初期配置に使う廊下を変更し、設計結果をフィードバックして再配置**する。

## 実装
- source/parallel/b104/main/b104-joint-layout.mjs: B100の床マスクとコアから独立した幅2セルのCROSS/BEND回廊骨格を生成。標準でBASELINEとCROSSの2案を探索し、部屋配置→B103回廊再生成→部屋再配置→全体3D再監査の交互探索を実行する。元の凍結コードは変更しない。
- source/parallel/b104/main/compile-b104.mjs: 5用途×3案の変化量、配置と再配置された室数、回廊形状変更、コア/出口候補、3D衝突を集約。5用途の代表階にレビュー用ASCII平面図を生成。
- source/parallel/b104/main/compile-b104.test.mjs: 30件の正常系・世界IO拒否・入力改ざん・構造監査。
- scripts/verify-b104-safety.mjs: 過去の有効室数への退行を防ぎ、施工禁止、安全ゲート、3D監査を検証。
- .github/workflows/qa.yml: 382件の回帰テストとB104安全ゲート。

## 幾何品質の比較原則
(1)要求した部屋数と廊下への接続・3D無衝突を最優先、(2)複数コアと外部出口候補、(3)廊下の使用セル数・部屋再配置の多様性を比較する。未達は黙って合格扱いしない。交互探索は有界探索であり、大域最適ではない。

ASCII記号: R=概念居室、D=概念入口、= は幅2の共有通路、C=予約コア、E=地上出口候補。これは完成建築の3Dレンダリングではない。

## 限界
- B102の矩形Greedy生成を内部で再利用している。全室全階の完全同時最適解は未認証。
- B103の螺旋階段は概念踏み面で、実Educationブロックの状態・手すり・踊り場・昇降・避難経路は未認証。
- 屋根・柱梁・外壁・窓・内装・家具・施工順序・実ワールド衝突の認証なし。
- 日本語自由文の完全意味理解は未達。外観や内部完成品質の人間評価も未実施。
- 次工程は読取専用のバージョン固定Educationブロック辞書、屋根/外装/内装の独立IRと建物全体レビュー。

## 永続的施工禁止
Minecraft Educationを先に扱い、Java版は後回し。B100以前の凍結原本/B101/B102/B103、旧296未承認室と18保留室は変更しない。
readiness=NOT_PREPARED、9ゲートBLOCKED、BuildPlan.operations=[]、commandCount=0、worldCoordinates=null、worldContacts=0、constructionApproved=false。
オフライン仮想座標のみ。Minecraftワールド接続・施工0。Github機能ブランチ/PR/Actionsを使用し毎工程ZIPは不要。
