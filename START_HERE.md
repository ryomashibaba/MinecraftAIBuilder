# MinecraftAIBuilder — START HERE（新チャット・AI開発者の統一入口）

**2026-11-02 JST 更新。長文プロンプト・ZIP交換なしで、GitHub正本を読み込んで既存開発を継続する。**

## 2026-11-03 最新実装：V4C 本物の大中庭・外部前庭を持つAUTHOR主導の共通IR

- V4B 5/5 ART REJECT（2〜3 block²の空庭、5件同一トポロジー）を固定証拠とし、配色・窓など局所改修ではなく **2〜5の主従棟位置・親子接続・中庭・屋外前庭**を外部設計者が著作する汎用V4Cを独立開発した。旧R125主経路、V1〜V4B原文、Minecraft Education成功経路は一切変更していない。
- 実装：source/ai/r125-void-massing-v4c.mjs。AUTHORの明示する中庭（最低49 block²実支持床＋頭上空気・四方壁・2幅ゲート）、屋外前庭（10〜22×6〜16 blockの支持床）、棟接続、入口を真正B143へ変換。入口→全用途棟と中庭の2幅SOURCEルート、無修復HOLD、NOT_PREPARED/9 BLOCKED/BuildPlan空/World0維持。**初期制約：北入口・単層・軸平行矩形主体。真のゲーム内施工・構造・地形は未検証。**
- 3つの作者供給の **合成テスト構成** を別々に作成。east-south-court：中庭64/前庭112 block²。west-north-court：90/112。serial-court：110/180。3つの接続トポロジーは相異なる。これは**Qwenの新設計ではない**。本物のB143変換器/ルート監査の限定暫定検証3/3、ハッシュ計算のみ検証用代替だったため正式Node PASSは未認定。
- CIと証拠：scripts/r125-v4c-void-massing.test.mjs（真正3D、2幅動線、負例のHOLD）、scripts/r125-v4c-source-review.mjs（GitHubから3D index.html・実ボクセル比較SOURCE_TOP_VIEWS.svg・機械可読JSONを自動出力）を既存R125 workflowに追加。[V4C初回Actions #41596939516](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41596939516) は**キュー待ち、正式完走と美術評価は未確認**。詳細 [V4C共通IR・試験契約](docs/R125_V4C_AUTHORED_MASS_VOIDS_SOURCE_PILOT_20261103_JA.md)。
- 次工程：Actions完走→Artifactの真正B143 3Dの上面・斜視・入口・庭と内部をV4Bと比較して**ART FIRST**で採否判断。形状SHA差と庭面積だけで美術合格にしない。品質ゲート後にだけ本物の独立Qwen著作を有限回検討し、原本をSHA保護。main変更禁止、Draft PR #128継続、Work事前承認制。

## 2026-11-03 確定：V4A/V4B CI完走・真正3D ART REJECT 5/5

- V4B初回の [CI #41589868598](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41589868598) が失敗した直接原因はV4A `r125-public-approach-v4a.mjs` の未閉じ引用符。研究ブランチ `c414f47770c46fa2a83549f25f54b15c213e0659` で訂正し、次の [CI #41594095747](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41594095747) が **SUCCESS**。SOURCE技術結果をARTやMinecraft施工へ昇格しない。
- 正式CI Artifact **R125-V4B-Five-Synthetic-Site-3D-SOURCE-Only**（ID `13211695519`）を取得し、埋込真正B143 `surface` 全5棟を等角投影・独立ART予備審査。**5/5 ART REJECT**：主棟+東翼+南翼の同一ボックス連結、用途差が弱く、小中庭の空・支持床の有効内部は各2〜3ブロック²（全体投影占有に対し0.57〜0.85%）。`sourceRoutes` PASSは維持し、合成設計の正式美術採用は0。詳細 [V4B真正3D・ART審査](docs/R125_V4B_ACTUAL_SOURCE_ART_REVIEW_20261103_JA.md)。
- 5件の合成ソースは**同一脚本で寸法だけを変えたテストダブル**。異なるSHAが本当に異なる5用途設計の証明ではない。タイトルを `SYNTHETIC shared-layout` とし、GitHub再実行 [CI #41595131292](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41595131292) は **SUCCESS**。Artifact #13212091254を再取得し、`independentArchitecturalDesignsCertified:0`、`distinctConnectionTopologyCount:1`、`allGenresShareOneConnectionTopology:true`、`worldWrites:0` をJSON原本で確認。人間ART REJECT 5/5は凍結記録のまま変更しない。
- **次の本命**：V4Cとして、主役形状・複数の実用空洞・外部空間・人間のアプローチ動線を**設計者著作の意味IRから統合**する研究。窓追加や小中庭拡幅など場当たりの微修正を繰り返さない。Qwen実著作5件を始める前に、共通生成器が異なる非箱型空間構成を表現でき、複数視点ARTで意味のある改善を示す必要がある。
- main・Draft PR #128・R125 Education安定経路・旧V1〜V4B原本・ユーザーprivate Qwen原文は保護。Minecraft WorldWrites 0、9 BLOCKED、BuildPlan空、Work事前承認制を維持。

## 2026-11-03 次工程実装：V4B 主従敷地構成・中庭・入口共通IR（CI待ち）

- 前工程V4Aの GitHub Actions [#41584403568](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41584403568) は今もキュー待機。**PASS未確認**。既存V4A/V1〜V3と凍結Qwen原文は変更しない。
- 独立したオプトインV4B \`source/ai/r125-site-composition-v4b.mjs\` で、設計者が主棟・付属翼のX/Z位置・寸法・用途、棟同士の連絡口、街路側アプローチ、中庭、外壁開口をすべてIRで指定。HOSTはジャンル名から適当なデザインを生成せず、真正B143/2幅SOURCE動線/支持床/空気/全周壁/外ガラス/衝突を**検証**する。安全違反は無修復HOLD。
- 合成5ジャンルの負例テストと、既存3Dビューアで現物SOURCEを5件一括で確認する **読取専用** ギャラリー生成器をGitHub既存CIに追加。**5件はテストダブルであり、住宅/店舗/研究所/美術館/駅舎の実Qwen設計5件ではない。ART HOLD／初回CI結果未確認**。
- [V4B実装・制限・次ゲート](docs/R125_V4B_SITE_MASSING_SOURCE_PILOT_20261103_JA.md)。次工程：正式CIと3D実画像で失敗箇所・外観の改善幅を確認し、効果が薄ければ美術不採用。main・PR #128 Draft・既存施工経路・9 BLOCKED・BuildPlan空・Work事前承認を継続。

## 2026-11-03 最新実装：V4A 作者指定の公開入口・開放アプローチ（CI待ち）

- 前工程で可視化した15/15外形不変を受け、場当たりの配色/窓追加ではなく**モデル著作の空間IR自由度**に着手。オプトイン `source/ai/r125-public-approach-v4a.mjs` を研究ブランチへ追加。元の `r125-spatial-composition.mjs`、V2/V3、private Qwen回答、R125 Education実機経路は**改変していない**。
- V4Aはモデル/設計者が `rootRoomId` / `offset` / `width` / `depth` を厳格に指定する空間IR。既存真正B143の屋根・正面壁を一部切除し、**床付き外部くぼみ＋左右壁＋奥の本当の2幅入口**を生成。B143真正SOURCE、屋外支持床/空気、全室2幅SOURCE動線、旧V1と異なるgeometry SHAを機械検査。失敗は無修復HOLD、全施工ゲート不変。
- **重要な限定**：現在のV4Aはroot北側のみ／低層直方体の組合せの範囲。主従ボリューム/中庭/駅前広場の完成自由設計ではない。5ジャンルの証明は**合成テストダブル**であり、新Qwen5実回答や美術PASSではない。実モデル追加POST0、Minecraft World Writes 0。
- 回帰 `scripts/r125-public-approach-v4a.test.mjs` を旧R125 GitHub Actionsワークフローに接続。初回 [#41584403568](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41584403568) は**キュー待機を確認、正式PASS未確認**。旧回帰の削除なし。詳細 [V4A実装・試験境界](docs/R125_V4A_PUBLIC_APPROACH_SOURCE_STUDY_20261103_JA.md)。
- **次の判定**：CIと真正3Dの別視点確認でV4AのSOURCEだけを判断。外観改善が不十分ならART REJECTし、V4Bの主従ボリューム/外部空間一体著作へ進む。5ジャンル共通エンジン、Mac軽量IR、原本保護、Draft PR #128、main不変更、Work事前承認、NOT_PREPARED/9 BLOCKED/BuildPlan空を継続。

## 2026-11-03 最新：Windows一枚PNG実提出・外形不変15/15・ART HOLD

- **ユーザーが `SOURCE_ART_OVERVIEW.png` を提出**（1478×1601px、画像SHA256 `5ff189928b031794b909021e8209d22028f6976c8e404c587e63a412387c435d`）。PNGの埋込 `MAB_Source_Evidence` は `sourceReadyCount=5` / `modelCallsThisRun=0` / `worldWrites=0` / `humanArt=NOT_REVIEWED` / `minecraft=NOT_TESTED`、共有8px/block。CRC正当性と先行5件のSOURCE SHA照合に矛盾なし。**これでユーザーWindowsのPNG出力到達は確認できたが、全Node CIが成功した証拠ではない**。
- **人間＋ピクセル横断ART予備監査**：FROZEN V2対V3の5棟×正面/側面/上面=15組の建物外形占有マスクがすべて差0px。変化は可視材質/窓などであり、形状SHAの差が「完成建築の外観変化」を証明するわけではない。全5棟ART HOLD継続。用途として読める入口・主従立体・公共空洞/中庭・魅力的なファサードが不足。詳細は [単一PNG画像の根拠つきART予備審査](docs/R125_V3_FIVE_GENRE_ONE_PNG_ART_AUDIT_20261103_JA.md)。
- 共有ボトルネックはSOURCEに明示された**2〜5個の軸平行矩形の空間接続木＋HOSTが壁/屋根/中央入口を箱生成する**汎用IRの自由度。V3の追加採光/設備の設計目標を否定せず、今後は既存安定R125/B143/Education経路を守ったまま、モデルが外部接近・主要入口・主役体積/空洞などを著作する小さな共通IRの**オプトインSOURCE研究**へ。5ジャンル横断・美術採用0・個別建物向け手修正なし・無断Work/実世界施工なし。
- **このターンでは画像評価と正本保存のみ**。新モデル推論/機能実装/実Minecraft試験は未実施。次担当は本監査を読んでV4概念IRの最小設計と失敗条件を定義し、過去5棟のSHAを保存したまま必要な共通修正だけ進める。

## 2026-11-03 追加：保存済み5棟の一枚PNG出力を阻害したテスト誤字を修正

- ユーザーWindows実走（旧HEAD `2e10995af7f1e66de0552ed661a1219931e4a1ce`）の `-UseCase CrossGenre -ExportOverviewLatest` は専用回帰49件中48件成功・1件失敗。失敗は `scripts/r125-v3-failed-only-home-recovery.test.mjs` で未定義 `sha(png)` を呼んでいたテスト側の `ReferenceError`。正本既存の `digest()` へ置換し、研究ブランチのコミット `c35f62c8e4e1ff29d0f974b33f87c426902d8e16` に修正保存。生成器・保存Qwen原文・ランチャー・世界書込安全ゲート・mainには変更なし。
- 元のHOLDはスクリプトの安全な事前テスト停止であり、既存5/5 SOURCE記録を否定するものではない。**修正後の49件回帰とユーザー実WindowsでのPNG再出力は未確認**。GitHub Actionsの未完了/キャンセルをPASSと呼ばない。
- 次はモデル再推論・Minecraft施工をせず、SHA固定した `scripts/r125-live-safe-worktree.ps1` を研究ブランチ最新HEADから実行して保存済み5/5を `SOURCE_ART_OVERVIEW.png` の一枚に書き出す。ランチャーは出力フォルダと当該PNGのみを開く（重複HTMLは起動しない）。成功したらこの一枚で5ジャンルの共通ART不足を評価し、用途別の場当たり改修に戻らない。ART HOLD、NOT_PREPARED／9 BLOCKED／BuildPlan空、Draft PR #128を継続。

## 2026-11-03 最新確定：V3実Qwen SOURCE 5/5成功／ART HOLD・スクショ手作業廃止

- ユーザー提出 `FAILED_ONLY_RECOVERY_REPORT.json` と5ジャンルの正面・側面・俯瞰画像が新しいSOURCE実績。**`status=FIVE_FUNCTIONAL_SOURCE_CANDIDATES_ART_HOLD`、`sourceReadyCount=5`、`testInjectionPresent=false`、`qwen3:14b` HOME追加モデル呼出1、既存4成功の追加モデル呼出0、Minecraftワールド書込0**。これはローカルモデル自己申告の実験結果で、モデルサーバーの独立認証はない。以前HOMEの `R125_FUNCTIONAL_TOP_LEVEL` HOLDと旧原文は保存。
- **元4件をSHA検証して再利用した上でHOMEだけ復旧**。HOME新真正幾何 `664b3211f3874e159e60f720638d12a466a4fefa2271dd2a5e2751c82e9c6182`。店舗 `83b9eae7...`、研究施設 `7850cd79...`、美術館 `7099f91e...`、駅舎 `a247a968...` は以前の真正B143 4成功のまま。
- **ART HOLD全5件維持**。画像では用途による開口・屋根の違いはあるが、まだ共通の直方体集合感が強く、高品質な住宅／店舗／研究施設／美術館／駅舎としての全体構成・本格的な用途表現は不十分。SOURCE成立をARTや実Minecraft施工の承認に昇格させない。元ワールド書込0、9 BLOCKED、BuildPlan空。
- ユーザー要望：**今後は5枚のスクリーンショット撮影を原則要求しない。** `scripts/r125-five-genre-source-art-overview.mjs` は真正B143実ボクセルから全5ジャンル×凍結屋根/V3×正面/側面/俯瞰の**同一縮尺のPNG一枚**を直接生成。Node標準機能のみでPNGを出力し、**非秘密のSOURCE形状SHA・状況をPNG内部メタデータに埋め込む**。誇張された建築イラストは生成しない。
- **現在の実行結果を再使用**：`scripts/r125-v3-export-saved-overview.mjs` が保存済みの旧V1/V2/V3と今回のHOME回復回答原文を全部SHA照合し、追加モデル呼出0で新しい私人フォルダに `SOURCE_ART_OVERVIEW.png`、`OVERVIEW_AUDIT_REPORT.json`、`index.html` を作る。ユーザー用の既存安全PowerShellランチャーに `-UseCase CrossGenre -ExportOverviewLatest` を追加し、提出された既存の5/5レポートSHA `0eb4f025cad49ebf59f10a04aa9d1352fe5d0fa60ba8869a032063974f815cce` に一致したデータだけ処理。原本の再推論・上書きなし。
- 5ジャンルを新規推論する通常の `r125-five-genre-real-functions-pilot.mjs` でも、成功数に応じて凍結屋根と新機能を同一縮尺の1枚の `SOURCE_ART_OVERVIEW.png` として自動保存する。**一部HOLDを5/5成功と偽らず**、各元モデルの原文は保存場所から外に出さない。
- 今後HOMEだけの再検証を改めて実行した場合も `r125-v3-failed-only-home-recovery.mjs` がPNGを**自動保存**する。ユーザーはスクリーンショットではなく、この一枚のPNGをアップロードすればARTを横断評価できる。詳しい故障診断が必要な場合だけ監査JSONを追加で提出してもらう。今のユーザーには**モデルを再実行せず、保存済み5/5を一枚のPNGへ書き出す操作のみ**提示する。
- 独立PNG書き込みはテスト画像を使ってPNG構造と埋込メタデータをローカルで読み取れた。新しいGitHub Actions回帰と全SOURCEチェーンの実Windows稼働は**まだ正式PASS未確認**。成功を捏造しない。main / Draft PR #128 / R125 Education実機成功 / 私人Qwen原文 / Work事前承認を保護。

## 2026-11-03 最新：V3本物5ジャンル4/5成功、住宅1件だけを再試験（部分成功凍結）

- **ユーザー提出の最新実Qwenレポート `FUNCTIONAL_FACADE_REPORT.json` が正本**。Model `qwen3:14b`、modelCalls5、`testInjectionPresent=false`、SOURCE成立4/5、Minecraft書込0。成功は独立店舗（動線2/2、追加ガラス8セル・設備8セル）、研究施設（4/4、24・13）、小美術館（4/4、24・14）、小駅舎（3/3、16・9）。**住宅HOMEだけ `R125_FUNCTIONAL_TOP_LEVEL` で技術HOLD**。この集計から具体的な不正フィールドは未特定であり、原Qwen原文を見ずに推測で修正しない。5棟すべて美術ART HOLD。
- **正式追加方針：部分成功凍結＋失敗ケースのみ再試験**。成功4棟のQwen生回答・実B143・SOURCEとSHAを厳格再計算し**再モデル呼出0**。住宅の旧原文だけSHA保護で診断し、必要な新モデル要求は**HOME1件だけ、追加推論最大1回**。成功/失敗どちらも旧結果は上書きせず新しい私人フォルダへ保存。全5ジャンルの新旧SOURCE比較を作る。Genre専用の手修正、勝手なJSON正規化、無限再試行禁止。
- **実装保存**：`scripts/r125-v3-failed-only-home-recovery.mjs`、`scripts/r125-v3-failed-only-home-recovery.test.mjs`、既存ランチャー新オプション `-UseCase CrossGenre -RecoverHomeOnly`。ランチャーは提出済み4/5原本のSHA `c661150f153945cb062bf1898d7b93c2798b9d2ad96fa9544fb0a0cd49cf50a0` に完全一致する実行だけ選ぶ。診断結果は `FAILED_ONLY_RECOVERY_REPORT.json`、`cases/home/ORIGINAL_HOME_IR_DIAGNOSTIC.json`、比較 `index.html`。**新HOMEはまだ実際に再推論されていない**。
- 詳細：[R125 V3 4棟SOURCE凍結・HOMEだけの回復手順](docs/R125_V3_FAILED_ONLY_FROZEN_FOUR_HOME_RECOVERY_20261103_JA.md)。旧R125のEducation実機成果・5件の元空間/屋根原文・main・Draft PR #128・9 BLOCKED・BuildPlan空・Minecraft施工禁止・Work事前承認方針は変更しない。**正式Node CIの完走未確認をPASSと呼ばない**。

## 2026-11-03 V3実Qwen試験前の最終汎用SOURCE事前監査（次工程）

- V3では追加のローカルQwenへの5回の機能・採光設計指示の前に、すでにSHA固定した元5件の空間設計と屋根5件を再使用する。GitHub Actionsは待機中のため、**正式CIが通ったとは主張しない**。
- `source/ai/r125-functional-facade-v3.mjs` の事前設計候補を拡張。窓：3×2/4×2の全セルが既存の外壁に占有され、新たなガラスになる候補のみ提示。家具/設備：**`surveyFunctionalFixturePlacements`** は全5ジャンル同一ルールで、設備外形（長さ3×高さ1のカウンター系／長さ2×高さ2の収納・展示系）の各壁・相対オフセットを真正B143へ**実際に仮設置**し、床支持・既存ブロックとの無衝突・入口から各室への経路・設備前の2幅のサービス到達を元のSOURCE上で通した候補だけをまとめて返す。自動配置やジャンル名別テンプレートではない。
- `scripts/r125-five-genre-real-functions-pilot.mjs` は、追加モデル要求前に各室の実開口候補と設備候補を計算。もし設備場所が無い場合はそのジャンルだけ証拠保存のうえHOLDして、無駄なGPU推論をしない。選択可能な候補を `SOURCE_AUTHOR_OPTIONS.json` に私的保存。Qwenは機能 `kind`、壁方向、位置、材質、目的、および適切な窓/窓なしを自ら選択。選んだ2つが互いに干渉した場合でもホストが黙って直すことは禁止、元回答を保持してHOLD。
- 共通SOURCE回帰項目 **10/10**（V8の実コード幾何を代替ハッシュで実行。**正式NodeテストやGitHub Actionsの結果ではない**）。これらは合成設計であり、ユーザーの実Qwen新機能設計はまだ未実行。元5件の本物のQwen計画と屋根、旧R125のEducation実機成功、main、Draft PR #128を保護。ART HOLD・WorldWrites0・9 BLOCKED・BuildPlan空。
- 次は新たなジャンル固有の小改修を続けず、**保存済みの5+5件から一操作の実Qwen新機能著作を行い、5棟を比較して共通するARTボトルネックへ進む**。失敗で同一元データを再生成しない。

## 2026-11-03 V3の共通欠陥修正：小室の採光と窓不要室を両立

- 研究ブランチのV3を再監査し、**実Qwenに不要な再生成を要求する前に、同一SOURCE上の共通制約を修正**。当初の事前選択肢は幅4×高さ2の窓のみ。駅舎等の幅6/奥行6の小室では真正3×2外窓が成立しても「候補なし」になり得た。専用用途の例外なしで、3×2・4×2の両方を実B143と外壁/隣室/ドアで照合した候補としてQwenへ渡す。
- **外窓不要の内部機能室を許可**。収蔵室/倉庫等を全室同じ窓付の箱に寄せないよう、`FUNCTION_SCHEMA` の `opening:null` を有効化。部屋に外壁候補がなくても新しいQwen要求を丸ごと停止しない。建物に一つも有効な新規開口がない場合はこのV3採光研究をHOLD。外壁開口を選んだ室では真正ガラスの全セルを検証し、窓なし室のガラスは0として明示。全室の実設備・2幅設備前SOURCE到達を継続要求する。
- **試験**：既存5ジャンルの汎用形状、共有壁不正窓、材料監査、小室6×6の本物の3幅開口、意図的に窓のないサービス室、全窓なしHOLDの計8項目がSOURCEコード実行（V8の代替SHAを使用したスモーク検証）8/8成立。**これは正式NodeやGitHub ActionsのPASSではない**。GitHub Actions実行結果未確定、実Qwenへの新V3依頼はまだ実施していない。
- 先行**5件のモデル空間設計・5件の追加モデル屋根設計、旧R125 Educationの本当の実機成功**は不変更。B143 SOURCEのみ、`main`不変更、Draft PR #128未マージ、ART HOLD・Minecraft世界書込禁止・Work無断使用禁止。
- 次は正式回帰の確認後、現存5+5のQwen原本をSHA照合して、新しい「機能/採光」だけを5ジャンル一括で独立著作させ、共通HOLD症状を集約して構造上の自由度を改善する。局所的な窓1つの見栄えだけで採用しない。

## 2026-11-03 V3追加監査 — 複数ジャンルで使える候補面提示と真正設備検証を強化

- V3は新しい建築を作り直す機能ではなく、**保存済み5件の元Qwen空間設計と5件のQwen屋根設計をSHA固定**して、各ジャンルにつき機能・採光の新しい意味IRだけをローカルQwenへ依頼する研究。元SOURCE/ワールド/main/Draft PR #128は不変。
- `source/ai/r125-functional-facade-v3.mjs` に **`surveyFunctionalFacadeOpenings`** を追加。SOURCEから実際に外部へ露出し、隣室や入口と交差しない、幅4×高さ2の開口候補を**全ジャンル共通規則**で列挙する。モデルに候補の方向・相対位置だけを渡して選ばせる。ホストは用途によって位置を決めず、モデルが選んだものを勝手に移動/修正しない。
- 各室の開口と設備の実ボクセル材料を別々に照合。**各室に本当に新しいガラスがあるか、全設備ブロックが指定材料で増えたか、設備前へ2幅SOURCE経路が通るか**を確認する。単に別の壁や床が同じ体積内にあるだけでは設備成立とみなさない。
- 汎用V3の5ジャンル合成テストをコード上で実行し **5/5 PASS**（実Node/GitHub CIではなく、ハッシュ代替を使ったSOURCEスモーク相当）。正規GitHub Actions **実行待ち**、実Qwenの機能/開口回答 **未試行**。SOURCE合格≠人間ART合格、Minecraft施工不可。
- 狙いは一棟の窓・屋根装飾ではなく**多用途の建築で共通する意味→空間→機能の変換能力の改善**。今後の正式ART審査では実形状・設備の用途適合・入口・採光・実室内体験を確認し、5棟とも現在は ART HOLD。

## 2026-11-03 最優先：V2実Qwen包絡面5/5 SOURCE成功、建築品質はART HOLD → 機能と採光V3

- ユーザー提出の `EXPRESSIVE_ENVELOPE_REPORT.json` と5ジャンル比較画像で、追加Qwen応答5件・SOURCE PASS 5/5、住宅/店舗/研究施設/美術館/駅舎の上部2幅空間パッド **130/79/119/203/99**、Minecraft世界書込0を確認。**屋根形状の変化は実在するが、建築の用途差・内部設備・外壁開口が弱く、5ジャンルとも美術はART HOLD**。屋根の小改善を繰り返さない。
- 全ジャンル共通の**モデル著作の実体機能とファサード V3研究**：`source/ai/r125-functional-facade-v3.mjs` は既存V1の部屋構成とV2の屋根を変更せず、Qwenが明示する各室の機能設備と主要採光窓を真のB143ボクセルへ変換。2幅入口→各室だけでなく **各設備前への2幅SOURCEサービス経路**、外壁/隣室/開口干渉、実体ガラス・機能設備の存在まで検証。ジャンル別テンプレート追加禁止。これは完成建築ではなく最低限の機能・採光能力試験。
- `scripts/r125-five-genre-real-functions-pilot.mjs` は保存済みの**5空間Qwen原文＋5屋根Qwen原文**とSOURCE SHAを照合し、新規5件の独立Qwen機能・開口プランを逐次生成。旧5件や実世界を再作成せず、完全ローカル証拠を保存する。起動：既存保護ランチャー `-UseCase CrossGenre -StudyFunctionsLatest`。実Qwen機能回答は未実行であり、CIや合成テストを実機・美術合格と偽らない。
- `main`、Draft PR #128、凍結原本、既存の本当のMinecraft Education実機成功、旧R125安定経路は保護。SOURCE/ART/実機の3段階判定は分離し、V3 ART HOLDおよび建築施工禁止を維持。詳細：[V2の横断評価とV3機能・採光研究](docs/R125_CROSS_GENRE_FUNCTIONAL_IDENTITY_V3_20261103_JA.md)。

## 2026-11-03 ART全体評価 → 新しい全体外形著作能力の研究開始（次工程）

- ユーザーの5ジャンル比較画面・`COMPARISON_REPORT.json` を評価。**5/5 SOURCE経路成立、しかし5/5 建築ARTは引き続きHOLD**。5棟は単純な直方体屋根と似た壁面、各室最大1窓、家具/設備なし。これらは共通HOST表現制約であって、モデルの発想能力だけが原因とは断定できない。元5モデル・旧駅舎HOLD履歴・実機成功は保護。
- `source/ai/r125-expressive-envelope-v2.mjs`：モデルが全室の屋根`form`（shed/ridge）・方向（x/z）・上昇量を明示する**別の汎用建築包絡面IR**。旧5棟の原平面を変えず、真正B143の屋根と上部壁・段差封鎖を生成。屋根の下の実空気体積が増え、2幅頭上空間と入口→全室SOURCE動線が成立した候補だけSOURCE研究に認定する。用途から形をハードコードしない。
- `scripts/r125-five-genre-real-envelope-pilot.mjs`：元の保存済みQwen5設計をSHA照合し、**5件の独立した追加意匠をローカルQwenが著作**する研究バッチ。追加推論はまだ未実行。モデル生原文はローカル非公開、モデル呼出5件を逐次実行、失敗の自動修復0、Minecraft世界書込0。元/新形状の同一尺度比較HTML・実上部空間パッド・5ジャンル共通HOLD分類を保存。
- 起動は既存安全ランチャー `-UseCase CrossGenre -StudyEnvelopeLatest`。合成・モックの回帰成功を実Qwenや人間ART成功に昇格させない。GitHub CIが完了するまでは**新経路はSOURCE研究HOLD**。今回の能力は全体外形の第一段階であり、次は機能設備・採光・動線・外観を統合した短い意味IRへ進む。
- 詳細：[5ジャンル横断ART評価とモデル著作の全体包絡面V2](docs/R125_WHOLE_BUILDING_ENVELOPE_V2_FIVE_GENRE_20261103_JA.md)。変更対象は研究ブランチのみ。旧R125実機経路、main、Draft PR #128は変更しない。

## 2026-11-03 現在：全5ジャンルの保存済み実Qwen原本がSOURCE成立、同一尺度比較へ

- 2026-11-03提出 `DIAGNOSTIC_REPORT(1).json`：住宅・店舗・研究施設・美術館の4モデルは元SHA一致。駅舎も未改変のモデル原文から **894 B143実ボクセル／入口→全室SOURCE通行PASS**、SHA `860a6e4b6259aa201c2b5e16c73f646ad08339b03a97035ac40accb801f71d0c`。元HOLDを消さず、追加Qwen要求0回・Minecraft世界書込0回。**5/5 SOURCE成立だが5/5 ART PASSではない**。
- 新規 `scripts/r125-five-genre-source-comparison.mjs`：保存済みモデル5本と診断レポートのSHAを照合し、共通縮尺の真正B143正面/側面/俯瞰と各3Dビューワを一度に生成。既存ランチャーの `-UseCase CrossGenre -CompareCrossGenreLatest` がプライベートフォルダに作成・自動表示。モデル再推論・ワールド操作なし。**GitHub CIが完走していない段階では新比較経路の技術合格は宣言しない**。
- 共通の上限制約（現行HOSTコードから確定）：**直方体の屋根・外殻、各室最大1窓グループ、用途設備/家具の真正3D未生成**。これが5ジャンルに共通する次の優先研究テーマ。単一建物の窓や屋根装飾だけの修正を続けない。視覚ARTは実画像を見るまで全件HOLD。
- 詳細：[5ジャンル横断SOURCE→建築ART](docs/R125_FIVE_GENRE_REAL_SOURCE_COMPARATIVE_ART_GATE_20261103_JA.md)。旧R125縦貫成功・main・PR #128 Draft・凍結原本は不変。

## 2026-11-03 最新：5ジャンルの駅舎HOLD原因を特定、汎用6ブロック空間へ拡張

- ユーザー提供の原本照合済み `DIAGNOSTIC_REPORT.json`：既存成功4棟はQwen原文・真正形状SHAがすべて一致。駅舎は **`plan.rooms[2].depth=6` だけが、旧共通IR `7..14` の下限に違反**。他のフィールド違反なし。原モデル回答の改ざんは検出されず、他の原因や美術品質までは断定しない。
- **ジャンル固有の補正は禁止**。研究用共通空間IRの幅・奥行き許容を **6..14** へ拡張し、真正B143→入口から全室への2幅SOURCE到達ゲートは変更せず、5幅は拒否。住宅・店舗・研究施設・美術館・駅舎を同じ条件で扱う。旧R125本流には変更なし。
- `scripts/r125-cross-genre-offline-diagnostic.mjs` の再実行で、保存済み4棟はSHA照合、元Qwen駅舎は無変更のまま新コンパイラでSOURCE再検証。成立すれば **`recovered-station/index.html`** に別フォルダの3Dビューを作成し自動表示。**追加モデル呼出0、Minecraft書込0、旧駅舎のHOLD履歴は保持**。実機/ARTは未認証。
- 詳細：[汎用6ブロック空間と保存済み駅舎のオフライン再検証](docs/R125_CROSS_GENRE_COMPACT_ROOM_RECOVERY_20261103_JA.md)。最新追加のGitHub CIが完了するまではテスト成功と判定しない。

## 2026-11-03 実Qwen五ジャンル試験：4/5 SOURCE成功、駅舎のみIR HOLD

- ユーザーが一括実行したローカル `qwen3:14b` のレポート `CROSS_GENRE_REPORT.json` を確認。モデル要求5回／合成テスト注入なし／ワールド書込0。**住宅1138セル・4室、店舗661セル・2室、研究施設1025セル・4室、美術館1584セル・4室**で真正B143・入口→各室SOURCE到達。4件すべて異なる形状SHAと配置SHA。モデルサーバーの独立認証・人間ART・Minecraft実機歩行は未実証。
- **小駅舎のみ `R125_SPATIAL_ROOM_CONTRACT` でSOURCE生成なし**。これは部屋定義がR125空間IR契約に合わないという情報であり、どのフィールドか／根本原因かは集計レポート単体から不明。5ジャンル共通の失敗症状はまだ0件。4件成功を捨てて5回再推論しない。
- 次の工程：`scripts/r125-cross-genre-offline-diagnostic.mjs` を既存安全ランチャー `-UseCase CrossGenre -DiagnoseCrossGenreLatest` で実行。保存済み5原文をSHA照合、部屋定義の不足・余分・寸法・接続関係を個別報告、成功4形状を元SHAで再照合。**Ollama再要求0・新Minecraft施工0・元ファイル書換0**。診断結果を見て共通スキーマ問題か実モデルの形式問題か判定し、駅舎固有のハードコードは避ける。新しい診断CIは完走確認前は合格と書かない。
- 保護：旧R125の実機PASS、main、Draft PR #128、原Qwen応答、既存4ジャンルの真正3Dは不変更。ART HOLD／Minecraft未認証。

## 2026-11-03 追加固定方針：5ジャンルを一括試験して共通問題を優先修正

- **正式戦略更新済み**：住宅・店舗・研究施設・小美術館・小駅舎を同じ共通生成器/同じ条件で設計し、複数ジャンルで再現する空間・外観・設備・動線の問題を先に直す。症状の一致は原因の同一性の証明ではない。詳しくは docs/PROJECT_STRATEGY_V2_JA.md。
- **実装**：scripts/r125-cross-genre-pilot.mjs が本物のローカルQwen 5独立回答（逐次GPU実行）を一操作で取得し、真正B143・SOURCE・原文SHA・個別3D・共通HOLD分類・比較index.htmlを私人フォルダに保存。scripts/r125-live-safe-worktree.ps1 -UseCase CrossGenre から起動。推論を実施したとはまだ認定しない。
- **証拠境界**：2026-11-03の実装はSOURCE回帰とバッチ入口の追加。GitHub CI [R125 cross-genre #41559198079](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41559198079) はここに記述する時点で結果待ち。合成モデル回答のテスト成功を実Qwen・建築美術・Minecraft施工の合格にしない。既存2,089セル研究施設、旧R125、凍結原本、main、Draft PR #128は保護。

## 2026-11-03 方針の効率化：局所修正ではなく全体建築能力

- ユーザー提供の新店舗は **実Qwen由来SOURCE 897セル／2室到達PASS／Minecraft施工未実施／ART HOLD**。従来R125の固定二分割と限定的な形状表現がボトルネック。窓・小屋根の局所修正を繰り返さない。
- **新研究経路**：`source/ai/r125-spatial-composition.mjs` は意味的な2〜5室の接続関係・相対配置・各室高さから真正B143の外形と入口・床・壁・開口を編成。独立の3合成配置をSOURCE回帰で検査済み。R125専用 Actions [#41557614763](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41557614763) **SUCCESS**。**まだ実Qwenの新形式出力／美術／Minecraft施工は未実証**。
- 目標は住宅・店舗・研究施設で、実Qwenによる独自の建物全体構成→真正3D→人間ART→安全なEducation試験施工へ進むこと。旧R125の成功経路・凍結原本・main・Draft PR #128を保護し、新形式を成功と偽って主経路へ昇格させない。詳細：[全体構成方針と新研究](docs/R125_WHOLE_BUILDING_SPATIAL_COMPOSITION_20261103_JA.md)。

> **最初に行うこと**：このファイル → [完全統合引き継ぎ](docs/MINECRAFT_AI_BUILDER_COMPLETE_HANDOFF_20261102_JA.md) → [固定憲章](docs/AI_PROJECT_CHARTER_JA.md) → [正式戦略](docs/PROJECT_STRATEGY_V2_JA.md) → [最短MVP](docs/R125_THIN_VERTICAL_SLICE_PLAN_JA.md) → [時系列の詳細な研究・失敗記録](docs/AI_RESTART_JA.md) を読む。指示の優先順位は「ユーザーの最新指示／固定憲章と戦略 ＞ 実コードと実CI ＞ 履歴文書の過去時点の記述」。

## 2026-11-02 23時台：**実Qwen→Education施工→2室実歩行**まで到達

- **実Windows/Ollamaで`qwen3:14b` 1応答 → 短いArchitecturePlan → 真正B143 2,089セル → SOURCE 2機能室到達 → 厳格3素材（白コンクリート660・鉄ブロック1413・ガラス16）で62直方体MakeCode → Minecraft Education内の現物建築**まで実証。
- ユーザーのゲーム画面に `mabset`、9層の敷地安全検査PASS、`Placing attempted`、鋸歯状屋根のある実際の外観。**ユーザーはさらに `mabverify` の `Positions and material counts match.` を確認し、実験室と観測記録室の両方へ実際に入れたと報告。** この2項目はチャットによるユーザー実機報告であり、新規の結果スクリーンショット/歩行動画は未提出。
- 正式ラベル **`EDUCATION_REAL_WORLD_2089_CELLS_USER_VERIFIED_AND_TWO_ROOMS_WALKABLE`**。これは**一棟の縦貫MVP実証**であり、ユーザー人間ART判定、実機の高天井体験、室内設備の機能性、復元試験、他用途の実機実証、小型2Bモデルは未認証。
- **`mabbuild` の再実行禁止**。次は人間ART・実高天井の実機観察を必要に応じて確認し、既存汎用コンパイラを使って未実証用途の**店舗と二階住宅**へ展開。研究施設の現物を模擬テストで置換しない。
- [最新詳細・原本SHA・A/B/C/D/E分離](docs/R125_LIVE_QWEN_EDUCATION_REAL_PLACEMENT_20261102_JA.md)。非公開Qwen生回答とユーザーのワールドデータ・座標は公開しない。以下の古い日付の状態より最新実機ログと現在HEAD/CIが優先。

## 1. GitHubの正本と保護境界

- Repository: `ryomashibaba/MinecraftAIBuilder`、研究ブランチ `feature/b198zr1-protected-architectural-revision`。
- Draft PR [#128](https://github.com/ryomashibaba/MinecraftAIBuilder/pull/128) を **Open / Draft / Unmerged** のまま継続。**main変更、PR Ready/Close/Merge、force push、凍結原本の上書きは禁止**。
- この文書を書き込む直前の研究HEAD: `cf970b9a4bc49e0f2cdce4cf82bdabcfbcb10d3e`。**このSHAを「永久の最新」と見なさず、各チャット開始時にGitHubの現在HEAD・差分・CI・PRを再取得**。
- 研究ブランチへの通常のコード保存は許可されている。既存CI・保存済み証拠・B143基盤を再利用し、新規作り直しはしない。

## 2. 何を完成させるプロジェクトか

**未知の日本語等の自然言語指示 → ローカルQwen/Gemmaが用途・空間・動線・意匠を自主設計 → 短い意味IR（ArchitecturePlan等） → B143の実3Dボクセル → SOURCE・3D・美術の別々の審査 → バックアップしたMinecraft Education試験ワールドで施工 → 人が入口・室内・階段を実際に歩いて検証。**

初期実証は **小二階建て住宅／入口付き店舗／小研究施設** の異なる3用途。特定建物のラベル替え、箱の装飾、形だけの階段・空洞、固定テンプレートを禁止。大規模な将来構想より、動く**最小の縦貫成果**を先に作る。基本モードは将来 **8GB Apple Silicon Mac + 2B級4bit** を目標とし、大規模27Bモデルへの必須依存を避ける。

## 3. 現在の真正な到達点と最優先工程

- **研究施設の実Qwen 1呼出し・B143 2,089セル・実機施工・MakeCode材料/位置一致・人による2室の実歩行は一件成功。** ユーザーの実機報告と画面の証拠区分を守る。屋根下新空気476セル・2幅縦連続75箇所はSOURCE検査であり、実機の高天井を見た証拠ではない。
- **SOURCE/3D/実機Dは限定PASS、C ARTはHOLD**。室内の設備実用性、モデルの完全自由形状設計、他2用途のMinecraft実機、将来2B Macは未完。出所は`DECLARED_LOCAL_LOOPBACK_NOT_INDEPENDENTLY_VERIFIED`のまま、偽の独立認証を主張しない。
- 保存済み既存研究施設を**再施工・再推論しない**。ユーザーのPCでの結果は保護し、可能なら実機での屋根下空間・各室の使い勝手を目視確認。次に既存`r125-semantic-pilot.mjs`、SOURCE経路/床/屋根監査、厳格材MakeCode経路を**別用途の店舗と二階住宅**へ再利用し、規格箱のラベル替えにしない。
- 次用途「**入口付き店舗**」の新規実Qwen 1応答を安全な一時worktreeで取得する `scripts/r125-live-safe-worktree.ps1 -UseCase Retail` を追加。モデル設計の売場とバックヤードを独立判定し、SOURCE経路・素材が通る場合のみ別の**オフライン**MakeCode候補を作る。**この店舗モデルはまだユーザーWindowsで未実行／Minecraftで未施工／ART HOLD。** 旧研究施設の原文・ワールドの再利用施工禁止。
- 既存の旧Qwen2620セル原本、失敗証拠、非公開のローカル結果、ユーザーのワールドは不変。開発作業は研究ブランチのみ。毎回現HEAD・CIを再取得する。

## 4. 安全・出所・履歴

- Qwen/Gemmaローカル推論および**識別・バックアップ・復元・範囲/材/経路/停止**の技術ゲートをすべて満たす隔離済みEducation試験ワールドへの施工は、2026-10-24以降の包括許可内。技術条件未達なら `NOT_PREPARED`、`9 BLOCKED`、`BuildPlan.operations=[]`、`WorldWrites=0` を維持。
- A: SOURCE/CI、B: 真正3D、C: 人間ART、D: Minecraft実機・歩行、E: 実モデル独創性を必ず分離。偽の「モデル生成」「歩いた」「施工済み」を禁止。公開GitHubに未公開のユーザーQwen原本・個人データを追加しない。
- R190/E1/E2の試行、実際の花屋試験施工・素材制約、幾何・動線・屋根の失敗、採否は[完全引き継ぎ](docs/MINECRAFT_AI_BUILDER_COMPLETE_HANDOFF_20261102_JA.md)と[全履歴](docs/AI_RESTART_JA.md)を参照。**既存の本物の成果があるのに、新規の模擬実装へ逃げない**。

## 5. 新チャットで送る一文

> MinecraftAIBuilderをGitHubの研究ブランチのルート `START_HERE.md` から完全に引き継ぎ、リンク先の固定憲章・戦略・完全統合引き継ぎ・AI_RESTARTを読んでください。現在HEAD／PR #128／CIを実照合し、固定方針・原本保護・安全契約を維持してください。私は今PCを使えます。**実Qwen→実B143→Educationの最短縦貫**を優先し、必要なら最小限のPowerShell操作を1回にまとめて案内し、実装・テスト・研究ブランチ保存まで続けてください。長文やZIPを再要求しないでください。
