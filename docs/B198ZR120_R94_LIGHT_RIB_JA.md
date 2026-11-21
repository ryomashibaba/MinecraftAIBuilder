# B198Z-R120 — R94採光リブによる真の3層干渉を解消する候補

2026-10-24 JST。PR #128 Draft／独立研究《潮光の裂帆図書館》、人手/コードによる研究。実Qwenの汎用生成能力とは別物。

## 実測による原因の変遷

[R119 Windows / Ubuntu実源CI](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40049744767)は両方SUCCESS。R118で座面4476を55%後退させた後に残る頭上Ray7件のfirst-hit源4535を実測したところ、座面ではなく **right_R94_SUSPENDED_LIGHT_RIB_NOT_HEADROOM_CERTIFIED** であった。R119は二番目の座面を動かさずHOLD。R117から確認した順序は R93庇4474→R93連続座面4476→R94吊り下げ採光リブ4535 となる。各段階のRayのfirst-hitであり、最後の遮蔽源である保証はない。

## R120の本物の3D建築修正

[実装](../scripts/b198zr120-r94-suspended-light-rib-relief.mjs) / [テスト](../scripts/b198zr120-r94-suspended-light-rib-relief.test.mjs)。

- R115の**実庇＋書架頂** +0.16 と、R118の**読書座面**55%セットバックを同一源メッシュ上で再現した後、衝突している R94採光リブ4535 とそれに実際につながる R94採光エッジ4536を局所再造形する。
- 内側の上端・リブ先端を+0.045/+0.070/+0.100/+0.135（正規化）だけ上昇させる。**書架外側の据え付け点、採光エッジの外側、元のR94開口柱・元床・読書用座面と入口・外殻は保存**。三角形は削除しない。
- 真正の共頂点と三角形面積、未変更面に浮いた接続が無いこと、元R98・R107 SHA、既存R110源床9×幅3点＋区間、床0、横方向0、頭上7件の削減、旧5通路非悪化を確認。全案不合格なら現行R107の元モデルをそのままHOLD。建築に採用するのではなく、候補だけを保存する。
- 旧R60レビューでJSON/OBJと、実測採択候補のみ元全館／候補全館／差分局所の同カメラ3ペイン×6視点を生成する。R94の屋根曲線上の幾何余白は調べるが、荷重・屋内の採光実態・歩行や人の身長は認定していない。
- 既存ワークフローだけを使用。R120の両OS実源試験は **R120初回pushのみ** で起動し、それ以降は既存軽量のquick/手動fullに留める。結果が出る前に交差削減や美術完成を主張しない。

NOT_PREPARED / constructionApproved=false / executionAllowed=false / 9 BLOCKED / BuildPlan.operations=[]。追加Qwen/Gemma/課金API/Work/Computer Use/ワールド接続・読取・書込・施工なし。main、Freeze、B143 Qwen原本、PR #128 Draftを保護。
