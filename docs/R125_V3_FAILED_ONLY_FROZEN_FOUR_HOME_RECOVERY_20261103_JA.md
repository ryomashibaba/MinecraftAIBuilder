# R125 V3 — 4件の真正SOURCE固定、住宅だけを1回回復（2026-11-03 JST）

## 1. 確認済みの実Qwen実行（ユーザー提出原本）
ユーザーが提出した `FUNCTIONAL_FACADE_REPORT.json` は `r125-five-genre-functional-author-study-v1`、`model=qwen3:14b`、`testInjectionPresent=false`、`modelCalls=5`、`worldWrites=0`、`status=HOLD_PARTIAL_FUNCTIONS`。これはローカルOllamaと申告された実行レポートであり、モデルサーバーの独立した本人確認ではない。

- **平屋住宅 HOME：`HOLD_MODEL_FUNCTION_IR`、理由 `R125_FUNCTIONAL_TOP_LEVEL`**。元の生回答SHA `4c64df4e6206eb70114543cf3d900fe393a0eabc6628ffc3518bd75dff2b2f60`。集計レポートは具体的なキー誤りを含まないため、**実際の生回答を読み取る前には、どのキーが悪いか断定しない**。
- **独立店舗 RETAIL：`NEW_FUNCTIONAL_SOURCE_ART_HOLD`**。幾何 `83b9eae722687387fce13163d1602ced74491e22a4ea40387092785716b0784f`、サービス動線2/2、追加実ガラス8セル、設備8セル。
- **研究施設 LABORATORY：`NEW_FUNCTIONAL_SOURCE_ART_HOLD`**。幾何 `7850cd79d3b6b9ad630c9a4dcf14e65b0a96e96c09a701d09c7a8ef1da7380bc`、動線4/4、新ガラス24、設備13。
- **小美術館 GALLERY：`NEW_FUNCTIONAL_SOURCE_ART_HOLD`**。幾何 `7099f91e891b3da661b69a08e226e57e7d1b1db628607fd590cd79c4c32be15d`、動線4/4、新ガラス24、設備14。
- **小駅舎 STATION：`NEW_FUNCTIONAL_SOURCE_ART_HOLD`**。幾何 `a247a968cee26441b30c9b3523c9993d76cbd82fca157593d0cd1a2ced4351a9`、動線3/3、新ガラス16、設備9。

前回の比較画像では4棟の用途と本格的な建築品質の差は依然として不十分。上記SOURCE結果を**建築ART、実機のMinecraft施工や設備の実用性の証明に昇格しない**。ART HOLD全件、9 BLOCKED、BuildPlan空、Minecraft書込禁止。

## 2. 新方針（正式追加）：部分成功凍結・失敗ジャンルのみ再試験
- 1回の5ジャンル試行で成功した4案の**設計原文／Qwen追加屋根原文／V3原文／各SHAとTRUE B143形状**を厳格照合し、固定する。
- **HOMEのみ1モデル回答を最大1回実行**する。成功4件についてモデルに一切要求しない。
- 住宅の旧 `TOP_LEVEL` 原文を私人の入力フォルダから読み、元SHAと生JSONのトップレベルキー、schema、planId、rooms数を**監査するだけ**で編集しない。無証拠で「キー名誤りが原因」と決めつけない。
- 住宅1件の再回答も一回だけ、形式はトップレベルに `schema,planId,rooms` の3キーのみ、建築者は各室の実機能設備と適切な採光/窓なしを自ら選択。候補は全ジャンル共通のSOURCE形状に基づく。ホストは勝手に正規化、トリミング、キーパッチ、再試行をしない。
- もし失敗しても**4成功の真正SOURCE/元モデル回答を再生成しない**。別の私人フォルダに理由と新生原文を保存しHOLDする。成功なら同じ1ブロック尺度の5ジャンル比較を新規に生成する。
- HOMEに関する旧HOLDは履歴として保持。追加成功時のみ別の時点の `NEW_FUNCTIONAL_SOURCE_ART_HOLD` と区別する。

## 3. 研究ブランチ実装
- `scripts/r125-five-genre-real-functions-pilot.mjs`: 現状の `verifySavedEnvelope` を公開して他の研究経路も全モデル屋根SHAを同一ゲートで照合する。
- `scripts/r125-v3-failed-only-home-recovery.mjs`: 4成功の真正モデル原文とV3幾何＋ルート＋材料を全て再現検証、住宅旧生回答を改変せず診断、模型サーバーへ新しい HOMEのみ最大1件を依頼。厳密に1件の追加原文を保存し、全5ジャンルを別の同一縮尺比較HTMLとして出力する。
- `scripts/r125-v3-failed-only-home-recovery.test.mjs`: 合成モデルだけを使い、成功4件が凍結、HOMEのみPOST1回、元原文改ざん時POST0、失敗時4件保持、モデル不在時POST0、9ゲート封鎖を確認する。**テストダブルを実Qwen成功と呼ばない**。
- `scripts/r125-live-safe-worktree.ps1 -UseCase CrossGenre -RecoverHomeOnly`：既存dirty checkoutを変更せず一時worktreeで実行。ユーザーが提出したSHAが一致する五ジャンル元SOURCE、診断、屋根、機能4成功レポートだけを選択し、全回帰テストの後にHOMEを1回のみ試す。新しい証拠フォルダを開く。直前の本物4/5報告のSHAは `c661150f153945cb062bf1898d7b93c2798b9d2ad96fa9544fb0a0cd49cf50a0`。
- 新規証拠：`FAILED_ONLY_RECOVERY_REPORT.json`、`cases/home/ORIGINAL_HOME_IR_DIAGNOSTIC.json`、新しい住宅の生回答、成果があればTRUE B143形状・実設備/ガラス/2幅動線と比較 `index.html`。過去の4成功の原文を公共GitHubへ上げず、旧生回答を編集しない。

## 4. 次の判断ゲート
1. GitHub CI / Windows Node回帰テストが実際に通った証拠を見る。旧テスト結果・擬似SHAや待機状態をPASSと言わない。
2. HOMEだけの新Qwen回答を1回取得。失敗時は元生JSON診断・プロンプト/契約・モデル応答不適合を区別し、同条件で無制限に試行しない。
3. 5ジャンルSOURCE候補が揃えば、**ART全体HOLDのまま**実物建築としての差・室内設備/採光・入口からの使い勝手を横断して審査。個別の窓や屋根装飾の積み重ねへ戻らない。
4. 先行R125の花屋と研究施設の実際のMinecraft Education成功、main、Draft PR #128、私人Qwen原文、元ワールドは完全保護。

**研究経路の実装 ≠ 実Qwen HOMEの修復成功。** ローカル新推論をしていない間、元の技術結果は4/5のままである。
