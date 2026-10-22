# B198Z-R86 — 全7層の有限幅3Dデッキ研究
2026年10月22日 JST。既存Draft PR #128 / branch feature/b198zr1-protected-architectural-revision。

R85は研究用中心線しか作らず、有限幅の足場・折り返し・外殻との干渉が未確認だった。R86は左3層・右4層それぞれの既存R85候補から、**限定的な幾何条件を通る場合だけ**2区間の幅付き研究用三角形面を生成する。候補が満たない場合、外殻を削ったり、アトリウムを横断する板を増やしたりせず、その層の追加面を0にする。

R85/R84/R83から原本SHA、全証拠JSONを再計算して照合。R85の二段候補に対し、脚の勾配/長さ、屈曲角とミター、左右外縁13点×2区間の保護空洞侵入、左右縁/中心×3高さの既存外殻・屋根・ガラス三角形との交差をサンプリング調査。全条件通過後にだけ4三角形の実3D研究デッキを追加。R84の元の面・吹抜け・研究の承認状態は不変更。

重要：幅0.032、クリアランス試験高さ0.004/0.045/0.10は正規化された美術研究値で、メートル、人体、Minecraftブロック寸法ではない。離散交差検査は完全掃引衝突、支持床、構造強度、実際の歩行、法規や建築美術PASSを認証しない。旧R83/R84連絡面も幅検証を済ませたものと扱わない。合格した限定条件と「建築完成」を混同しない。

成果物：R86_READING_TIER_WIDTH_SCREEN.json、R86_READING_DECK_WIDTH_CANDIDATES.obj、R86_WIDE_DECK_CONCEPT_REVIEW.html。従来R60の一回レビューへ統合。人間レビューはNOT_REVIEWEDのまま。

R85のWindows CIで旧一時失敗があり、同HEADの別実行はWindows/UbuntuともPASS。根因を断定できないため「修正した」とは言わず、同じ保存証拠でR86の連続再計算が一致する回帰を追加。失敗しても原本再照合を緩めない。新規の専用workflowは追加しない。

原本・main・Freeze・旧承認は不変。Qwen/Gemma等のモデル推論0、Minecraft世界接続/読取/書込0、NOT_PREPARED、9ゲートBLOCKED、BuildPlan.operations=[]、constructionApproved=false、executionAllowed=false。PR Open/Draft、merge/close/ready禁止。

次の優先事項は、形態の人間審査に基づいて書架床、昇降路、入口、展望ラウンジを**一体の利用可能な建築に改善**し、固定図書館テンプレートではなく汎用的な生成設計へ反映すること。