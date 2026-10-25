# MinecraftAIBuilder — 最短AI再開入口

## R168実ユーザーZIP監査 → R169 任意家具詳細と実動線の整合（2026-10-25）
- 受領 `r157-unknown-use-20261025T125222536Z-r168-grid-offline.zip` の `R167_OFFLINE_REPLAY.json` を解析。**真のB143派生ソース生成は住宅 1,697ボクセル、店舗 1,765ボクセルで計2/3、研究施設は0**。全件新規モデル呼出0、Minecraft書込0、ART HOLD、NOT_PREPARED、9 BLOCKED。
- 住宅4室: living/sleeping/kitchen/storage、モデル指定直接扉2、ホスト追加連絡扉1。店舗4室: craftwork/storefront/inventory/employee、同2+1。いずれもホスト研究用4室グリッドであり、元モデルのcentral-spine実現には**該当しない**。原文SHA/派生SHA記録あり。
- 研究施設（8設備）: `R150_ROLE_ORIGINAL_EQUIPMENT_ACCESS_OR_ROOM_ROUTE_REGRESSION`。実家具配置はR149時点で経路成立。原因は後続の**任意の**R150細部追加が通路・設備アクセスを再度遮ること。部屋／設備の数や位置を黙って削除する代わりに、R169では詳細追加だけを安全な順に再採択し、通行を損なう追加装飾をスキップして理由を個別記録する。
- 5方向画像美術審査: 住宅と店舗とも同じ24×24のほぼ平面長方形屋根・同種の外壁と窓。差が小さく**現代建築の美術水準未達**。成功は「室内の機能と現実B143ソースの生成」であり、外観ART PASSではない。
- R169変更: `source/ai/r150-furniture-articulation.mjs` が任意詳細を元設備境界内かつ全室/全設備への2幅経路の通過時のみ採用する。危険な詳細は `suppressedUnsafeComponents` に記録。通常経路では全件採用不能ならHOLD。**保存済みモデルの明示研究オプションに限り、全詳細保留でも安全な元R149家具付き3Dを維持し、ART HOLD_DETAILS_DEFERRED と記録**。原家具・原源形状は不変。合成8設備の回帰テスト追加。オフラインZIP出力名 `R169_FURNITURE_EVIDENCE_ZIP` は旧R168を上書きしない。
- 未確認: R169の合成CI、ユーザー保存済み実3用途による再生、実Minecraft内歩行、美術品質。次は **再推論なし**で保存済み原本のR169 ZIPを検査。各ソース真偽と家具詳細の抑制状況を確認後、独立した外観・高さ・ボリューム改善に着手する。旧原本・main・Draft PR #128・施工禁止を維持。

## R167実モデル原本の失敗判明 → R168共通生成器研究（2026-10-25）
- 実ユーザー保存済み `r157-unknown-use-20261025T125222536Z` のQwen3:14bによる3用途回答を、追加推論0回でR167再生。原文SHAは住宅 `ee1a1a30…`、店舗 `8623599c…`、研究 `3cb09a75…`。**R167は3件とも実B143生成0/3、真正美術成功0件**。
- 原文共通問題：`layout.axis` に文字列 `z` ではなくリクエストの方向説明オブジェクトをコピー。R167の研究派生ではこれを`z`に限定補正し、**補正はホスト由来、モデルの自発的軸選択ではない**と明示。
- 補正後HOLD：住宅と店舗は共有ノードを持つ2本の直接部屋接続 `R139_RELATIONS_GRAPH_REQUIRES_RICHER_GEOMETRY`、研究は機器IDが旧20字を超えるため `R135_FURNISHED_UNSUPPORTED_SEMANTIC_OBJECT`。3件とも元回答・安全ゲート維持。
- R168研究では、一般的な長めの設備IDを検証し、必要時は短い安定ハッシュ由来B143要素IDへ変換（意味IDと設備位置の原本は保持）。4室R160では3室専用のR162/R163上部高窓を**偽適用せず**、R149実壁・入口・家具・屋根のみを先に検証。
- 共有ノードのある4室は明示的な **host-only research** オプションで、2×2の物理4室グリッド、モデル指定の真の直接扉と必要最小限のホスト追加接続を別記録。モデルの `central-spine` と一致する構成とは**主張しない**。既定モデルコンパイラは無変更。
- 既存Windows `RUN_R157_UNKNOWN_USE.cmd -ReuseOnly` はR156原本を再利用し、以前のR167証拠を上書きせず別の `R168_GRAPH_EVIDENCE_ZIP` に新たなオフライン評価を生成する構成。ユーザー実行・美術判定・Minecraft実歩行は未確認。実際のR168 CIが完了するまでPASSを主張しない。
- 次は実R168 ZIPで**B143各用途の実ソース・5方向外観と未成立理由**を読み、外観/用途の差・家具アクセスをレビュー。ART HOLD / NOT_PREPARED / 9 BLOCKED / BuildPlan.operations=[]、main・原本・Draft PR #128保護。

## 最新現在地（R166、2026-10-25）
- R165確定：HEAD `8dd18d4560412c618c491067a8c2073f0a990fbe`、source-only B198G品質CI [#40191931567](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40191931567) 成功（193テスト）。**未知用途3件の実Qwen/Gemma品質成功ではない**。
- R166で既存の `RUN_R157_UNKNOWN_USE.cmd` が呼ぶ `scripts/r157-one-click-unknown-use.ps1` を改善。既存 `r157-unknown-use-*` の非模擬・topology・3ケースのR156マニフェストを発見した場合、**追加推論0回**で未作成のR157/R165監査のみ実行。既存原文とZIPを上書きしない。監査によるHOLD判定は維持。
- 既存結果が無い場合はローカルOllamaの `/api/tags` から**実インストール済み**Qwen/Gemmaタグを確認して新規3用途を実行する。指定 `-Model` が未インストールなら事前HOLD。明示的な新規3回が必要な場合のみ `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/r157-one-click-unknown-use.ps1 -Fresh` を使用。
- **R166でユーザーPC上の実モデル推論は未実施**。PowerShellランナーのWindows実機動作もまだ独立確認していない。Node/source-only CIの合格を実Ollamaや美術の合格と誤認しない。3用途の原文・真正B143・5方向図の結果を得てから共通生成器の具体的な品質改善を選ぶ。
- ART HOLD / NOT_PREPARED / 9×BLOCKED / 空BuildPlan、Draft PR #128、既存原本とmain保護を維持。旧R148〜R165履歴は下記と工程文書を参照。

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

## R155（本物の屋根輪郭とB143上限対応）
- R154の実測品質CIは155/155 PASS。5案のB143比較で高さは改善したが、**外観は依然として直方体の組合せ。美術HOLD**。
- R155: `--architecture roofline` に短い `roofSilhouette=ridge|shed` を追加。従来R154の平らな上部屋根2面と張出しを**原本を残した派生コピーの中でだけ置換**し、実屋根ボクセル・両側妻壁・高低差を閉じる接合部をB143へ生成する。多目的に利用できる本物の高天井空間を残し、全室内部Y<=5と設備/動線を変更しない。
- 大きな技術制約：R154実Qwen比較のB143出力は141/160要素だった。R155は繰返し妻壁・段差止めを再利用して**160要素以内で完結**させる。157前後が目標（実CIで要検証）。B143制約そのものを緩めない。
- 比較の6案目は保存済みQwenの**ホスト側研究IR**である。モデルが実際に斜め屋根を設計した実績ではない。完全なMinecraft防水/雨風・実歩行・目視建築美術は未検証。既存PR/NOT_PREPARED/9 BLOCKED/空BuildPlanを維持。
- 今後はR155 CIと真正6案ビューアを実際に検証し、形状比較で品質の改善がなければ同一建物の外装調整をさらに繰り返さず、立体構成の汎用性と実Qwen未知用途3件の評価へ移る。

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
