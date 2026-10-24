# B198Z-R111 — 右翼tier2の実床を保存した局所仕上げ面改修

2026-10-24 JST。PR #128 Draft／未マージ。c01《潮光の裂帆図書館》は独立した人手・コード美術研究であり、Qwenの生成能力の証明ではない。

## R110の確定結果
[R110実メッシュCI](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39976426159)はWindows/UbuntuともSUCCESS・同じログ。右翼tier2ではR91→R94/R87の9地点×横幅3点すべてに実床があり、最大勾配0.125942（正規化）。しかし足元高さ0.003/0.004/0.005/0.006の候補4つは全て頭上Ray7／床未検出0／横断0でHOLD。数値上の屋根・家具・仕上げ面との干渉原因を無視しない。

## R111の形状改修候補
- [実装](../scripts/b198zr111-reversible-floor-finish-transition.mjs)と[テスト](../scripts/b198zr111-reversible-floor-finish-transition.test.mjs)。R110頭上Ray7件の本当のkind・三角形番号・交点を実メッシュから検出。R99の証拠が24ステーションで切り詰められたら採用不可。
- **7件すべてがR87読書テラス床の浮いた仕上げまたはR94入口しきい仕上げと証明できた場合に限り**、同じkind・共辺で連続した仕上げ領域全体を、元の真正床より+0.001/+0.002だけ高い局所形状へ再構成する。各頂点は元のright_reading_terraceの標高を参照し、元資料と衝突部材を厳密照合する。XZと意匠kindを維持、既存の真の床・書架・読書机・門柱・外殻は変えない。
- R107の既存5本の床未検出・頭上・横断Rayを個別に悪化させず、R110の9地点×横幅3点と勾配・R99を守り、実際に頭上Rayを減らしたときだけ別の3D形状として採用。支持や美術が未認証のまま「PASS」扱いはしない。
- 条件を満たさない場合は**旧R107と完全同形のHOLD**。旧R98/Qwen資料と歴史的形状を上書きしない。既存R60結果に証拠JSONとR111比較OBJを追加。見た目の比較は採用候補がある時だけ同一カメラで出す。新しいZIP/CMD/Workflowは増やさない。
- R111の実源両OS CI結果が得られるまでは、交差源7件のkind、候補の採否、実際の形状改善件数を推定して書かない。外観・内部機能・人体歩行・構造・Minecraft環境の検証は引き続きHOLD。

## 固定の安全境界
NOT_PREPARED、constructionApproved=false、executionAllowed=false、9 BLOCKED、BuildPlan.operations=[]、追加Qwen/Gemma推論0、Minecraft世界接続・操作・書込0、ユーザーPCのローカルWork0。原本・main・旧Freeze変更禁止、Draft PR #128未マージ維持。
