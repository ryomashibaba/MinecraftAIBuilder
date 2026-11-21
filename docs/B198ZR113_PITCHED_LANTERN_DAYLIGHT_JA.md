# B198Z-R113 — R93灯籠庇の採光稜線を持ち上げる実3D建築案

2026-10-24 JST。Draft PR #128継続の独立c01建築研究。Qwen/Gemma推論やMinecraft施工ではない。

## 証拠と設計上の判断
- [R111の両OS実測](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39978338498)で右tier2+0.035の頭上7件は同一のR93灯籠庇三角形4474から生じると確定。
- R112の[Windows側実源記録](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40024243758)で庇の内側縁を35%/55%/75%/88%縮めても**7→7、4案すべて不採用**。5本旧経路のRay非悪化／真正床保持は満たしたが、主目的の頭上干渉を解決していない。Ubuntu実行結果が未確認なら両OSの合格と誤記しない。
- そこで単なる薄い庇の縮小ではなく、R93が本来狙った**灯籠の採光外観**を保ち、外側の長い本棚上端を固定したまま内側の稜線を立体的に持ち上げる。低い屋根・読書机・原テラスを削除しない。

## R113実装と採用条件
- [コード](../scripts/b198zr113-pitched-lantern-daylight-canopy.mjs)／[テスト](../scripts/b198zr113-pitched-lantern-daylight-canopy.test.mjs)。既存R112の実三角形同定・共辺連続・書架接合保護を基礎に、内縁後退率と採光棟持上げ量の4候補（0.55/+0.06、0.65/+0.09、0.75/+0.12、0.88/+0.15、いずれも単位なし）を分離した実3Dメッシュで生成。左右のZ駅の外縁頂点の高さ・幅は保存する。元R93右翼屋根のマージンを超える案、縮退、関係のない源三角形を変える案を拒否。
- R107の5本の実源Ray（床欠落・頭上・横断それぞれ）の非悪化に加え、R110の9地点×横3点の源床/勾配/通路網羅を保ち、頭上7件を**実際に減らしたときだけ**新しい実メッシュ案を選ぶ。最大改善を優先し、同値なら採光稜線の立ち上がりが少ない案を選択する。候補が無ければ源R107と同じ形状でHOLD。
- R60にR113比較JSONとOBJを追加。実変更案が合格したときだけ固定カメラの比較3Dを出す。旧R98/R107/R111/R112、凍結Qwen原本と歴史的資料は非変更。
- 初回のWindows/Ubuntu実源CI完了まで**採択したと主張しない**。R113の試験は既存R60フローを使い、新規ZIP/CMD/Workflowを増やさない。正常なビルド、源形状Ray、有効な室内機能、独立の人間美術、実Minecraft通行、実LLM汎用生成は別評価のまま。

## 絶対境界
NOT_PREPARED、9×BLOCKED、BuildPlan.operations=[]、constructionApproved=false、executionAllowed=false、Qwen/Gemma追加推論0、Minecraft世界接続/読取/書込/施工0、ローカルWork0、main/Freeze/Qwen原本変更0、PR #128 Draft/Unmerged維持。
