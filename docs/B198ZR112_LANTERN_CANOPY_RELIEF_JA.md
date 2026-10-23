# MinecraftAIBuilder B198Z-R112 — R93灯籠キャノピーの内縁再設計

2026-10-24 JST。継続ブランチとDraft PR #128。これはc01《潮光の裂帆図書館》を使った独立手続き型建築研究であり、実Qwen/Gemma出力の改善や施工ではない。

## 確認済みの出発点
- [R111実ソースCI（Windows／Ubuntu成功）](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39978338498)のログを両OSで確認。R110右翼tier2 +0.035 の実床コンター経路で頭上交差7件／床未検出0／横断0、7件とも**同一R93灯籠庇三角形4474**、kind `right_R93_ANGLED_LANTERN_CANOPY_ART_STUDY`（通路沿いの複数ステーション）。R111のR87/R94仕上げ床形状変更は**0件でHOLD**、成功ではない。
- この庇はR93が実閲覧床に沿って生成した4連ベイの書架・高い庇・読書長椅子の構成の一部。入口干渉を直すために庇を全面撤去したり、建築美術・図書館の用途を犠牲にしない。

## R112: 実形状の控えめな変更
- [実装](../scripts/b198zr112-lantern-canopy-clearance.mjs)／[テスト](../scripts/b198zr112-lantern-canopy-clearance.test.mjs)。旧R107と凍結R98原本のSHAを先に照合し、R111で確認した4474番庇に頭上交差7件すべてが帰属することを再証明。
- 同じR93の庇を形成する共有辺連結三角形を実メッシュから選択。**外側の書架上端を固定したまま内側の張り出し縁を内側へ引き戻す**4つの係数（0.35/0.55/0.75/0.88）を比較。各Z地点の内縁／外縁を区別し、上下位置と両端の接合高さを保持。三角形数/庇自体を削減しない。局所領域ではない大型改修・零面積・原本と関係ない面の変更は拒否。
- 現行R107の5本の経路ごとに足元未検出・頭上・横断の非悪化を要求。加えてR110の実床沿い9地点×幅3点、勾配、R99交差/網羅を再評価し、**元の頭上Ray7件より改善した候補だけ採用**。改善数最優先、同じ改善なら小さい後退量を選択。無改善なら旧R107と同形HOLD、採用偽装をしない。
- 既存R60出力に `R112_R93_LANTERN_CANOPY_CLEARANCE_EVIDENCE.json` と候補OBJを加え、採択案だけ原寸カメラ共通の3D比較を表示。既存R98、R107、R111のOBJ/履歴を上書きしない。
- 初回両OS実源テストは[CI #40024243758](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40024243758)（同コミットもう1件#40024249354）で登録、**完了・候補採否は未確認**。ソース検証成功は美術審査成功ではない。次工程では実ログを見て採択・HOLDに応じて狭域庇形状の再設計か全館多視点による実際の美術/利用性の審査へ進める。

## 固定の安全
NOT_PREPARED、constructionApproved=false、executionAllowed=false、9 BLOCKED、BuildPlan.operations=[]。追加Qwen/Gemma推論0、Minecraft世界接続・読取・書込・施工0、ローカルWork0、main・旧Freeze・B143保存原本・PR #128 Draftは非変更。実アバター歩行、荷重支持、独立人間美術、AI汎用生成能力はHOLD。
