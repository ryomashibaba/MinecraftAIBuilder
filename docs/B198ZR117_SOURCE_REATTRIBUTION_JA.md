# B198Z-R117 — 幾何改修後の真のfirst-hit源面を追跡

2026-10-24 JST。独立研究c01《潮光の裂帆図書館》、Draft PR #128継続。

## 確認済みの失敗
[R116再検証CI](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40028599761) と [R115実源CI](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40026552643) はいずれもWindowsとUbuntuで試験成功。しかしR113/R115はそれぞれ4つの真正3D形状案すべて頭上Ray7→7、床検出/横断や元5通路に悪化なし。改修案はHOLDで現行モデルに採用されていない。

## R117の設計判断
単にもう一度庇を引っ張る・持ち上げるのではなく、**改修後に当たっている実source faceが変わったか**を直接見分ける。R99のfirst-hitは遮蔽下の全faceを表さないことに注意する。元R107の実メッシュ、R98原本のハッシュ、右R91+0.035の実床9×幅3点を保存し、R113最大変形（庇の内縁率0.88＋高0.15）とR115最大変形（庇＋書架壁を0.16上昇）を生成。双方で各Rayがどの部材kind・三角形番号・交点を持つかを記録し、元/後の頂点XYZや位置変化を突き合わせる。

[実装](../scripts/b198zr117-post-canopy-real-source-hits.mjs)／[専用検証](../scripts/b198zr117-post-canopy-real-source-hits.test.mjs)。CI実源ログが出るまでは変更後の衝突源を推測せず、旧建築HOLDを維持。R117は改修源の特定であって実3D建築採択ではない。次の候補は真のsource部材に限定し、元の床・書架の機能・入口/空洞/採光を保護する。

NOT_PREPARED / 9 BLOCKED / BuildPlan.operations=[]、新Qwen/Gemma推論なし、Minecraft操作なし、ローカルWorkなし。main/Freeze/B143の元Qwen原本/PR #128 Draftは保護。
