## R190-BZ 開始 — 2026-10-30 JST（SOURCE実装済／CI・ART未確定）

前工程R190-BYの大型側壁問題を受け、連続閉輪郭から離れた新SOURCE研究を開始した。作者定義の3Dパッチ（A SPLIT HORIZON/B CROSSWIND FOLD 各18パッチ）を独立の `source/ai/r190bz-open-shell.mjs` で決定論的に実ボクセル化する。原本は `evidence/r190bz/FORM_A.json`・`FORM_B.json`。8視点・3D・SHA・ボクセル・保護空洞の検査スクリプト、負例、Windows/Ubuntu CIを追加。

**現時点では技術SOURCE CI結果は未確定、実3Dの独立ART審査も未実施。正式ART HOLD、採用0、用途・経路未試験。** この実装が美術成功を意味するとは扱わない。BY/B143・旧原本・mainは無改変。実Qwen/Gemma POST0、worldContacts/worldWrites0、9 BLOCKED、NOT_PREPARED、BuildPlan空。Draft PR #128はOpen/Draftを維持。詳細：`docs/R190BZ_DISCONTINUOUS_OPEN_SHELL_JA.md`。次に必ずActionsの真正3D・8視点を確認し、SOURCE・ARTを別判定する。

---

# R190-BY 最終審査（2026-10-30 JST）— 自由輪郭ロフト技術PASS・美術REJECT

- 新`source/ai/r190by-freeform-loft.mjs`は作者の不規則な10点輪郭を左右各8高度で補間して最終SOURCEボクセル化。A/SUNRIFT 37,773セル、B/TIDAL FOLD 38,525セル。既存B143ネイティブのloft実装ではなく、描画Viewerのみ互換。
- [専用CI #41047622898](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41047622898) Windows/Ubuntu両SUCCESS、各6/6負例/正例テストPASS。保護前空洞6292、後空洞5148セルは両案とも最終占有0。元BM原文・過去原本は保存。
- 真正front/rear/west/east/roof投影の独立美術審査はA/Bとも**ART REJECT、全体ART HOLD**。正面のくびれは進歩したが、側面が巨大平面壁。実ボクセルY5..90でZ幅40以上の行はA63/86、B76/86。次R190-BZは前後にも大きな空間切れ目・斜め主殻・地上見上げ視点の構成に再設計する。[詳細](R190BY_FINAL_ART_JA.md)。
- 現状は自由形状SOURCEのみ。実Qwen/Gemma0、Minecraft施工0、建築用途・階段・R4/BV移動認定なし、main不変、Draft PR #128 Open。

---

# R190-BX：彫刻先行の2案を真正B143と5視点で検証（2026-10-30 JST）

- 最新：[R190BX最終美術判定](R190BX_FINAL_ART_JA.md)。A初稿は斜材Y=-1越境でB143_REJECT、原本保存のまま作者別改訂A2を制作。Bは独立の一体アーチ型主殻。
- [専用CI #41044726835](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41044726835) Windows/Ubuntu両SUCCESS。A2実45,316voxel、B実40,693voxel、前後保護空洞占有0、真正3D・5投影・出所とSHAを保存。ただし2案は「彫刻研究」で居室/動線は未検証。
- 実5方向を確認しA2は重なり楕円塊、Bは長方形を抜いた大きな楕円門に見えるため**ART REJECT／全体ART HOLD**。正式採用0。次BYでは基本プリミティブ増量を止め、作者指定の不規則断面loft/contour skinの表現・真正3D研究から始める。未実装を完成扱いしない。
- 実ローカルQwen/Gemma新推論0、Minecraft接触/施工0、main/過去原本不変、Draft PR #128 open。

---

# R190-BW — 技術を維持しつつ美術REJECT、次は大空洞と外殻の一体先行設計（2026-10-30）

- BW A/B/A2/B2はsource機能HOLDを再現、別原本A3/B3は空中橋13本で本物のBN/B143とR4/BV2幅の11層・20室・8目的地、空洞0占有をWindows・Ubuntu両OSのCIで技術限定PASS。
- 5方向の実ボクセル投影からA3/B3は巨大ガラス壁/箱状スラブ反復/後付けリングなどでART REJECT。正式採用0、全体ART HOLD。[美術レビュー](R190BW_FINAL_ART_JA.md)。
- 次は外形・巨大空洞・都市公共ホールを先に一体設計し、技術機能は後から正直に検査。Chat原本はモデル成果にすり替えない。Qwen/Gemma新推論0、Minecraft施工0、main不変、Draft PR #128。

---

# R190-BW A3/B3（2026-10-30）— 13選択橋の別原本による機能回復研究

- BW初稿A/B、作者追加のコア横床を持つA2/B2とも実CIで東翼のR4用途空間18/20・幅2strip目的地7/8、用途空間16/20 HOLD。A2/B2の横床だけでは復旧しないという仮説の反証を証拠化。
- A3/B3では失敗箇所の4階のみ各2橋に戻し外部橋合計13本。元18本の等間隔反復への全面回帰はしない。元BU/BW/A2/B2原本は不変。真正R4/BV最終検査前にはPASSと呼ばない。
- 美術は巨大円盤を外したA2/B2の実五投影を別途評価。正式採用0、ART HOLD、Qwen/Gemma新推論0、Minecraft施工0、main変更禁止、Draft PR #128維持。

---

# R190-BW（2026-10-30）— 巨視的な外形変化と不通区画を原本別に診断

- R190-BU原本A/Bはそのまま。BW初稿A/Bでは、均質な18橋を9橋へ減らし斜交構造、3/4テラスを設計したが、北/南踊り場の横連絡がなく、厳格R4が18/20空間・stripは7/8目的地・16/20空間でHOLD。A:東翼6/8階、B:東翼4/10階が未到達。
- 本物の五投影では巨大な楕円状の後部飾りが空洞を視覚的に塞ぎ、ART HOLD。A2/B2はその楕円を撤去し、作者が11階ぶんのコア横廊下を独立改訂として追加。厳格再検査の結果を確認してから採否判断する。
- 新実Qwen/Gemma推論・Minecraft施工0。Draft PR #128 Open、mainと旧BM/BU原文は変更禁止。正式採用0。

---

# MinecraftAIBuilder — R190-BV実ボクセル通行監査結果（2026-10-30）

- Windows/Ubuntu公式CI #41016534501 で独立テスト9/9 PASS。BU A/Bとも旧1セルR4は8/8目的地、厳格2×2四足支持では1/8目的地・1/20空間HOLD、段差対応の横2セルdirected stripでは**8/8目的地・20/20空間**技術代理PASS。
- 2×2四足支持は通常階段の高さ変更を過度に拒否するため結果を混同しない。横2セルも旋回・ブロック当たり判定・世界実歩行を認定しない。両OSとも9/9テストPASSかつ8/8目的地・20/20空間のstrip代理PASSを確認済み。
- A/Bとも視覚美術ART REJECT/全体HOLD・正式採用0、Qwen/Gemma実推論0、Minecraft施工0。検査結果の詳細: [R190-BV](R190BV_WIDE_WALKABILITY_AND_ART_JA.md)。

---

# R190-BV 補強：階段を誤検知しない2セル幅ストリップ（2026-10-30）

- 最初の全4足元支持2×2基準では、BU A/Bとも入口OKだが上階に到達できず1/8目的地・1/20空間のHOLD。これは一般的な段差上昇を幾何的に拒否する厳しい規則の副作用がある。
- 別に進行方向の横並び2セルと頭上3セル空気が連続する directed strip 基準を追加し、実幅2の階段踏面をテスト。2つの測定は別結果。どちらもMinecraft実歩行の保証ではない。
- 対象BU原本は凍結、Art REJECT/HOLD、Ollama新推論0、Minecraft施工0。[BV詳細](R190BV_WIDE_WALKABILITY_AND_ART_JA.md)

---

# MinecraftAIBuilder — 最新R190-BV：真正BUを独立2×2連続通路検証（2026-10-30）

- BU A/Bは旧Windows/Ubuntu専用CI #41014636860で2/2 SUCCESS、11層/20空間/8目的地の1セルR4経路PASSと2大空洞占有0を確認。原文SHAは保持。
- しかし元のR4はプレーヤーの実幅を確認しない。BVで完成全ボクセルに対する保守的2×2四足支持・頭上3空気の別経路審査を新設。元1セルPASSと切り分けてHOLDを記録し、実Minecraft歩行のPASSを捏造しない。
- 実投影はA/Bとも大きな平坦面、均質な橋の反復が主でART REJECT、全体ART HOLD。詳細: [R190-BV](R190BV_WIDE_WALKABILITY_AND_ART_JA.md)。
- Chat作者の原案であり実Qwen/Gemma推論0、モデル原本無変更、Minecraft施工0、main不変、Draft PR #128維持。

---

# MinecraftAIBuilder — R190-BT 完全なCIと美術審査（2026-10-30 JST）

- 最新設計研究V3A2/V3B2：Ubuntu/Windows CI両SUCCESS、SOURCE_MULTIPLE_MASSING_PASS。最終9立脚階、空気0障害/支持床欠落0、抽象経路5/5目的地・9/9用途空間。
- 公式美術審査ART REJECT（A2の階段グリッド反復、B2の巨大白色コア）。正式採用0、全体ART HOLD。[独立美術レビュー](R190BT_ART_REVIEW_JA.md)。
- 次R190-BUは格子の追加でなく、主空洞・二つの大きな構成体・公共の架橋と高層用途が一体となる大胆な新3D構成へ。ユーザーの用途依頼には忠実に、旧V3A2の外形には拘束されない。
- Qwen/Gemma新形式実推論0、実Minecraft接触0、NOT_PREPARED/9 BLOCKED/BuildPlan空、main/過去のBM原本不変。Open/Draft PR #128。

---

# MinecraftAIBuilder — R190-BT V3A2/V3B2 比較（2026-10-30 JST）

- V3A真正3D技術PASSだが、巨大金属階段コアが造形を支配しART REJECT。
- 失敗V3B原本（B143_SHELL_TOO_THICK）を保護。V3A2ではコアを4柱リング骨格へ変更し、V3B2では作者が屋根半径を再設計。
- V2/初期V3A/失敗V3B/修正版2案を同一BN/B143/R4と五投影で検査。Open/Draft PR #128・ART HOLD・正式採用0・Qwen/Gemma実推論0・Minecraft接触0。

---

# MinecraftAIBuilder — 最新のR190-BS V1→V2真正3D機能検証（2026-10-30 JST）

- 元Qwen/Gemmaの原文は変更なし。GPTチャット独立サンプルCITY VEILを1案設計し、V1の空間/上下動線不合格を真正3DとR4で発見。V1 original archiveは保持。
- 作者新案V2ではコア中空化、往復階段2レーン分離、踊り場拡幅、8階の空気干渉除去を試験。元高層ビル依頼への美術/規模/物理歩行の合格は未認定。
- 依然としてR190-BOの実Qwen/Gemmaの新形式推論は未実施・個別承認が必要。Open/Draft PR #128、main保護、ART HOLD、正式採用0、NOT_PREPARED/9 BLOCKED/BuildPlan空、Minecraft接触0。

---

# MinecraftAIBuilder — 現行開発 R190-BR（2026-10-30 JST）

- R190-BR：新Spatial Assemblyに対して native formatのフルSchema二重提示を避ける`native-only`候補を追加。従来の`repeated`が既定。両方式のschema/モデル自由度/実行制約は不変。通信0の要求サイズ比較を`STUDY.json`に記録。実モデル品質向上は未証明。
- [詳細](R190BR_NATIVE_SCHEMA_PROMPT_COMPARISON_JA.md)。R190-BQ独立ボクセル用途監査を維持。高層ビル用途不足のHOLD、ART HOLD、正式美術採用0、実Ollama新推論0。
- ローカルでの実Qwen/Gemma送信には新しいexact request SHA＋個別UUID承認が必要。mainや凍結原本の変更・Minecraft接触・施工は不可。既存Draft PR #128継続。

---

# MinecraftAIBuilder — 2026-10-30 R190-BQ 現在地

- R190-BQ：完成B143の実立脚Y・支持床・空気を独立再監査。高層ビルの用途を自己申告ラベルのみで合格にせず、人間審査HOLDを維持。
- [詳細](R190BQ_INDEPENDENT_PHYSICAL_PROGRAM_JA.md)。新形式の実Qwen/Gemma推論は未実施。次工程の実モデル推論にはR190-BOのexact requestと固有UUIDに対する個別承認とローカルOllama環境が必要。
- GitHub HEAD/CIは実行時照合する。既存Open/Draft PR #128・ブランチ維持、main/既存原本未改変、ART HOLD、Minecraft 9 BLOCKED/BuildPlan空/世界接触0。

---

# MinecraftAIBuilder — 現在地（2026-10-30 R190-BP）

- 継続ブランチ `feature/b198zr1-protected-architectural-revision`、Draft PR #128 OPEN・未マージ。main/原本を保護。
- R190-BP：BOの同一出力に原文・派生3D・投影・検査・未採点美術を示す `REVIEW.html` を追加。HOLDのCLI終了コードを非0に変更。実Qwen/Gemma新形式生成は依然として未実証／ART HOLD。
- 次工程：現行HEAD/CIと原本SHAを確認し、新しいBO実推論の**個別承認を得てから**高層ビル原依頼で実験。原文/形状/人間美術を別々に判定。
- Minecraftは NOT_PREPARED / 9 BLOCKED / BuildPlan空、世界接触・施工0。以下は改変しない過去記録。

---

# 2026-10-28 — 現在地（最小更新・以下は保存済み履歴）

- 最新GitHub HEADは都度 `git rev-parse HEAD` で再確認。継続ブランチ `feature/b198zr1-protected-architectural-revision`、Draft PR #128 OPEN・未マージ。
- R190-AA pilot-01 の実Qwen3:14b応答は公開済み原文SHA256 `0bf706181bb2b7a30f8082f896a703c33749ba55f75d42010adba88f47c84f17`、2,581バイト、B143 0/1、ART HOLD。入力形式だけでなく空間設計にも重大な不成立がある。真正3D未生成。
- R190-AA/AB/ACのfake-only/オフライン専用ActionsはHEAD `5057ed48150836365727573a518c503669373c99` で全3件SUCCESS（建築成功を意味しない）。
- **R190-AB実モデルの1件は実施済み。** 図書館 `contract-01` は原文SHA256 `e39fe020e596dd759ed12a680f11e8824ce2e673d03636dfedb4dfff1cf2b50a`、2,826バイト、2,035出力トークン、52,231 ms、`B143_OUTSIDE_LOCAL_BOUNDS`でHOLD、真正3Dなし。原文・Windows実験証拠を一切上書きしない。次は既存 `r190-semantic-massing.mjs` の短い意味IR→真正B143の共通生成器を使い、独立した単層課題で1件実Qwenを検証。二層図書館の単層化は禁止。実際の設計品質は人間の3D審査まで保留。
- 2026-10-24包括許可はローカルQwen/Gemma推論に適用されるが、WindowsローカルWork/Computer Useへのアクセス権は含まれず別途承認が必要。Minecraft施工は技術安全ゲート未完で引き続き禁止。main、凍結元、旧原文を変更せず、9 BLOCKED・WorldWrites0・ART HOLDを維持。
- R190-ABは既存5種類の凍結日本語建築要求を `--task` で選択できるが、最初の旧pilot-01比較は `library` を指定。別用途の評価を図書館に固定せず、実モデル由来とホスト由来を分け、見た目を人間が審査する。
- **中止基準：** 実モデルで同じ書式/空間不成立が続く場合はJSON直接生成への過度な最適化を停止し、意味設計IRを中心に切り替える。R番号増殖、模擬CI増殖、同じ建物の延々とした微修正を進捗としない。

---

## R189-A — 初回CIのルーフライン証拠点を修正（2026-10-26 JST）

- 初回HEAD `072a489`、[B198G #40330886348](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40330886348) は旧original-source-geometry **SUCCESS**、R178〜R188旧回帰PASS、R189新規0/4（`INTENDED_HIERARCHY_NOT_VISIBLE_IN_VOXELS`）。
- 原因を保存済みR188の真正B143 3Dソース`surface`セルで独立照合：西中央の確認点(17,23)の旧屋根topは**22**（上空横断部の屋根が重なる）であり、西ホールtop15と見なした検査が誤り。一方(8,30)は旧西ホールの実屋根top**15**、R189の4大容積CUTは(8,30)を含まずtop15のまま。サンプル点を(17,23,14..17)から**(8,30,13..15)**へ変更、座標付き失敗メッセージを追加した。**元実体形状・再コンパイル・旧動線・IR安全・元ソース保護のゲートはいっさい緩和しない**。他の参考点(8,10)=15、(33,11)=21、(39,37)=21も旧R188実セルで確認済み。
- 今後同じミスを抑えるため、屋根の最高ボクセルが複数棟の重なりを含む点を、単一棟の証拠として流用しない。R189-A CI合格までは未合格。ART HOLD、NOT_PREPARED、9 BLOCKED、BuildPlan空、WorldWrites0、Draft維持。

## R189 — 4大体積を明示IRから物理的に再配分して高低差/主従を検証（2026-10-26 JST）

- 確定起点：R188-A HEAD `e6729bc`、[公式B198G #40328293859](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40328293859) 全2ジョブSUCCESS。R188は西30セル×2本、東34セル×1本の真正B143回廊と横断軸を作ったが、美術審査では**正面以外の輪郭がほぼ不変、箱型巨大塊問題が解決しなかった**。R178〜R188の「窓・穴の小さな追加」をこれ以上反復しない。
- R189は旧R188/R187原本を改変しない**独立した大きな体積形状の仮説研究**。`minecraftaibuilder-r189-massing-priority-study-v1` に、旧R188全入力`base`と、`majorMassing:{architecturalIntent:'low-public-front-central-occupied-high-back',volumes:[{sector,origin,size}×4]}`を要求。各`origin,size`は**申告者が決める幾何**であり、ホストは部屋ラベルから秘密の箱テンプレートを選ばない（ただし4研究候補領域と範囲・床高さは今回の既存R188固定48×48境界に制限）。STATIC SYNTHETIC、実Qwen/Gemma推論0回、汎用AI建築生成器とは主張しない。
- 最重要の全体量感：西PUBLIC前面[6..18,9..17]の高所y10..15を除去し下部公共ポディウムを低く、西後面[6..18,33..38]をy11..15下げて中央の実階段帯を主役にする。東PUBLIC前面[31..42,8..16]をy12..21大きく低くし、中心の上空横断帯（検証済み上階室）と対比させる。東後面[31..38,33..41]をy16..21下げてx39..42の既存高い背面コアとの差を形成。**4箇所の平面領域全体にわたる主立体の高さ変更**であり単なる窓CUTではない。初期candidateは全て研究者が明示した入力。
- 真正B143コンパイル後、旧R188の全5ソース到達ゾーン、R187の日照空気線5本・真正屋根無しスカイコート、R186の上階1室・16段階段・展示機器、R188の全長3回廊/公共横断軸を**そのまま再監査**し、1個も壊さない。4申告領域外の旧実体セル/材質が変化したら直ちにFAIL、材質変更0、実減算1,200セル以上を要求。旧/新屋根最高Yを対象各1セル柱で比較し、各部で60%以上の実屋根柱に3以上、52%以上で4以上の高さ低下を確認。支持されていない屋根キャップや架空室を`PASS`として付け加えない。部分形成の保持コア（旧中央階段帯と東後部の高い支持）の実ボクセル連続性も確認。
- 不適切なIR・座標・機能ゲートや各領域CUTを省いた物理差分に対しfail-closed負例テスト。新旧真正回転3D×2、実B143 5方向立面×10、4領域の前後roof高さ全サンプル・安全監査JSONを専用B198G artifactに出力し、**正面・東西側面・屋根平面を人間として批判的に比較**してART HOLD/PASSを分ける。成功の判定はCIだけでなく視覚的に有効かに依存。
- 限界：今回も大きな体積を減算する研究であって**新規の自由設計モデルが見つかったわけではない**。高品質なモダン建築への確実な突破を自動宣言しない。建築力学、Minecraftプレイヤー移動、地上公共区画・上階展示室以外の全用途室は未検証。R189のCIは完了するまで未合格。
- 保護：ART HOLD、NOT_PREPARED、9ゲートBLOCKED、BuildPlan.operations=[]、constructionApproved=false、executionAllowed=false、WorldWrites/Contacts=0。Draft PR #128の維持、main未マージ、R188原本未変更。約57ワークフロー/commitは未改善、安全テストの削除でなく変更一括コミットで抑制する。

## R188-A — 初回新規テスト3/4PASS→無効IRケースのfixture誤参照修正（2026-10-26 JST）

- 初回HEAD `add38c1` [B198G #40327928455](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40327928455) はr172-quick-review FAIL。新規R188テスト **3/4 PASS**：実B143の3本の全長公共回廊・横断2幅軸・元16段階段/室・設備・テラス採光維持・物理部材削除の負例・新旧2個の回転3D+10方向SVG+QA生成は通過。テスト「無効IR拒否」だけ`TypeError: Cannot set properties of undefined (setting 'roomId')`で停止。
- 原因：R188合成入力の`base`自体がR187のJSON全体であり、`daylight`は`x.base.daylight`。テストに誤って`x.base.base.daylight`を書いていた。**試験の参照を1階層だけ修正**。製品のIR、実B143実装、経路証明、安全閾値はいっさい緩和しない。再CIがSUCCESSになるまではR188最終合格ではない。
- 全てSTATIC SYNTHETIC／実LLM0、建築構造耐力・Minecraftプレイヤー実歩行未検証、ART HOLD、NOT_PREPARED、9 BLOCKED、空BuildPlan、WorldWrites/Contacts 0、Draft #128、main未マージ。

## R188 — 形だけの窓追加を停止し、2棟を貫通する公共回廊・横断軸と実正面量感を研究（2026-10-26 JST）

- 起点R187 HEAD `22246d3`、[品質CI #40325544793](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40325544793) 2/2 SUCCESS。R187は西階段の視線3本、東上階の視線2本、16段階段、実1室/展示設備/屋外テラスへのR125ソース経路を獲得したが、**真正正面投影ではR186とほぼ同じ厚い無地の箱が支配的**。美術ART HOLD。
- R188は既存R187本体を一切変更しない**独立opt-in**、新スキーマ`minecraftaibuilder-r188-inhabited-frontage-ir-v1`。明示された `frontage:{westArcade:'stair-framed-two-arcades',eastLoggia:'public-through-loggia',upperSetback:'east-front-occupied-mass-cut'}` だけを受ける。**これは現段階では研究者作成の固定候補文法、決して本物のQwen/Gemma自動建築設計ではない**。IR無効・Minecraft施工承認は拒否。
- **西の実貫通建築**：16段階段コアx11..13を保持し、その両側のx9..10とx15..16に、前面z9から後ろz38まで**各全長30セル**、y2..8の大きな独立公共回廊を実際のB143`cut`で掘る。旧階段・上階室・展示設備の1セルも変えない。
- **東の実貫通建築**：従来の巨大直方体の下層x35..38,z8..41をy2..11の**34セル長の覆われた公共ロッジア**として実際に取り去り、南側の高所x35..38,z8..16,y17..21を深く欠き取って、旧厚い正面主ボリュームの段状後退をつくる。東スカイコート、ガラス室、木の屋外テラス、低層からの既存支持ポストは対象範囲外で維持。構造計算は未検証。
- **公共横断軸を新設**：西x10..22と東x24..35,z10..11,y2..6をソースで実際に開き、旧中央の入口軸と新3回廊を**2幅の支持床・空気を持つ実横断歩行路**でつなげる。R125で旧入口から3つの新地上目的区画+元の上階室+元のテラス、さらに展示物のサービスパッドの全到達を監査する。旧R187/R186の16段階段、3西採光線、2東採光線、屋根無しスカイコート、階段材質、展示設備アクセスも**再監査**。元ソースの削除が宣言CUT範囲だけで、宣言外の材質/セルが一切変わらないことを全ボクセルで比較する。
- わざと各貫通CUT、2本の横断CUT、高所主ボリュームCUTを削除して、再コンパイル監査が必ずFAILする負例を用意。R187 vs R188の同条件の本物の回転B143 3D×2、正面・裏・東・西・屋根の実投影図×10と証拠JSONをB198G独立Artifactに出力する。見た目の評価はCIとは**独立**。美術自動合格は認めない。
- これはR178〜R187に繰り返された固定箱の部分変更の延長であるリスクがある。評価では**正面の抜け・外形の主要な主従・玄関体験の見通しが旧R187から本当に変わったか**を主要条件にし、まだただの箱であればART HOLDを継続し、新案を増やすより構成自体の再調査を優先する。
- 実Minecraftプレイヤー歩行、現実の構造耐力、避難安全、全用途/全家具、外装の防水、実LLM推論は未検証。最後までNOT_PREPARED、9 BLOCKED、BuildPlan.operations=[]、constructionApproved=false、executionAllowed=false、worldWrites/worldContacts=0、Draft #128維持・main未マージ。未検証CI結果はPASS扱いしない。57 GitHub workflow/PR commit の効率問題は未解決。

## R187 — 外観と上階室の因果関係をもつ日照・眺望と実アクセスの限定研究（2026-10-26 JST）

- 起点：R186-A HEAD `cccec18`、[公式B198G CI #40322856645](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40322856645) 2/2 jobs **SUCCESS**。階段16段から上階1室・展示設備への二幅source-routeが証明されたが、外観は依然巨大な二つの箱。**ART HOLD**。今回は建築的に意味のある「部屋から外を見る／階段に自然光を取り込む／室外のテラスへ歩いて出る」を、外側の欠き取りと内部用途とを同時に検証する。
- R187新規opt-in `minecraftaibuilder-r187-daylit-upper-court-source-v1` は旧R186全文 `base` と厳格な `daylight:{roomId:'assembly-gallery',roomFacing:'east',stairFacing:'west',courtUse:'accessible-outdoor-balcony'}` を受ける。従来ソースは**変更しない独立分岐**。各実験はホストが固定している寸法で生成する**静的合成入力**、本物のQwen/Gemma生成や汎用建築生成ではない。
- **西階段採光**：旧西ホール外壁に深い実ボクセル削除 `x6..10,y6..15,z18..29` を施し、外面 `x6,y7..14,z19..28` に実ガラスを追加。階段の実クリア空気セル→内部空気→ガラス材ID3→外気までの直線3本を元のB143再コンパイルで検証。階段16段の2幅支持床と頭上空気は**R186の同じ監査を再実行**し、階段全セル・素材を原本と比較して破壊を拒否。
- **東上階の眺望＋空中中庭**：旧高層棟の `x31..42,y10..24,z21..30` を**実際に空間として欠き取って**室の東側の巨大空気ボリュームを形成。室外壁 `x30,y18..19,z22..27` を眺望ガラス面とし、隣接する2幅の実ドア `x30,z25..26,y17..19` から、支持された `y16,z22..30` の屋外木材床を介し東中庭へ出る。支持柱2本は旧高層棟の低層実地盤からバルコニー床につながるボクセルとして実装。テラスを「近くに描いただけ」にはしない。
- 新規監査は旧R186上階室/階段/設備と公共歩行軸を再監査し、屋内からガラス越しに本当の外気まで光学的な遮蔽の無い**B143セル軸上の直線視線**（照度や時間帯/太陽角度は未シミュレート）と、室ドア＋外テラスへの**R125入口開始2幅source graph到達**を確認する。加えて屋根無し鉛直空気柱・旧16段階段/展示設備/下部公共軸を元と実セル素材全一致で保護。
- 負例：窓、屋根空気CUT、テラス床、支柱、ドアを外せば再コンパイル監査FAILするテスト。R186とR187の真正回転3D×2、5方向実投影×10、空気/ガラスの視線証拠とQA JSONをB198G Artifactに保存し、**目視の美術審査を機能検証と別々に**実施する。CIは完了後にのみ成功を宣言。
- 制限：**実Minecraft物理歩行・日照照度/採光率・外壁の雨仕舞い・構造的安全性・他の用途室は未検証**。テラス床をB143で支持したという事実は現実の耐力/安全性を意味しない。美術は自動PASSしない。仮の形態に装飾窓を乱造しない。
- 現行の安全状態を保持：ART HOLD、NOT_PREPARED、9ゲートBLOCKED、BuildPlan.operations=[]、executionAllowed=false、constructionApproved=false、worldWrites/Contacts=0、Draft PR #128、main未マージ。57 workflow/commit発火問題は未解消、今回変更は一括コミットとする。

## R186-A — 本物の組立設備の証拠座標を修正（2026-10-26 JST）

- R186初回HEAD `d9e708f` の [B198G CI #40322576583](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40322576583) は新規R186 0/4、`R186_VERTICAL_SLICE_MULTIPART_UPPER_DISPLAY_ABSENT` でFAIL（R178〜R185の旧回帰PASS）。R186の厳密検証順序では、その前に**16段x2幅の支持/空気パッド・上階y17到達・R125 1階/上階2ゾーン/設備サービスパッド・室外壁屋根/実入口を全て通過**している。ただし正式なR186 PASSではない。
- 原因は証拠側の単一セル座標誤り。組立上部展示のガラス部は `[27,18,23] size[2,2,1]` なので `(27,19,23)` は本物、`(27,19,24)` は空気。最後のチェック対象を実ソースに合わせ、加えて**木材材質ID=4とガラス材質ID=3**が該当3サンプルに現れることをコンパイル済みセルから厳密確認する。形状そのもの、設備位置、元のR185、階段/経路/安全ゲートは変更せず、証拠を実モデルと一致させた。
- R186-AのCIは次回確認まで未合格。ART HOLD、施工禁止、NOT_PREPARED、9 BLOCKED、空BuildPlan、worldWrites/worldContacts=0、Draft #128、main未マージを維持。

## R186 — 空中横断型の初の二階接続・上階室・設備の一体化研究（2026-10-26 JST）

- 基点：R185 HEAD `4dbe80f`、[品質CI #40319507121](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40319507121) **SUCCESS**。R185は下部の地上公共入口→屋根下広場の真の2幅支持通路を実証したが、空中横断型の上階利用と人間スケールの室機能は未証明。美術ART HOLD。
- R186は旧R185の**空中横断案だけ**を対象に、新規opt-in `minecraftaibuilder-r186-two-level-source-slice-v1` を新設。R185の検証済みソース設計を変更せず、独立`R186`として後段ボクセル幾何を作る。元の抽象R184プログラムの集会用途を限定的に上階展示/集会室へ対応させるが、**建物全体の3機能を実装したとは主張しない**。
- モデル入力が許されるのは厳格な `{schema,base, slice:{sourceHall:'west-civic-hall',ascent:'straight-stair',upperUseId:'assembly',upperFloorY:17,serviceRole:'display-stand'}}`。48x48の固定ソース研究に限り、幾何詳細は**ホストが仕様化した候補**。未知Qwen/Gemmaモデル自律設計ではなく実LLM呼出0。
- 同じ真正B143ソース内で、西ホールの物理壁を切り欠き、y=1..16の**16段の幅3階段を実現**。2幅歩行パッドの支持床/頭上2空気を全16段で直接証明。階段頂部→x11..18の上階ランディング→旧空中橋の実床y=16→上階1室へ連続させる。
- 上階1室（x21..29,z21..27,y17..20）には**四周壁／旧橋上の実屋根／正面の開口／2面ガラス／組立式展示設備1件**を配置。R125既存2幅ソースグラフで **1階入口から地下ではない地上公共空間＋上階y17の実室＋展示設備のサービスパッド**へ到達検証。以前の`not tested`を偽の室PASSに置き換えず、上記**1室・1設備だけ**機能ソース検証。
- 回帰として、R185の公共中軸4幅x22..25,z7..38にある全実B143の支持床/通路y1..3のセル/素材が一切変化しないことをボクセル毎に検証。階段・ランディング・壁・設備を実ソースから消した負例を独立監査で拒否。R125はdy±1歩行パッド隣接をソースで検査するもので、**実Minecraftプレイヤー衝突・建築の耐力/安全・全用途の完成を証明しない**。
- 新旧B143回転3D×2、5方向図×10、階段高さ図、QA JSONを独立B198G Artifactへ保存し、実3Dで建築美術を別途審査。**ART HOLD／ユーザー未採択**。
- CI確認前にPASSと主張しない。Draft PR #128/main未マージ、NOT_PREPARED、9ゲートBLOCKED、BuildPlan.operations=[]、constructionApproved=false、executionAllowed=false、worldContacts=worldWrites=0。57 workflows/コミット重複問題は継続、安易なチェック削除を避け、一括コミットで進める。

## R185 — 建築の入口・人間スケール・屋外公共空間を実B143と経路で同時研究（2026-10-26 JST）

- 基点：R184 HEAD `759da04`、[CI #40316667393](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40316667393) **SUCCESS**。実B143を3つの異なる全体構成へ分岐したが、円環＝無地の円筒、空中横断＝箱と平板、段状＝積層箱、いずれも美術ART HOLD。形の差分を増やすことと、高品質モダン建築を生成することは別。
- R185は**円環中庭と空中横断の2方向に絞った新しい独立ソース研究**。旧R184原本3案は変更しない。R185の `minecraftaibuilder-r185-public-experience-ir-v1` は元R184完全IRと `experience:{entranceAxis:'south-to-north',entranceWidth:4,publicSpace,targetUseId}` を受ける。公共spaceとプログラム主要用途の整合を厳格要求し、未対応形態・世界書込指示は拒否。研究者固定文法から物理モデルを作る**静的合成研究**であり未知LLM生成ではない。
- 円環：単なる巨大無地円筒から、**南面に広い実物の入口CUT、東西に人間スケールの開放回廊、内部中庭が実体積として見通せる低高差付きの東西主部**を再設計。外側の曲面と内側の実公共空間の関係を問う。
- 空中横断：2つの巨大箱と1枚の板ではなく、**実体積で低層ロッジアをえぐった西ホール、縦吹抜の東主棟、支持帯・壁面ガラスと床/屋根を持つ深い上空横断部**を再構成。地上には覆われた公共通路と明確な入口フレームを設け、上空部の下を実際に通り抜けられるかを確認。上空の歩行経路・実構造耐力は**未検証**として扱う。
- これまでの「入口形状を描いた＝動線成立」を禁止する。48×48×32のB143実ボクセルにおいて入口宣言の直後から公共空間まで、**y=1に両幅の支持床が存在し、y=2/3の両幅が連続して空気である南北軸上の2幅源検証**。さらに既存`auditR125SourceRoutes`で入口内側から目的公共空間まで支持された2幅経路を独立監査。コンパイル後の支持床・空気・外壁を実座標プローブで検証する。元R184との真の実ボクセル差分比も記録。**室/家具/設備アクセス、上階移動、Minecraft実歩行は未検証**。同じ集会/集中/補助の抽象プログラムを現物の有効室と偽らない。
- 旧2案と新2案、合計回転3D×4、実B143の5方向図×20、QA JSONを専用B198G artifactに出力し、3D観察して主従・入口・プロポーションが本当に改善したかを批判的に判断。**美術採択は自動化しない／ART HOLD**。
- 本コミットのCI結果は確認まで未合格。Draft PR #128・main未マージ、NOT_PREPARED・9 BLOCKED・BuildPlan.operations=[]・constructionApproved=false・executionAllowed=false・worldWrites/Contacts=0、原本保護。57 workflow/commitの過剰発火は未解消、安全チェックを無効化せず一括コミットする。

## R184 — ART-FIRST / 全体建築構成の根本分岐を実3Dで先に比較（2026-10-26 JST）

- 基点：R183-B HEAD `b65a56e`、[B198G CI #40312938291](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40312938291) **SUCCESS**。本物のB143ボクセルで3つの中庭側凹部を作り、全室・家具・テラスへのソース到達を証明した。しかし正面・側面の主要形状は固定3棟の直方体のまま。**ART HOLD / 美術未合格**。
- 重要な計画転換：R178〜183の固定32×32三棟/二棟の箱を小修正する路線を**一時停止**。R184は独立した48×48×32の全体**美術構成研究**で、以下の3つを同じ抽象3機能プログラム（集会/集中/サポート）から、別々の B143 実3D に描き分ける。①`inhabited-rotunda` = 現実の曲面外周・中心に大きな貫通中庭・南側アクセス開口・環状外殻、②`elevated-crossing` = 大きな2つの立体塊を上空の主動線形状で横断し下を外部空間にする、③`folded-ground` = 多段に連続上昇する外形と実際の欠き取り峡谷・屋根歩廊の対比。
- 新規IR `minecraftaibuilder-r184-composition-research-v1` はプログラム3種・敷地・選択全体文法・公共空間役割・高さ対比を受け、意図と異なるものを拒否する。**この3手法は予め研究者が書いた固定した候補文法であって、汎用生成器でもローカルQwen/Gemmaによる未知形態の自動発見でもない**。空間プログラムは候補間で一致させるが**各実体の室への割付・室アクセス・家具・施工可能性は現時点で未検証**。役割ラベルが室として実B143に割り当てられていると虚偽説明しない。
- 元B143の `cylinder` / `torus` / `beam` / `box` と物理切り欠き `cut` を用いて、概念図でなく実ボクセルから3種の回転HTMLと正面/背面/東西側面/屋根平面の5視点SVG×3（15枚）を出す。材料は限定ホワイトリスト・160要素上限・160000ボクセル/ワーク予算/ローカル座標の既存B143で検証。各候補の実ボクセル数・立面屋根高さ段差・候補間の**実座標対称差分**で、装飾を替えただけでない差を定量評価。
- **採択条件：** まず現物の屋根平面と3D、特にシルエット・主従・空間の抜け・用途を成立させる可能性を批判的に見てART HOLD/REJECTし、通過した案だけに次工程で厳密な室配置・家具/設備・R125の2幅動線・上階移動などを実装する。**美術合格はユーザー未承認、AIが勝手に認定しない**。3案すべて微妙なら別文法で探索し、旧箱へ回帰しない。
- 本R184のCIは完了確認まで未合格。原本・旧R178〜183未改変、Draft PR #128・main未マージ、NOT_PREPARED・9 BLOCKED・BuildPlan.operations=[]・constructionApproved=false・executionAllowed=false・worldContacts/worldWrites=0。実モデル呼出/実Minecraft歩行/施工は0。57ワークフロー一斉発火は未解消、変更は一括コミット。

## R183-B — 実ボクセル差分による外壁保護の問題修正（2026-10-26 JST）

- 前工程R183-A HEAD `d41a011`、[CI #40312082776](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40312082776) は新規R183 1/5・4FAIL、理由 `UNDECLARED_SOURCE_CELL_MODIFIED`。住宅の実B143 R181元モデル実ボクセル2,969個を用い、R183と同じCUT/ADDをPythonで独立再現して根本原因を確認。**既存外壁の(25,3,13),(25,4,13)が木材→ガラスに書き換わっていた**。北別棟の奥行3の凹部に対し窓開始z0+1としていたため、z最後の旧外壁まで窓CUTが食い込んだ。
- 重要：材料保護ゲートを緩和するのではなく、**北別棟の後退窓だけ開始zをz0に変え、2セル窓が新しい後退壁の内部に収まる**ように物理形状生成を修正。古い既存外壁のセルを素材を含め一切変更しない。独立したボクセル比較で住宅2,969個・店舗3,127個の「宣言CUT範囲外で失われた／変色したセル数」は修正後に**双方0件**と検証した。ただしこれはCIの代替ではなく、実モデル生成とは主張しない。
- 研究施設にはさらに別の現物問題を発見：旧主棟後室の作業台の脚がx7,z18..20付近にあり、x8開始の凹部だと新しい外壁位置x7に接触する。**本研究の合成凹部入力のみx9..12幅4に変更**し、旧作業台を壊さず、前記の器具配置比較条件はR183-Aに記録どおり継承。壁・机の実物を捏造したり元の家具位置をホストが勝手に移す実装はしない。
- 本R183-B CIがSUCCESSになるまでは未合格。実Qwen/Gemma推論0、実Minecraft施工0、ART HOLD、NOT_PREPARED、9 BLOCKED、空BuildPlan、Draft #128、main未マージ、原本維持。

## R183-A — CI失敗の起点を明確化した合成IR修正（2026-10-26 JST）

- 初回HEAD `fc17464` のB198G品質CI [#40311574345](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40311574345) は新規R183 0/4、理由 `R183_COURTYARD_VOID_NORTH_REAR_COURT_GEOMETRY`。R181/182の旧回帰はPASS。初期住宅では北別棟の凹部z=10..13が、実廊下終端から要求する屋外奥行に違反した。
- 制約の緩和は禁止。住宅の北別棟の**合成**凹部のみ z=11..13 にし、2幅アクセスz=11..12を維持。研究施設は設備の既存合成意図`far-right`が中庭側の予定凹部/後退外壁と衝突し得るため、R183の**独立合成比較実験では初めから**`instrument.corner=near-right`を明示して同じ意図を旧R181側・新R183側の**両方に渡す**。過去のR181本来の研究原本・fixtureは改変せず、過去のR181結果とbyte-identicalとは主張しない。
- 変更は合成入力のみ。生成器に「家具を勝手に移す／窓を埋める／動線を捏造する」機能を追加しない。記録と負例によりこの比較条件を明示。新CIがPASSしていない限り、本物の3D生成と美術合格を宣言しない。安全状態ART HOLD/NOT_PREPARED/9 BLOCKED/BuildPlan.operations=[]/worldWrites=0等は保護。

## R183 — 3棟の実屋根輪郭を欠き取って中庭と接続する独立研究（2026-10-26 JST）

- 基点R182-A HEAD `158b613`、[品質CI #40308623315](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40308623315) **SUCCESS**。R182の部分屋根・高窓は実B143になったが、建物本体は箱型で美術は**ART HOLD**。安易な屋根積み増しを停止する。
- R183は旧R181/182を変更しない**独立したopt-in研究**。新規IR `minecraftaibuilder-r183-courtyard-negative-mass-ir-v1` はモデル候補から `massingVoids.terraces: [{volumeId,roomId,rect:{x,z,width,depth},accessZ}]` を受ける。現時点の初期pilotは32x32、主棟後室＋前/後の別棟1室ずつに限定。各申告された凹部を室の意味・実体積に紐づけ、**屋根・外壁のB143高所セルを実際に削除**し、内部の閉鎖外壁/後退窓を再構築し、y=1支持床と中庭軸への2幅アクセス枝路を形成。
- 生成結果は真正B143の`before/after`ボクセル差分で、宣言外の旧ソース素材・旧家具を変更していないこと、3箇所の屋根が本当に無いこと、旧4室と設備4件の到達性、**旧中庭＋3新テラス**の支持された2幅の連続到達性、別途残された屋内4室の到達性を確認する。家具と新屋外凹部が衝突する場合は**家具の自動移動をせず拒否**。物体名・用途名によるホストのデザイン分岐は入れない。
- 住宅・店舗・研究施設の**静的合成3入力**を旧R181と新R183の同じプログラムで比較。成功時は回転HTML計6件、実5方向投影計30枚、監査JSONをB198Gの新artifactへ出力する。屋外動線遮断・無効IR等の負例を含む。**実Qwen/Gemma推論は0回**。3D現物の美術審査前にART PASSとはしない。
- 限界：本pilotは明示した3棟・定型32×32の中庭を前提とし、任意建築輪郭や正真正銘の汎用用途・ゲーム内歩行の成功を証明しない。凹部を3個切っただけで建築的価値が不足する場合は引き続きART HOLD。建物の室構成と外部空間の質的な新研究を優先する。
- 今回のCI結果を確認するまで実装・テストが成功したと宣言しない。Draft #128・main未マージ、ART HOLD、NOT_PREPARED、9ゲートBLOCKED、BuildPlan.operations=[]、constructionApproved=false、executionAllowed=false、worldWrites=worldContacts=0、原本保護。57ワークフロー/コミットは未解決のままCI消費を増やさないよう差分一括コミット。

## R182-A — 初回CIのIR有効幅違反を安全下限を緩めず修正（2026-10-26 JST）

- [初回B198G CI #40308251441](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40308251441) の短時間ジョブはFAIL。R178/180/181の既存回帰はPASS、R182 4件中2件PASS・2件FAIL。現場ログの理由は `R182_ROOM_SECTION_SECTION_OUT_OF_BOUNDS`。
- 原因：合成店舗ケースの北別棟は幅10セル（x=21..30）だが、`insetX=2` 指定により上部実室幅が10-2*2=6セルとなり、新R182の**最小7セル**保護に違反。設計IRの制限は正しく動いている。エンジンの境界値・家具/経路/安全ゲートは**一切緩めない**。
- 修正：合成店舗の北別棟のみ `insetX=1` にし有効幅8を明示する。追加負例として、同じ幅10のケースで`insetX=2`を与えたら必ず`SECTION_OUT_OF_BOUNDS`を投げることをテスト。モデルのサイズ意図を無断修正する実装は足さない。
- R182-AのCIがSUCCESSになるまでは合格を宣言しない。成果物・美術判定未確認、ART HOLD、NOT_PREPARED、9 BLOCKED、BuildPlan.operations=[]、worldWrites/Contacts=0、実LLM0、Minecraft施工禁止、Draft #128継続。

## R182 — 室の用途と屋根断面の因果関係をもつ本物のB143建築実験（2026-10-26 JST）

- 出発点R181-A HEAD `90f7ad3`、[公式CI #40305235245](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40305235245) **SUCCESS**。R181テスト4/4、R180 3/3、R178 4/4、original-source-geometry 成功。R181の実3Dでは主棟＋離れ2棟の配置は前進したものの、正面では単純な箱が並ぶだけで **ART HOLD**。
- R182は箱の位置や棟数をもう一度変えるのではなく、**明示された部屋IDと実際の屋根断面を結びつける追加IR** `minecraftaibuilder-r182-room-led-section-v1` を新規opt-inで導入。3棟それぞれに `volumeId,raisedRoomId,highSide,breakZ,rise,insetX` を要求。二室主棟では本当に当該室側の天井を高くする必要がある。屋根段差、左右低層テラス、四面の高窓帯を**コンパイル後のボクセルで確認**。R181の4室、家具4件、中庭、2接続廊下は設計入力と幾何を継承。用途名に依存して仕上げや寸法を決めない。
- R181の旧 `form.roofProfile` と二重になるため、`roofSections.supersedesLegacyRoofProfile=true` を**明示要求**し、屋根ソースを置き換える。無言でユーザーの屋根意図を上書きしない。実B143新旧の低層部の既存座標・素材は保護し、B143再コンパイル、R125で全室＋家具のサービス動線と入口→中庭の2幅ソース経路を検証する。出力は常時施工禁止のsource-only。
- 静的合成3用途を同じR181敷地・室・家具・関係のままR182断面だけ変更して比較する。**各3用途の新旧実回転3D×6、5方向投影×30、QA JSON**をB198G独立artifactへ保存する。屋根の実ボクセル検証、元の安全状態・コーナー意図を保持し、未知の模型回答を成功と偽らない。美術判断は3Dを見てから行い、CI PASSと混同しない。
- 限界：32×32・主棟＋2離れ・4室・2接続の固定pilot上の「3棟屋根断面」研究。現実の構造解析・雨仕舞い・階段・ゲーム内歩行・実Qwen/Gemma発案・任意形態・本格的な空間構成には未対応。ART HOLDを保持し、単純な箱が縦方向に増えただけなら不合格とする。
- **R182 CIは結果確認前に成功と記載しない。** 安全はART HOLD、NOT_PREPARED、9×BLOCKED、BuildPlan.operations=[]、constructionApproved=false、executionAllowed=false、worldWrites=worldContacts=0、Draft #128、main保護、原本保持。57ワークフロー/コミット問題は未解決。変更をなるべく1コミットに集約。

## R181-A — CI失敗の修正と実ボクセル実体証明（2026-10-26 JST）

- 初回R181 HEAD `37e06cb` の [品質CI #40303139202](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40303139202) は **FAIL**。original-source-geometryはPASS、既存R178 4/4・R180 3/3はPASS、R181の3テスト中1PASS/2FAIL。原因は第3（研究施設）合成ケースの南離れx=18が主棟幅12に対し `GALLERY_SPAN` の最低間隔6を満たさず距離5だったこと。
- **境界条件を緩和せず**合成研究施設の南離れx=19へ修正。これにより宣言されたモデル入力と実接続廊下幅を守る。住宅・店舗ケースと全既存Qwen原本は未変更。
- 追加のsourceQAとして、3つの明示ボリュームそれぞれの床・屋根・4外壁の内寄りサンプルセルが**実B143コンパイル後のボクセル**に存在することを検証。名前や`volumesInPhysicalB143:3`固定値だけを根拠としない。
- 負例：2本の接続廊下の離れ側実ドアCUTをB143ソースから取り除き、再コンパイルしてR125既存の2幅グラフで離れ2室が本当に`UNREACHABLE_ZONE`になることを確認するテスト追加。ホストが部屋の接続を証拠なしに宣言しない。
- **この修正のCI合格は結果確認まで未確定**。Qwen/Gemma推論0、実ゲーム内移動なし、美術判定はART HOLD、NOT_PREPARED/9 BLOCKED/BuildPlan空/worldWrites=worldContacts=0、Draft #128・main保護を維持。

## R181 — 3独立ボリュームと意味的な建築接続グラフ（2026-10-26 JST）

- R180はHEAD `bfeabce`、B198G品質CI [#40301254962](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40301254962) **SUCCESS**。3用途の本物のB143合成図・回転モデルは生成したが、左右の直方体2本が見た目を支配するため美術は**ART HOLD / 未達**。
- R181では既存R178/R180を破壊せず、**新規独立研究ルート** `source/ai/r181-courtyard-graph.mjs` と `minecraftaibuilder-r181-courtyard-graph-ir-v1` を追加する。3つの明示ボリューム `{id,roomIds,rect,roofY}`、主棟（前後2室）と離れた2つのサテライト（各1室）、モデル指定接続2本 `{from,to,z}`、室内直接隣接1組のみをモデル設計意図として厳格に受理。指定されない直接ドアや棟の移動をホストが勝手に作らない。
- 実B143では独立した3建築塊の支持床・4外壁・屋根・採光、主棟内の直接扉、2本の屋根付き接続廊下、実開口、屋根のない中庭と2幅の屋外アクセス軸を施工でない**ソース幾何**として生成する。R125既存の入口から全4室＋中庭への2幅連続動線と家具4件/設備到達を保護し、160 B143要素・9 BLOCKED・原本保護を絶対に緩めない。
- 住宅/店舗/研究施設で3つの**人間作成の合成IR**を用い、同じ生成器が異なる寸法・3棟配置/屋根をB143へ変換するか独立比較。成功時は回転3D×3、5方向図×15、JSON監査を既存B198Gの別artifactとして保存。**実モデル推論0、Minecraft実歩行・施工0**。合成CI PASSとユーザーの美術PASSを混同しない。
- 限界：本研究は固定32×32敷地・主棟1＋離れ2・4室・限定したゾーニング・2接続のpilotであり、**任意の主要ボリューム数・方位・自由な建築形状に一般化したわけではない**。今後、3D現物を旧R180と同縮尺で厳しく評価し、箱を3つに分けただけならART HOLDを維持して方式そのものを再考する。用途固定テンプレート化を避ける。
- **R181 CI結果未確認**のうちは実装完成や合格を宣言しない。Draft PR #128、main未マージ、ART HOLD、NOT_PREPARED、9ゲートBLOCKED、BuildPlan.operations=[]、constructionApproved=false、executionAllowed=false、worldWrites=worldContacts=0。57ワークフロー/コミットの過剰起動は調査継続、関連ファイルを1コミットにまとめる。

## R180 — モデル明示による独立棟の幅・前後位置・奥行の研究（2026-10-26 JST）

- R179-A のB198G CI [#40299394181](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40299394181) **SUCCESS**。R178の未指定棟内ドア拒否と入口→屋外中庭の2幅ルート立証を安全条件を緩めず完了。
- 次工程R180は旧R178の構文・幾何・テストを残し、**新規opt-in IR** `minecraftaibuilder-r180-independent-massing-ir-v1` を追加。棟ごとの `wingExtents.west/east:{innerX,frontZ,rearZ}` をモデル入力として厳格に受理する。従来固定の前後外壁位置・幅・屋根・窓・入口・室内zゾーンを**実B143に反映**。無効寸法は勝手に補正せずHOLD。R180入力を実モデル生成と偽らない。
- 同じ3用途・同じ室/家具/直接ドア/屋根選択に対してR178固定配置とR180独立寸法を比較する合成3ケースを用意。計6件の回転可能B143 HTML、30方向実ボクセル図、正本QA JSONを既存B198G CIの**独立artifact**に保存する。安全ゲート・2幅動線・家具到達・中庭到達・160要素上限はすべて保持。
- 限界を明示：現在は依然2棟/4室、30〜32平面、z方向の棟のみ。任意棟数/方向・本物の都市水準の建築・実Qwen/Gemma未知用途・Minecraft実歩行・ユーザー美術PASSは**未実証**。R180は建築構成の自由度が実形状へ反映されるか検証するもの。複数の長方形を描いただけでART PASSとしない。
- この変更のGitHub CI実行確認までは**未合格**。旧原本とmainを保護し、Draft #128、ART HOLD、NOT_PREPARED、9 BLOCKED、BuildPlan.operations=[]、constructionApproved=false、executionAllowed=false、worldWrites=worldContacts=0。使用量効率のため関係差分を1コミットにまとめ、CI過剰起動の監査は継続。

## R179-A — R178実3D美術審査とモデル意図・屋外到達性修正（2026-10-26 JST）

- R178基点 `acdb47a`、B198G [CI #40297455088](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40297455088) は **SUCCESS**。合成3用途のB143・回転3D・15方向図は [artifact #12638279659](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40297455088/artifacts/12638279659)。
- 実測：住宅3,014 voxel / 50 elements、店舗2,856 / 54、研究施設3,623 / 58。各4室・家具4件・2棟内扉・入口から全室/全設備到達。**実LLM呼出0、Minecraft書込み0、ソースQAと美術合格は別**。
- 美術審査：正面・東西側面・屋根の実B143図を確認。どの用途も細長い平行な2つの箱が主で、住宅・店舗の屋根平面はほぼ同型。中庭と2棟形式は単一矩形より構造的な前進だが、**ART HOLD / 美術FAIL**。次の主工程はモデルが指定する任意主要ボリューム/配置/外部空間を実幾何へ反映する構成研究であり、飾り付けに戻らない。
- 発見した実装問題(1)：1棟分しか直接隣接をモデルが指定しなくても2棟内扉を作っていた。初期設計は各棟の前後室が直接接続することで初めてアクセス可能なので、**両棟の直接関係をモデルが明示した場合のみ受理し、その他はHOLD**。モデルが指定していないドアをホストが補わない。
- 発見した実装問題(2)：中庭の支持床はチェックしても入口からその床への経路は未検証。R125既存の厳密な2幅ソース動線グラフで、入口から中庭まで別途到達性を検証。橋-中庭ドア削除の負例を追加。
- 本修正のCIは結果確認まで**未合格**。実Qwen/Gemma未知用途、Minecraft実歩行、建築美術合格、一般化は未証明。 `ART HOLD` / `NOT_PREPARED` / 9`BLOCKED` / 空BuildPlan / worldWrites・worldContacts 0。Draft PR #128継続、main未マージ。

## R178 実バグ修正・CI進捗（2026-10-26 JST）

- Draft PR #128 / ブランチ `feature/b198zr1-protected-architectural-revision` を継続。mainへマージしない。
- R178初回CI #40294876940: R172 2/2、R177 2/2、original-source-geometry PASS、R178 0/3 FAIL。根本原因はハッシュ関数に計画オブジェクトを渡した `ERR_INVALID_ARG_TYPE`。
- R178 SHAを修正。raw JSON回答のSHAは元文字列からそのまま計算し、構造化計画だけ再帰的キー順正規化後にSHAを計算。返答の原文を改変せず、家具・動線・9ゲート検証を緩めない。
- SHA修正のCI #40297083233: original-source-geometry SUCCESS。R178の「2棟・無屋根中庭・直接開口」および「3用途の3D＋15投影図出力」テストはPASS、3本中残る1本は新規テストが `planSha256` と `originalPlanSha256` を取り違えた**テスト参照ミス**。今回この参照を修正。後続CI確認前に全合格と記載しない。
- 3用途は**合成モデル応答**であり、実Qwen/Gemma生成結果ではない。3D投影の**人間による美術判定は未実施**。2棟が建築美術的に十分とは言えず、`ART HOLD`。
- `NOT_PREPARED`、9ゲート `BLOCKED`、空の `BuildPlan.operations`、`constructionApproved=false`、`executionAllowed=false`、`worldWrites=0`、`worldContacts=0` を維持。Minecraft施工なし。
- CI #40297083233 はこの2ファイル変更だけでも57件のWorkflowを発火。重要安全テストを維持しつつ、R178の品質確定後に重複起動条件を監査する。

# MinecraftAIBuilder — 最短AI再開入口

## R178: 4室グリッドから独立した「2棟＋屋外中庭＋接続通路」の実体積研究（2026-10-26）
- R177の最新成功はHEAD `682228e`、B198G #40292705887（合成3用途）。R177は指示された切欠を正確にB143へ変換したが、実外観はR176と一致した。これ以上コーナーだけを変える改修を繰り返さない。
- `source/ai/r178-wing-courtyard.mjs` はR139/R168の固定2×2グリッドを使わず、**独立した左右2棟、完全な実屋根と外壁、各棟の前後2室、2つの本物の内部直接ドア、屋根付き渡り廊下、屋根の無い中庭、接続可能な屋外歩行床**をソースから構成する。古いR168・R170・R177実装は触らない。
- IR `minecraftaibuilder-r178-wing-court-ir-v1` は`westWing/eastWing`の室ID順序、`roofYs`西・東、`bridge`前後を入力として受け取る。部屋名や用途名に依存したテンプレート分岐なし。元LLMの`directAdjacencies`が物理的に隣接する棟内2室の実壁と一致しなければ**拒否して停止**し、橋越しの接続を「直接ドア」と偽らない。原屋根ファミリー`flat/ridge/sawtooth`も実B143屋根に反映する。
- R125の既存**家具アセンブリ＋全室・全設備の2幅ソース動線**の検証をそのまま利用。B143 `compileDesign/verifyCompiled`、実ボクセルの吹き抜け確認、実入口、敷設された屋外歩行路、9 BLOCKED、空BuildPlan、worldWrites/worldContacts 0、NOT_PREPARED。Minecraft施工や実歩行は未承認・未検証。
- 初期サポートは32付近×32付近、4室、東西2棟。**任意の棟数・中庭形態・敷地サイズ・階層まで自由化した汎用建築ではない**。今後はこの独立した幾何生成器を軸に一般化する。R178入力とモデル回答の真正性は`CALLER_PROVIDED_UNVERIFIED`。CI住宅・店舗・研究施設の3件は**完全合成**であり新規Qwen/Gemma呼出0。
- CIは既存B198Gクイックジョブ内へ追加テスト＋3用途実B143回転3D×3、5方向SVG×15、および独立した監査JSONをartifact`R178-INDEPENDENT-THREE-USE-WING-COURT-3D`へ保存。元のR172の従来比較成果を維持、同じ成果物を上書きしない。
- 效率面：一度の関連ファイル一括コミットと既存CIを再利用。1コミットで約59ワークフローが走る不要起動問題は未解消。無関係なワークフローを消去せず、今後は大規模追加の前にCIトリガー整理を優先。ユーザーのPowerShell/ZIP往復は求めない。
- **新HEADの実CIで成功を確認するまでは合格とは言わない**。美術判定はART HOLD。


## R177: モデル応答IRによる明示的な地上輪郭設計（2026-10-26）
- R176は `47413ee` でB198G品質CI成功、真正B143で住宅・店舗・研究施設の角地上床25/25/9セルを除去して3D＋投影図を保存。**合成fixture**、追加Qwen/Gemma推論なし、美術ART HOLD。
- R177ではユーザー/将来のLLMが同一回答の`architecture`内で `minecraftaibuilder-r177-ground-outline-ir-v1` を指定可能にした。従来R160の5フィールド＋`groundShape:{kind:"open-corner-court",corner,spanX,spanZ}`のみを厳格受理。`corner`は前後×東西4角、`spanX/spanZ`は**それぞれ独立した3〜6セル**。旧R160入力もそのまま通る。
- `allowModelGroundShapeResearch:true` への明示opt-inでのみ接続。さらにR168研究グリッド・R175立体・R176地上輪郭の安全経路も同時に明示が必要。選択した角・寸法を実際の地上階床/外壁/屋根ボクセルへ反映。**指定が既存の家具・入口・動線に抵触する場合はHOLDし、別の角/サイズへ自動すり替えしない**。元回答の文字列とSHA/役割を保護。
- R176 HOST提案ルートは変更せず。R177は`CALLER_PROVIDED_UNVERIFIED`として、ローカルQwen/Gemmaが実際にその指定を生成したとは断定しない。R177 CIの3用途も人間が用意した**合成回答**。実モデルの新規推論0、Minecraft書込み0。ART HOLD、NOT_PREPARED、9 BLOCKED、BuildPlan.operations=[]、世界接触0、Draft PR #128、main保護を維持。
- 従来4案＋R177の3用途×5形状（15回転3D／75方向図）をB198G自動成果物に統合。コーナーと縦横の一致、室・家具の2幅動線、全体160 B143要素、実床の減少、無関係なボクセル不変、安全ゲートを検証。**実際の任意多角形平面や本格的な複数棟設計は未対応**。今後は主棟同士の位置関係・中庭・複合プログラムを直接表現するIRへ進む。
- CI過多：ワークフロー139件、従来1コミットで約59件が発火する問題を確認。今回は関連ファイルを1コミットに統合、既存B198G quick CIで必要なテストを済ませる。無関係なワークフロー一括削除は禁止。ユーザーの手動PowerShell/ZIP提出は求めない。
- **R177のCI結果は実際の完了まで成功としない。**


## R176地上階平面輪郭の最初の実変形（2026-10-26）
- R175 HEAD `743b8b8` のB198G品質CI #40284905726は **2/2 jobs success**。ただしR170/R173/R175の3用途×3案は**合成入力**のB143ソース成功であり、新規実Qwen回答や人間美術PASSではない。
- R176は**過去の失敗（4室グリッド・箱型の不変）への限定的な改善研究**。`allowHostGroundFootprintResearch:true` の明示オプションでのみ、元R175の4室・安全ゲートを保持し、物理ボクセルの地上階外角を最大6×6の範囲で実CUT。旧屋根・ファサードもCUTし、2つの折り返し外壁を真正B143で作成する。地面床Y1が実際に消えたこと（9セル以上）と、全変更が選択コーナー＋折返し壁の範囲に収まることを実監査。
- 外角候補はモデル由来の**室ウェイト**と実室位置、入口、既存家具・ドアの位置から選び、2幅ソース動線・設備到達を全て検査。候補が成立しなければ **HOLD**。用途名で固定分岐しない。ただし **HOST_DERIVED_NOT_MODEL_SELECTED**、4室の矩形 bounding range と実際の自由設計の多角形グラフは未実装で、任意の複雑な輪郭をLLMが指定できると偽ってはいけない。
- R170/R173/R175/R176の合成3用途×4案を既存のB198G CIへ統合（計12回転3D、60枚の5方向実ボクセルSVG）。元3案は変更しない。結果を見て本当に箱感が緩和したか判断、変化が小さければ追加の細部調整に固執しない。
- 原本・main・Draft PR #128、ART HOLD、NOT_PREPARED、9 BLOCKED、BuildPlan.operations=[]、worldWrites=0、worldContacts=0を維持。毎工程PowerShell/ZIP禁止。追加Qwen推論0。**R176の実CIは成功確認前にPASSと表現しない。**
- 効率面：139件のworkflow ymlがあり、R175 1コミットでも59ワークフローが起動した。全workflowを乱暴に無効化せず、関連修正を一括コミット、既存B198Gの統合ジョブを利用する。無関係CIの整理は継続課題。


## R174品質CI回復 → R175上部セットバック形態研究（2026-10-26）
- R174 commit `e7beeba` の [B198G品質CI #40282603993](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/40282603993) は2/2ジョブSUCCESS。合成3用途の真正B143ソース・R170/R173 6個の回転3D＋30方向比較図が生成された。これは**静的合成入力**であり新たな実Qwen推論ではない。
- 実画像審査は住宅と店舗の箱型外観がほぼ同じという問題を再確認。ART HOLD、実Minecraft内歩行は未実施。次工程は本来の平面と体積配置の自由度向上。
- R175は独立したオプトインの **HOST研究案** `R175_SETBACK_TERRACES`。重み順上位2室の外部上壁・屋根の一部を真正B143でCUTし、下げた屋根面と屋内側の高い実壁を形成する。上階の屋根面の占有範囲を物理的に変更するが、地上階の外周輪郭は変えない。ホスト側で決めたデッキ形状をLLM発案と偽らない。
- 4室・設備・玄関とy<=5実ボクセルを維持し、全室/機器のソース動線、各室最低1高窓、160要素上限、屋根実形状、NOT_PREPARED、9 BLOCKED、空BuildPlan、worldWrites0を確認する。R170/R173/R175の合成3用途×3案（9回転3D・45枚の5方向図）を既存のR172 Actions artifactへ集約し、旧案の証拠は上書きしない。
- 大きな失敗の反省：これで「自由な平面の汎用エンジン」が成立したとは主張しない。次はユーザーの建築用途/設計から主棟平面輪郭が変わる仕組みを設計する。毎工程のユーザーPowerShell/ZIPを再要求しない。
- R174では1コミットで約59の既存ワークフローが発火。不要なトリガーとCI資源の整理を今後のまとまった効率化工程として扱う。**R175の実CIが完了するまではPASSではない。**


## R173 4室高低差・高窓の本物の建築形状 / 自動A-B比較（2026-10-26）
- R172自動レビューをGitHub `B198G` の独立 `r172-quick-three-use-review` ジョブへ導入。直近HEADのワークフローはまだ `queued` で成功/実3D視覚合格は未確認。ユーザーに毎工程のローカルPowerShellやZIP添付は要求しない。
- R173は従来R170低い段差屋根を維持したうえで **opt-in host-only** `R173_SCULPTED_CLERESTORY` を追加。部屋別に屋根Yを実体を伴って9/10/12/14へ大きく変化させ、ローカルB143描画範囲を18に広げる。住宅/店舗/研究カテゴリでは分岐しない（4室の重みでソート）。モデルの指定屋根形式は引継ぐが、具体的な高低差はホスト研究案でありモデル自身の設計と偽らない。
- **実3D高窓**：y>=6の外周上壁をソースでCUTし、同じ位置に本物の `glass` ボクセルを追加。屋根・外壁は原案に材質を合わせる。旧玄関・壁・ドア・家具のy<=5ボクセルを厳密一致チェックし、4室・全設備の2幅ソース到達性を保護。建物上端の高低差と高窓は装飾ラベルや画像生成で偽装しない。
- R172 CI自動比較は各用途について **R170従来案 vs R173高低差+高窓案** のB143回転3Dを2個ずつ（計6）と、真正ボクセルの5方向を各2候補（計30SVG）を自動生成する。最大実体Y、上部glassセル数、元の低層構造、実ソース動線を厳密監査し `R172-CI-THREE-USE-SOURCE-3D` artifactに保存。GitHub CI fixtureは**静的な合成入力**であり、ユーザーの本物のQwen回答ではない。
- 既知リスク：箱型外観はまだ本質的に解消したと未確認。高度差・高窓のみで美術PASSにはならない。今後は、外形輪郭、内部での明るさ・設備と空間の相性、実用途の独立設計をさらに改善すべき。CIランナー待機中は成功を主張しない。
- 施工は常時 `NOT_PREPARED`、9×BLOCKED、BuildPlan空、worldWrites=0。次回ユーザー操作は不要。

## R171真正3用途3D PASS → R172 手動工程削減（2026-10-26）
- ユーザーアップロードの `r157-unknown-use-20261025T125222536Z-r171-room-volumes-offline.zip` を実検査。住宅2061、店舗2129、研究施設2598ボクセルのB143 3Dが3/3生成。4室の実際の屋根Y: 住宅10/9/8/8、店舗10/9/8/8、研究施設9/9/8/8。新Qwen呼出0、世界書込0。天井は実空間だが、美術はART HOLD。24×24の画一外形は依然未達。
- **効率改善の新方針**：これ以降は GitHub へ開発コミットしただけで、既存のB198G Actions内の独立 `r172-quick-three-use-review` CIが3用途の**合成fixture**から実B143・全室/家具アクセス・高天井・5方向画像・回転3Dを自動生成・回帰検査して `R172-CI-THREE-USE-SOURCE-3D` artifactを出す。毎工程のユーザーPowerShell→ZIP→添付は**要求しない**。Actionsの表示結果から開発者側が継続する。
- R172は公開可能な静的合成入力のCIであり、新規実Qwen/Gemma推論やユーザー保存済み実回答の再実験ではない。**合成QAを真正LLM検証と偽らない**。R171真正実験の成果と出所を別々に管理する。
- ユーザー作業を依頼するのは(1)新しい実ローカルモデルでの独立汎化確認、(2)大規模な設計エンジン変更後のまとまった節目、(3)実Minecraft歩行・人間美術評価を必要とする場合のみ。小規模修正・ユニットテスト・ソース上の建築形状・画像比較はGitHubと現在あるデータで継続する。
- 原文の秘密やプライベートなQwen回答を自動的にpublic GitHubへアップロードしない。ローカル常駐監視・自動モデルGPU呼び出し・Minecraft書込みは勝手に設定しない。ART HOLD / NOT_PREPARED / 9 BLOCKED / BuildPlan.operations=[] を永続維持。
- CIについては成功/失敗/待機を別々に扱い、プレビューの公開だけで美術PASSを宣言しない。


## R170実ユーザーZIP検証 → R171共通屋根境界修正（2026-10-26）
- ユーザー提出 `r157-unknown-use-20261025T125222536Z-r170-room-volumes-offline.zip` に収録された `R167_OFFLINE_REPLAY.json` を検査。住宅・店舗・研究施設すべて `R170_FOUR_ROOM_ORIGINAL_ROOF_CONTRACT` でHOLD。生成 `geometryEvidenceCases=0`、実ボクセルと5方向図はZIPに無し。R169の3/3成功が消滅したのではなく、R170の研究用派生だけが共通契約エラーで停止。元Qwen原文、施工保護、世界書込み0、推論追加0を維持。
- 原因: R170はR149→R150で `plan` を持たない派生 `featured-source` から `base.plan.form.roofProfile` を読み、検証条件がすべてfalseになっていた。R149が正式に保存する `r149ExpressionEvidence.originalRoofProfile`（元モデル指定屋根形式）を読み、`roof-base` の高さ・大きさも明示検証するよう修正。
- 再発防止: R170の既存flat/ridge/sawtooth 3形態の合成実3D回帰テストで、R149の屋根由来証拠を明示的に検証。CIと実ユーザー実データでの再実行は**未確認**であり、形状実現・美術水準を合格とは主張しない。
- Windows保存済み実験ワンクリック経路は前回の失敗ZIPを上書きせず、別フォルダと `R171_VOLUME_EVIDENCE_ZIP` を生成。新しいLLMコール禁止の `-ReuseOnly` を維持。次回は3用途のR171実3D・各実際の室内高さ・経路・屋根の5方向図を確認する。
- 常時 **ART HOLD / NOT_PREPARED / 9 BLOCKED / BuildPlan.operations=[] / worldWrites=0**。Draft PR #128はDraft、mainへmergeなし。

## R169実モデル3/3ソース生成 → R170 本物の4室立体構成（2026-10-26）
- 受領ユーザーZIP `r157-unknown-use-20261025T125222536Z-r169-safe-furniture-offline.zip`: 保存済み `qwen3:14b` 3ケース全て真正のローカル回答由来+ホスト補正研究で実B143 sourceVerified=true。住宅1,697ボクセル・店舗1,765・研究2,731。新LLM呼び出し0、世界接続0、施工0、ART HOLD、NOT_PREPARED、9 BLOCKED、BuildPlan空。
- 研究施設は選択された4室/8設備を維持。R150補助形状10候補中9採用、`collaboration-table` の `undershelf` 1件を2幅ソース動線／設備アクセス遮断のため拒否し、理由付きで記録。既存の元モデル回答と研究用派生原本は保護。
- 詳細なボクセル高さ分布によれば住宅・店舗はほぼ`y=6`平坦一体屋根、研究は旧棟屋根。3用途とも24×24外郭で、3D成立が美術水準を意味しない。**箱型の画一的外観が次の主障害**。
- R170は汎用ホスト研究オプションで**部屋範囲とモデルの相対用途ウェイトから、4室の本当に高い室内空気領域・境界壁・段差屋根を生成**する。屋根のflat/ridge/sawtooth分類は元モデルの選択を引き継ぐが、高さの数値はモデル由来ではないと記録。既存の建築・ドア・家具に相当するy<=5の実ボクセルは厳密照合して変更禁止。各室30セル以上の高さ方向新規空間、全室・全機器のソースアクセスを試験、未成立はHOLD。
- 通常のR139/R160生成経路と既存の3室用R162/R163は変更せず、`allowHostVolumeResearch:true` と明示した研究用のみ派生。R170の証拠ZIPは旧原本とは別の `R170_VOLUME_EVIDENCE_ZIP`。モデル呼出0、世界書込0。
- 既存B198G CIのR170実3D合成テスト（flat/ridge/sawtooth）結果と**実ユーザー3ケースのR170 ZIP**はまだ未確認。見た目/外観評価にART PASSを付けず、今後はさらに外形の立体配置と差別化を審査する。

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
