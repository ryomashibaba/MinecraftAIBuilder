# B198Z-R119 — 実R93閲覧室2座面帯を連動させる源3D形状研究

2026-10-24 JST。Draft PR #128 / 独立コード研究《潮光の裂帆図書館》。Minecraft施工ではない。

## R118両OS実測からの原因
[Windows・Ubuntu source CI #40039411668](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40039411668)でR118の四つの真正座面再配置案を比較。4案とも形状HOLDで頭上Ray7→7。座面4476の35%後退では4476と4535が残り、55%以上では**別source三角形4535のみ**が全7件のfirst-hitを占めた。床の真正27サンプル、側面0、旧5通路の非悪化は保たれた。

## 具体的な改修
[実装](../scripts/b198zr119-two-reading-bay-setback.mjs)、[試験](../scripts/b198zr119-two-reading-bay-setback.test.mjs)。旧R107の源SHAとB143原本非変更を守る。R115の高窓庇とR118の第一帯4476の55%後退を使用し、残存交差源4535の実source kind/三角形頂点を計測する。**もし源4535が本当にR93読書座面なら**、第二帯の共辺つながりを探索し、前縁を35/55/70/82%書架側へ後退、後縁は固定。2座面帯が同じ部材を二度移動させる場合は拒否。原本構造・床・入口・外殻を編集しない。

各候補は元R110経路の源床9×幅3点、全区間プローブ、床交差0、側面0、頭上7未満、元R107旧5本の源実メッシュ通路非悪化、座面残存幅0.0085以上（正規化）の全条件を満たした場合のみ研究用3D代替形状として返す。全案非合格なら旧R107形状のまま。依然として実際に座れる寸法・人体歩行/構造・美術の審査は未実施。

R119の検証用JSONとOBJを既存R60へ統合し、成功案のみR114の元全館/候補全館/実変更三角形という3ペイン×6視点に掲載。R119実源一度きりのWindows/Ubuntu CIが完了するまで改善件数は断定しない。新しいZIP/CMD/CIワークフローは増やさない。

安全ゲート：NOT_PREPARED、constructionApproved=false、executionAllowed=false、9 BLOCKED、BuildPlan.operations=[]、Qwen/Gemma追加推論0、Minecraft世界操作0、ユーザーPC Work0、main/Freeze/元B143非変更、PR#128 Draft継続。
