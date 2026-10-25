# MinecraftAIBuilder — 最短AI再開入口
更新：2026-10-25 JST。**毎日の追記禁止。履歴は [R148までの原記録](archive/AI_RESTART_HISTORY_THROUGH_R148_JA.md) とGit履歴で保持。**

## 正本
- [固定憲章](AI_PROJECT_CHARTER_JA.md) / [戦略v2](PROJECT_STRATEGY_V2_JA.md)
- GitHub: https://github.com/ryomashibaba/MinecraftAIBuilder
- 継続ブランチ: `feature/b198zr1-protected-architectural-revision`
- Draft PR #128: https://github.com/ryomashibaba/MinecraftAIBuilder/pull/128 （マージ、Ready化、Close禁止）
- 直近R148確認HEAD: `e52ee85f72dcca79dea76211849ae2f3084aa3a1`。**必ず再開時に最新HEAD/Actionsを再確認する。**

## 真の現在地
- R148: 保存済み本物のQwen3:14b回答をR146経路で再生（追加推論0）。4室・8設備・1モデル指定直接関係・2986ボクセル・SOURCE_ROOM_GRAPH_VERIFIED。材料「roof=sawtooth」だけホストが「metal」へ補正。元RAW SHA-256 `d67dc624744b4745e8e8c228e20bde00ccd39c7b506d0ad82753f54f1db82591`。
- 人間によるR146の3D画像評価は**建築美術不合格**。入口、窓、屋根と建築全体の質が不足。実Minecraft歩行・施工は未確認。
- R149: 入口、窓、軒先のホスト由来外装派生案を実装。R150: Qwenが選んだ既存設備8個の範囲内にのみ用途別の造形を追加する汎用設備表現を実装。
- R146→R149→R150の3つの真正B143ビューアを同じ比較HTMLで生成する構成。**直近の品質CIはQueuedであり合格未確認。美術HOLDを維持。**
- R151: 既存の一度のQwen/Gemma回答に、任意の短い `architecture`（入口、窓の配置方針、屋根端部の3選択）を明示してもらうオプトイン経路を実装。`--architecture intent` は `--topology graph --equipment assembled` と組み合わせる。モデルが未指定のR146原文をモデル選択と偽らない。実モデルでの新機能試験は未実施。
- R152: `--architecture massing` を既存の単発モデル応答経路へ追加。モデルが `section=continuous|raised-entry` を選択したときのみ、入口室の低い屋根を切り上げ、本物の天井高・周囲の壁・高窓・上屋根を再構成する。R146旧Qwenの4室/8設備3Dとの4案比較では**R152意図はホスト研究案**（元Qwenの選択ではない）。3用途の検証は模擬応答のみ。最新CI・画像審査・実Minecraft歩行は未実施／未確認。

## 直近の作業順
1. GitHub HEAD / Draft PR #128 / Actionsの実行結果を確認。
2. R146/R149/R150/R152の4案B143比較が実際に生成されたか確認し、目視審査。次に未知用途3件をR152実モデルの一度の応答で検証。CI/HOLDは人の目での合格を意味しない。
3. 画像として良く見えるか、人が入口・正面性・窓・屋根・用途の理解しやすさを審査する。データだけの成功を美術PASSとしない。
4. 2回の建物固有修正より前に共通問題を抽出し、R150〜151で小型LLMの短い意匠IRと内部設備の形態、R152〜154で住宅/店舗/研究施設等の汎用性を測る。

## 不変条件
- 5軸(Aソース/CI、B実3D構造、C美術、D Minecraft実用、E実モデル未知用途)の判定を分離。
- Qwen原文・B143原本・過去成果・PR #128保護。モデル提案とホスト派生を明示。
- Qwen/Gemma推論と安全条件を満たす**試験ワールド**施工は包括許可済み。しかし `NOT_PREPARED`、9 `BLOCKED`、空の `BuildPlan` は勝手に解除しない。
- Chat+GitHub基本、Workは明確な優位性で個別相談。新規テンプレート、CI増殖、長文引き継ぎ、ZIP往復を避ける。

## R154（建物全体の実ボリューム構成）
- R153 CI #40173984819 は152/152テストPASS。4案の真正B143比較で、**依然として低い直方体が主体で建築美術はHOLD（未達）**。
- R154: モデルが同一の1回答で `--architecture volumes` を選んだとき、`volumeHierarchy=single|paired` と `arrivalSpace=flush|covered` を選択できる意味IRを追加。共通B143生成器が実入口室の上部天井を除去、実4壁＋高窓＋屋根を持つ高い主ボリュームと、任意の別高さの第2室ボリューム、入口前の屋根付き支持床・柱を構成する。保護対象の元室/設備/直接ドアは変更しない。
- 保存済みQwen 4室/8設備を用いたR154比較案は**ホスト研究選択**でありモデル自身のR154設計実績ではない。5案比較を既存R149の同一Actions artifactで生成する。CI実行/本物の画面・美術判断・Minecraft実歩行は本HEADに関して未検証。施工は `NOT_PREPARED` / 9 BLOCKED / BuildPlan空のまま。
- 直近の優先：R154 CI完走、5案の真B143実3D比較と人間美術評価、次いで3つの未知用途へ実Qwen/Gemmaで応答を採取し一般化を判定。外装装飾・CIの増殖に戻らない。

## R153（品質CI障害を最優先修正）
- R152品質CI（run 40173353212）実測：151テスト中148成功、3失敗。R149/R150/R152関連ソース生成と比較テストは成功。しかしR143独立監査が**直接リンクに絡まない別室の部屋境界改ざんを誤PASS**する不具合を検出した。
- R153ではR138実壁の独立した固定座標幾何式から「全3/4室の物理sectorと全ranges」を再構築し、あらゆる未検証室の境界改ざんをHOLDする。偽の室IDの不正はより早期の段階で正しく例外が発生していたため、テストのエラーパターンだけ整合させた。
- 旧R140の2500ボクセル固定下限は実4室グラフの正当な規模より高い不適切なmagic numberだった。全体source/primitives数一致、1000以上の実ブロック量、元の多室動線ソース検証を維持するテストへ変更。
- **新HEADの再実行CIと真正B143四案成果は未確認**。安全ゲートは変わらない。R153は美術形態の新しい成功を主張せず、QAの信頼性復旧工程である。
