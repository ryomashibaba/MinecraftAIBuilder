# B198Z-R124 — 読書座面65%回復と真正3D比較

2026-10-24 JST / MinecraftAIBuilder / Draft PR #128。独立コード建築研究であり、Qwen実推論による生成ではない。

## 建築上の未解決問題

[R123の両OS実源検証](B198ZR123_R94_RIB_TERRACE_TRIALS_JA.md)はR94採光リブ4535/エッジ4536と上層テラス3477の新規厳密交差を回避した。しかしR118後の読書座面4475/4476は元の45%しか残っておらず、人が本当に座れるか未判定。幾何Ray0だけで用途達成とは言えない。

## R124実装

- [R124本体](../scripts/b198zr124-reading-seat-art-study.mjs)と[テスト](../scripts/b198zr124-reading-seat-art-study.test.mjs)を追加。
- R107全館4,716源面とR98元SHAを保持し、R121/R120及びR123有望候補SHAを真正確認する。既存原本・研究候補の上書きなし。
- R115庇・書架上端、R120採光リブは元の対応案を保持しつつ、R118の座面後退率を0.55から0.35に変更し、座面面積を元の約65%へ回復する3つのリブ先端位置候補を比較する。
- 新しい厳密な別部材貫通、R121旧共有辺・共有頂点の接合、R110実源9地点×3幅と床・頭上・横断Ray、旧5経路の非悪化を判定する。問題があればHOLDにする。
- GitHub既存R60一時Artifactに、原本・R123・R124案の真正全館OBJ（各4,716面）と6視点比較HTML、検証JSONを保存する。6視点HTMLはPainter式の概略投影で**正確な遮蔽（z-buffer）ではない**。人による美術審査の代理ではない。

## 合格境界と次の開発

この工程の局所幾何候補は建築完成ではない。人体の読書座面寸法、座席への到達、採光、荷重、全館自己交差、室内美術、Minecraft実使用、汎用AIの生成能力は未認証。新候補のCI結果は必ず実ジョブログで確定する。R124後は、検査増殖でなく建築と利用体験の再設計、自由指示からの汎用AI構想能力へ重点を戻す。

安全：NOT_PREPARED / constructionApproved=false / executionAllowed=false / 9 BLOCKED / BuildPlan.operations=[] / Qwen・Gemma新推論0 / World read/write/build 0 / ユーザーPC Work0。PR #128 Open・Draft・Unmerged。旧Freeze・main・B143原本保護。
