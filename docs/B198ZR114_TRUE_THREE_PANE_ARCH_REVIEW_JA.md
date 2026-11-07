# B198Z-R114 — 採択したR93庇の「実形状3ペイン×6視点」比較を正常化

2026-10-24 JST。既存Draft PR #128上の人手/コードによるc01建築研究。ユーザーPCのWork・Minecraft・Qwen/Gemmaを実行していない。

## 重要な実装不具合を発見
- R97既存の「source-triangle六視点比較」関数 `buildR97CompareViews` は**ちょうど3形状**を渡すAPI契約。一方、R111/112/113の採用済み形状をR60画面で比べるコードには**形状2件**しか無く、成功した場合だけ `THREE_SOURCE_VARIANTS_AND_DETAIL_FOCUS_REQUIRED` でレビュー生成が壊れる潜在バグがあった。
- 直近のR111/R112は実測HOLDだったため本不具合が発火していなかった。R113は[既存Windows/Ubuntu試験](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40024745083)がこの工程開始時にqueued、採否の実測結果は未確定。採用されていない形状を新しい現行版に昇格させない。

## 修正したレビューの3実形状
- [R114アダプタ](../scripts/b198zr114-actual-three-pane-art-review.mjs) は「(1)元の全館メッシュ、(2)採択された候補の全館メッシュ、(3)候補で実際に変わった源三角形だけを抜き出した局所メッシュ」の**実源3案**を同一カメラ・同一縮尺で6視点へ投影する。
- 3枚目は建築全館を表すものではなく、局所変更部材を切り出した**CLIPPED／変更面のみ**と明記。推測画像や架空面を生成しない。R111なら床仕上げkindのみ、R112/R113ならR93灯籠庇kindのみの変更を許し、異種三角形改変や全館波及や無差分はfail-closed。元/候補の完全mesh SHAを証拠に記録。
- 既存R102/R60の一本の出力経路に `R114_REAL_THREE_PANE_ARCHITECTURE_REVIEW_EVIDENCE.json` を追加。R111〜113の各条件付き成功ブランチはR114関数を使うため、実変更候補が発生しても「2形状しか渡せずR60が失敗する」既知問題を再発させない。変更なしHOLDの場合は比較画を捏造しない。
- [R114 unit test](../scripts/b198zr114-actual-three-pane-art-review.test.mjs) は3ペイン×6視点・一致した三角形数/アーティファクト保存/不変源の保護・床や外殻への不正改変拒否を検査。軽量PR CIと従来の手動フル回帰の両方に組み込んだ。**CIが成功したかはActionsの実測結果を確認するまで未確定**。

## 美術・技術の限界
6視点は本当の源メッシュの頂点から投影した静的SVGで、ポリゴンを奥行き順に並べた近似にすぎず、正確な可視面計算ではない。視点や見た目を人がレビューする道具を修復した工程であって、R113の実通行可能性・美術合格を実証したものではない。実3D形状の採否は**R113の実源Ray改善および保護条件**に従う。

NOT_PREPARED / constructionApproved=false / executionAllowed=false / BLOCKED×9 / BuildPlan.operations=[]。追加Qwen/Gemma推論0、ワールド接続・読取・書込・施工0、ローカルWork0。main・旧Freeze・凍結B143/Qwen原本不変、Draft PR #128継続。
