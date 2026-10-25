# MinecraftAIBuilder — 最短AI再開入口
更新：2026-10-25 JST。**毎日の追記禁止。履歴は [R148までの原記録](../archive/AI_RESTART_HISTORY_THROUGH_R148_JA.md) とGit履歴で保持。**

## 正本
- [固定憲章](AI_PROJECT_CHARTER_JA.md) / [戦略v2](PROJECT_STRATEGY_V2_JA.md)
- GitHub: https://github.com/ryomashibaba/MinecraftAIBuilder
- 継続ブランチ: `feature/b198zr1-protected-architectural-revision`
- Draft PR #128: https://github.com/ryomashibaba/MinecraftAIBuilder/pull/128 （マージ、Ready化、Close禁止）
- 直近R148確認HEAD: `e52ee85f72dcca79dea76211849ae2f3084aa3a1`。**必ず再開時に最新HEAD/Actionsを再確認する。**

## 真の現在地
- R148: 保存済み本物のQwen3:14b回答をR146経路で再生（追加推論0）。4室・8設備・1モデル指定直接関係・2986ボクセル・SOURCE_ROOM_GRAPH_VERIFIED。材料「roof=sawtooth」だけホストが「metal」へ補正。元RAW SHA-256 `d67dc624744b4745e8e8c228e20bde00ccd39c7b506d0ad82753f54f1db82591`。
- 人間によるR146の3D画像評価は**建築美術不合格**。入口、窓、屋根と建築全体の質が不足。実Minecraft歩行・施工は未確認。
- R149: 外装表現の汎用生成器とR146比較を優先。コード反映後もCI・真正B143 3D比較・人間の美術判断を分ける。人間審査前の美術判定はHOLD。

## 直近の作業順
1. GitHub HEAD / Draft PR #128 / Actionsの実行結果を確認。
2. `source/ai/r149-architectural-expression.mjs` を中心に既存B143派生案とソース非退行を確認。`scripts/r149-quality-comparison.mjs` で同条件の実3Dを比較する。
3. 画像として良く見えるか、人が入口・正面性・窓・屋根・用途の理解しやすさを審査する。データだけの成功を美術PASSとしない。
4. 2回の建物固有修正より前に共通問題を抽出し、R150〜151で小型LLMの短い意匠IRと内部設備の形態、R152〜154で住宅/店舗/研究施設等の汎用性を測る。

## 不変条件
- 5軸(Aソース/CI、B実3D構造、C美術、D Minecraft実用、E実モデル未知用途)の判定を分離。
- Qwen原文・B143原本・過去成果・PR #128保護。モデル提案とホスト派生を明示。
- Qwen/Gemma推論と安全条件を満たす**試験ワールド**施工は包括許可済み。しかし `NOT_PREPARED`、9 `BLOCKED`、空の `BuildPlan` は勝手に解除しない。
- Chat+GitHub基本、Workは明確な優位性で個別相談。新規テンプレート、CI増殖、長文引き継ぎ、ZIP往復を避ける。
