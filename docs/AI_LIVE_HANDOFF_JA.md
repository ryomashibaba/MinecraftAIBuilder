# MinecraftAIBuilder — 新チャット用LIVE HANDOFF（2026-10-31 JST）

> 初回施工の継続: MakeCodeの敷地確認・施工・照合中に別チャットで原点変更や重複施工が起きないようbusyガードを追加。公式資料で座標加算とKeepを確認したが、Education内でのコンパイル・API動作・実施工は未確認。MCP接続確認は `fetch failed`。専用試験ワールドの特定、バックアップ、範囲と権限の確認を済ませてから初回施工する。合成家屋はAI設計ではない。

> 実機追記: Education v26.33で既存 `minecraftaibuildertest` を確認し、アプリのコピー機能で `minecraftaibuildertest のコピー` を作成して開いた。元ワールドは残存。コピー内にも既存建築あり、施工範囲未確認。Code Builderで新規プロジェクトを作成したが「新しいプロジェクトを作成しています…」から進まず、閉じて開き直しても同状態。コード貼付・コンパイル・施工は未実施。コピー側で空き地と権限を確かめ、MakeCodeを復旧してから継続する。

> **最新方針：Minecraft Education内に自由な希望建築を簡易でも実際に作るMVPを最優先。** 美術改善を一時後回しにし、モデル自由入力→短いArchitecturePlan→既存BN/B143ボクセル→ゲームへの安全な施工を最短で接続する。最初のBridgeとして `source/ai/r125-education-makecode-export.mjs`（厳格にSHA検証済みB143 sceneをcuboidへ圧縮し、MakeCode Static TypeScript生成）と`scripts/r125-export-education-pilot.mjs`（--design / --compact --brief → 出力ディレクトリ）を新規追加。**これはゲーム自動接続ではない**。出力プログラムはコピー済み平坦試験ワールドのMakeCodeに手動貼付、mabset→mabbuild明示実行で初めてWorldWrite。エリア全AIR事前検査・支持地面の有無・Keepのみで既存セルを置換せず、mabverifyで配置一致を点検。ワールドID・バックアップ・教育版でのコンパイル・実動作はまだ未検証。正式なゲーム内施工成功は**0件**。元ソースBuildPlanは空/9 BLOCKED/ART HOLD維持、原モデル回答とmainを触らない。実ワールド書込み許可はユーザー操作と別の確実な技術的事前確認後だけ。

> **必読。** この文書は過去の長いChatGPT会話を丸ごと再読込しないためのGitHub上の軽量な正本。**新チャットでは最初にDraft PR #128の現在HEAD・変更差分・専用CIの結果を再確認**する。以下のコミットとCI状況は作成時点のスナップショット。勝手に次工程の成功を仮定しない。

## 0. プロジェクト識別・現在のGitHub
- Repo: `ryomashibaba/MinecraftAIBuilder`
- 継続branch: `feature/b198zr1-protected-architectural-revision`
- Draft PR: `https://github.com/ryomashibaba/MinecraftAIBuilder/pull/128`。**Open/Draft、未merge**。
- この更新の親HEAD: `f7dfc893f1ff547663a7739541271248b165024d`。PR #128最新HEADを毎回確認する。
- 基幹引き継ぎ: `docs/AI_RESTART_JA.md`。最新CD詳細: `docs/R190CD_INDEPENDENT_INTEGRATED_GATE_JA.md`。ARTの負例根拠: `docs/R190CC_FIRST_ART_FUNCTION_AUDIT_JA.md`。
- 初回CD検証 [Actions #41078728011](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41078728011) は**Windows/Ubuntu両SUCCESS**。
- 旧CD専用CI [#41079427106](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41079427106)、[#41079857037](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41079857037)、[#41080022312](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41080022312)、[#41081372238](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41081372238)、密閉入口修正版 [#41082309335](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41082309335) は**全て完了SUCCESS**（それぞれ異なる旧HEAD）。BO保存レシート接続CI [#41128531573](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41128531573) もWindows/Ubuntu **SUCCESS**。今回の派生証拠独立照合CIは未検証であり、既存成功で代用禁止。
- 専用CI成功を「全体CIすべて成功」「モデルが実設計成功」「完成建築」と言い換えない。並行する別系統の失敗CIも安易に同一の原因とはみなさない。

## 1. 最上位の目的
未知の**自由な日本語建築依頼**から、AI自身が用地・用途・室構成・動線・立体主殻・開口・材料を創造的に設計し、**美しく、個性的で、実際に使える真正3D建築**を作る。ソースを変更せず検証し、必要な安全審査と人間の個別承認を経たときだけMinecraft Educationに正確に施工・検査・報告できる総合AI Builderを目指す。

**最優先は建築の魅力とユーザー依頼への忠実性。** 技術検査数や見せかけのPASS、単に巨大・複雑・装飾豊富な構造物では代替しない。固定された建物カテゴリ・用途テンプレート・単純なBOXの自動反復でモデル自由設計を偽装しない。作者の形状をホストが勝手に補修して高得点にするのも不可。

従来の目的は完全に破棄せず、Bridge/Minecraft実機施工技術とLegacy/Productionの安全基盤を将来利用する。ただし現行B143/R190研究段階は**Minecraft施工禁止**。

## 2. 不変契約・失敗時ルール（最優先）
- `main`変更・merge・force push禁止。Draft PR #128と正規branchを継続。勝手な新規リポジトリ作成、成果物ZIPの都度手動受渡し、旧証拠の上書き禁止。
- BMを含む実モデル原回答、HTTP原本、`INVENTORY`、`USER_BRIEF`、BY/BZ/CA/CB/CCの原本・保存ハッシュ、過去成功ビルド、既存Minecraft建物、FAILED journal、Production/Legacy設定、凍結QAを保護。
- 現在の施工境界: `NOT_PREPARED`、**9ゲート `BLOCKED`**、`BuildPlan.operations=[]`、`worldContacts=0`、`worldWrites=0`、正式ART採用0、constructionApproved=false、executionAllowed=false。
- 無承認Minecraft施工・削除・破壊・ブロック書換え禁止。かつて実機Build/Bridgeの技術実績があっても、**現行SOURCE案は施工権限を持たない**。
- 原ソース不一致・SHA不一致・タイムアウト・unknown・検査落ち・モデル出力切断は**HOLD/REJECT**とする。自動補修・暗黙の形状追加・JSON整形による原文改変・勝手な再送・成功偽装をしない。
- 新しい本物のローカルQwen/Gemma設計推論の正規経路は**R190-BO**。送信内容のexact request SHAと準備ごとのUUID nonceに結びつく**別途の個別人間承認**なしにOllama実POSTを実施しない。承認なしの場合は、既保存元回答のオフライン解析・合成検査を進める。旧BMの許可や別工程の一般的な「モデルを使ってよい」をBO新POSTの承認とみなさない。
- 手作りChatGPT研究SOURCE・SYNTHETIC_TEST_FIXTURE・真正のQwen/Gemma原回答・決定論的派生B143・実Minecraft成果を**出所ごとに厳格区別**。形状の真正voxelが出来てもAIの自由創造が実証されたことにはならない。
- 技術SOURCE、ART、人間の依頼適合、実空間・床・動線、構造、実ゲーム操作、Minecraft施工の**各判定を分離**。絵画的主観は実3Dと比較視点で厳しく審査し、CIの緑では美術PASSにしない。

## 3. ユーザーの開発運用の好み
- **Chat中心**。GitHubコネクタを用いて正本へ反映し、Windows/Ubuntu Actionsを実証。Workモードは明確な利点がありユーザーが承認した場合に限る。ユーザー操作・再貼付・ZIP往復・アカウント作成を最小化。外部への開発外注禁止。
- 細かい1テストごとに「次へ」と往復しない。**合理的にまとめられる複数工程は一度に実行**。ただし原本破壊・認証・施工など危険な操作はその境界で止める。
- 技術的に少し前進しても、建築が美しくない限り改善の核心を誇張しない。反省を次工程の構想に反映し、同じ失敗形状への小さな装飾を無限反復しない。
- 実際に確認していないCI・ダウンロード・画像・元回答を確認したと偽らない。GitHub最新HEADと指定CIを毎回読み、重要な失敗の原ログは保護。可能なら独立の負例・別言語検証を通す。
- 企画・設計・CI・美術・統合・次方針をまとめて実行するが、QAの合格数でなく**日本語依頼→美しく使えるAI建築→安全な施工までの距離**で進捗を見る。

## 4. 長期の発展と主要な反省
- 初期はMinecraft Education Bridge/WebSocket、`!ping`/`!testblock`、安全なブロック照合、Step7P/7Qなど実機検証基盤を進めた。以前のBuild Jobでtimeout後もブロック施工が起きた事例があり、施工の冪等性・jobId/進捗照合・world ID同一性・再施工禁止が重要。これらの凍結証拠と既存建物を変えない。
- B143は安全な決定論的建物DSL＋真正voxel/Viewer。設計力とは独立したSOURCE→形状と監査の基盤。単なる合成モデルや作者テストのCI合格を実LLM成功とは言えない。
- R190系の当初は意味解析、semantic、Spatial Assembly、B143変換を多段階で改善。型/命名/材料/階段/間取りの矛盾、箱型・鋸歯屋根・屋内支持不足が多発。モデルによる自由設計は未実証。既存モデル出力に寄せてホストが設計を決めすぎても根本目標を壊す。
- R190-BMで**本物のWindows Qwen3:14b**に都会の大型高層ビル依頼を各1回提示（A/B）。双方の元回答は保存されたが厳密B143受理**0/2**。元依頼SHA `bbd44cc9f28234055601b4055466e2f3564e7e4565d408432de4c4fab0aa277a`。原依頼は `evidence/r190bm/USER_BRIEF.txt` の**実bytesを正本とする**。チャット上で勝手に改行・句読点を変えない。
- R190-BN: モデル/作者が指定した高さ・用途・空間・階段等をHOSTが勝手に設計修正せずB143へ決定論的変換する研究。
- R190-BO/BR: 本物のQwen/Gemmaへローカル`/api/chat`のnative JSON Schemaで依頼を渡す**厳格事前準備・nonce承認・最大1POST・原文保存・切断HOLD**。BRでSchema全文重複とnative-onlyの2モードを設けたが、**新形式の実ローカルモデル成功は0／未実行**。`prepare`／`inspect`／`replay`は通信0。既存の元原回答を無修理で再検査できる。
- R190-BQ: 真B143最終voxelの支持床・空気・立脚Y・人間審査項目を独立測定。BM高層ビルの必要階数未達はHOLD、用途名の自己申告を合格にしない。
- R190-BV: 保守的な2×2支持床・頭上空気・±1段差の連続移動検査。実Minecraftプレイヤーや構造耐力の認証ではない。
- R190-BY: 大きな連続側壁が巨大空洞を塞いでART REJECT。
- R190-BZ: 自由パッチで巨大板・折紙状の断片集合となりART REJECT。SVG構文/東西の正投影軸の不具合を発見し、独立Pythonで最終voxelと10枚の投影を照合する運用へ。これ以降**表示の生成だけで正しいと判断しない**。
- R190-CA: 著者指定の内部体積＋床＋3D切除へ。真SOURCE A62,565/B45,568 voxel、技術限定PASS。外観は平行2塔／段状太塔でART REJECT。保守的な入口のない上階移動もREJECT。
- R190-CB: 建築に**作者指定267個／84ブロック上昇**の折り返し階段SOURCEを追加。最終46,829 voxel、Windows/Ubuntu CI技術限定PASS。B143 Viewerへの`worldCoordinates:null`欠落で初回失敗→既存の安全契約を緩めず修正。美術は水平帯の多角塔に戻りREJECT。作者ルートの「横2セル移動し高さ1上昇」は保守的通常経路や実Minecraft移動の証明ではない。
- R190-CC: 輪郭積層を廃し、回転超楕円体の真3D和・差集合。A68,921/B81,204 voxel、16実視点・10正投影・SHAが両OS技術限定PASS。しかしA/Bとも巨大な有機塊の寄せ集めでART REJECT、レストラン支持床＋3セル空気は**両案26/292=8.90%**、B上層オフィス17/264。FUNCTION REJECT。自由曲面を作れること≠美しい合理的建築を創造できること。
- R190-CD（現行）: **新たな作者建物の無限作成を停止**。モデル非依存のread-only品質ゲートにより、旧CC A/Bを不採用にできるか独立審査。外部入口の作者明示・境界からの水平3D空気連通・用途の実床+頭上空気・幅2保守的経路・作者階段の規則差・SHA・正式ART HOLDを分離。初回CIはWindows/Ubuntu SUCCESS。旧CCは作者指定入口0、上階実用性不足、CB式84上昇辺は保守的移動の条件外と確認。成功＝**失敗を正しく見抜いた**ことであり、建築の合格ではない。
- CD続き: `source/ai/r190cd-bn-adapter.mjs` が正規BO/BN/B143の元設計を**改変せず同じCD品質検査へ接続**。`scripts/r190cd-offline-raw-review.mjs` で保存済み元依頼＋原作者SOURCEから、モデル/世界通信0で厳格コンパイル→真正voxels→CD独立監査を1コマンド実行。無効原文はそのままHOLD、偽3D生成なし。追加の2つの実BN合成fixture（展示＋閲覧／横長コンコース）、SHA改変負例、Windows/Ubuntu CIは最終判定待ち。
- 注意：**B143のgeometrySHA = SHA256(JSON.stringify({design,primitives}))、CCのgeometrySHA = SHA256(JSON.stringify(primitives))**。混同・無理な統一禁止。CDでは各正規式を検証し、純voxel SHAは別に計測。水平床Y=0がBNで正規にあり、モデル指定purposeは最大250文字なので勝手に切らない。

## 5. 最新CDファイルと最初に行うこと
- `source/ai/r190cd-integrated-quality-gate.mjs`：モデル非依存の最終voxel品質測定（read-only）。
- `source/ai/r190cd-bn-adapter.mjs`：BN/B143原作者の元ルートを品質審査へ接続（飛行階段を勝手に経路ノードへしない）。
- `scripts/r190cd-review.mjs`：凍結CC不採用2案の負例再審査。
- `scripts/r190cd-integrated-quality.test.mjs`、`scripts/r190cd-bn.test.mjs`：独立の正・負制御。
- `scripts/r190cd-offline-raw-review.mjs`、`scripts/r190cd-offline-raw-review.test.mjs`：元依頼／保存原文1コマンドオフライン診断。使用形：`node scripts/r190cd-offline-raw-review.mjs --brief ORIGINAL_BRIEF.txt --original SAVED_ORIGINAL.json --out NEW_CD_REVIEW`。必ず新規フォルダ、入力無改変、モデル通信0。
- `scripts/r190cd-independent-verify.py`：別実装の真voxel空間・SHA・到達判定の監査。
- `.github/workflows/r190cd-integrated-gate.yml`：Windows/Ubuntu専用CI。
- **まずPR #128の現在HEADとCDの最新CIを確認**。queuedなら結果を待たず別branchへ逃げて成功と主張しない。失敗ならログを読んでCDの差分のみ修正し、同じテストを再実行、成功証拠を保管。初回CD両OS PASSを追加版全体の成功と混同しない。
- その後、BOの正規preflight・原文保存・将来の実Qwen/Gemma応答経路とCD品質監査の入出力を検証。**実モデルの1回POSTに必要な個別承認なしには本物の新推論を実施しない**。同意済のローカルLLM一般利用とBO送信nonceは別。
- 設計者が真の自由設計を行う実証に戻るには、承認済み新しい実モデル元回答と複数の異なる自由文を原本保持で比較し、最終真正3D・用途・美術・外部入口・経路を同じ基準で評価することが次の本質工程。未認証をPASSと言わない。

## 6. 新チャットへの移行と軽量化プロトコル（今後の固定運用）
- **引き継ぎの正本はこの短いGitHubファイル＋`docs/AI_RESTART_JA.md`＋実HEAD/CI**。過去チャットを全件・ログ全文・コード全文として繰り返し貼らない。必要な過去情報だけ指定ファイル／コミット／Actions artifactからピンポイント参照する。
- 1チャットはなるべく**一つの意味のある統合工程／数回の作業バッチ**で切る。遅さが出る前に次へ。引き継ぎは「現在HEAD／完成事項／失敗理由／未検証／次工程」だけ10行前後更新。古いログはGitHub URLへ。
- 通常の返答は**要点・真の変更・判定・HEAD・CI URL**に限定（例：最大数百字～必要に応じ長文）。大量のGitHub Actions生ログ、数千行コード、全diff、数十画像をチャットへ表示しない。直接GitHubへ保存し、必要な比較用画像1枚とリンクで伝える。
- ブランチとPRを増やさない。小修正は合理的に1つの原子的コミットへ、関連工程をバッチ実行。CIは本当に必要な専用テストを選択し、無駄な数十回のActions runや重複通知を控える。成果物はまずCI artifact／repo正本に保存。
- チャットがフリーズ・黒画面・クラッシュした場合は、最新GitHub HEADと保存済みhandoffから新しいチャットを開始すればよく、旧チャット復活や全文コピペを要求しない。
- 「キャッシュがたまる」は原因の確証ではない。長大な会話・大量の画像/ツール出力で画面負荷が増える可能性、ブラウザのサイトデータ・拡張・サービス障害の可能性を区別する。新チャットで改善するかをまず比べ、再現するなら公式の手順でリロード・拡張無効・必要に応じサイトデータ消去。Cookie消去でログアウトし得る。
- **このファイルは定期的に丸ごと肥大化させず、最新状態と主要原則を維持・置換する**。履歴の詳細は他のdocsとGitコミットが持つ。新チャットに旧チャット全文を流し込むことを禁止する。

## 7. 新チャットへの最短メッセージ
「MinecraftAIBuilderを継続してください。GitHub `ryomashibaba/MinecraftAIBuilder` の `docs/AI_LIVE_HANDOFF_JA.md` と `docs/AI_RESTART_JA.md`、Draft PR #128、現在HEADと最新専用CIを先に確認。過去方針・安全契約・失敗を守り、チャットを重くしないようコードやログはGitHub保存、回答は要点だけ。最新CDの未完了CIを確定し、BO/BN→CD品質ゲート接続を検証してから次の本質工程へ。新Qwen/Gemma POST・Minecraft施工は個別承認なしに行わない。合理的な複数工程をまとめて実行し、最後にこのLIVE HANDOFFを簡潔に更新する。」
