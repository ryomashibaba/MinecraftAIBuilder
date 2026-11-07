# B198Z-R116 — R113の実メッシュ4候補比較が中断する不具合を修復

2026-10-24 JST / PR #128 Draftの独立c01形状研究。

## 実際の失敗ログ
Windows・Ubuntu双方の[Actions #40024745083](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40024745083)にてR113 full-source testはFAIL。直接原因は`B198ZR112_AUTHENTIC_R93_CANOPY_TRIANGLE_AND_BOUNDED_RETRACTION_REQUIRED`。R113は率0.55/0.65/0.75/0.88の4種を要求するが、再利用するR112 helperは0.35/0.55/0.75/0.88だけを許可していた。0.65で例外が起き、それ以降の候補を検証できない。**庇の幾何学的不合格という実証ではない**。

## 再設計と安全性
- R112で検証された従来の4候補や図書館原形は変えない。0.65はR113が明示的に許可した時だけ受け取り、勝手な一般化や元の候補変更をしない。
- R113の4候補を独立した検証対象とし、真のsourceによる屋根マージン不足、実源三角形不適合など既知のB198ZR112/113エラーは個別`rejectedByRealSourceGeometry`として残す。**予期しない例外・ソース欠損は引き続き全体FAIL**とし、本当の障害を握り潰さない。
- 0.65の再現用小テスト・既存R113 full-source実メッシュ試験を使い、Windows/Ubuntuで再測定できるよう既存R60へ投入。R115の書架一体型天井案は別工程であり、その結果と混同しない。
- 庇・床・家具・入口・歴史的R98/R107形状を上書きしない。実形状候補が真の幾何検証を通った場合のみR114の3ペイン×6視点比較に入る。**CIがPASSでも人の美術・実歩行・構造認証ではない**。

安全：NOT_PREPARED / constructionApproved=false / executionAllowed=false / 9 BLOCKED / BuildPlan.operations=[]。新しいQwen/Gemma推論0、Minecraft接続・読取・書込・施工0、ローカルWork0、mainマージ0、PR #128 Draft維持。
