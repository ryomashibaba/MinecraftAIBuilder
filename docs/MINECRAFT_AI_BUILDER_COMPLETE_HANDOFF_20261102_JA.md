# MinecraftAIBuilder — 完全統合引き継ぎ（2026-11-02 JST）

この文書は新しいチャット、別AI開発者への**実務上の全体方針・重要経緯・失敗・次工程**の一括引き継ぎ。歴史の一言一句は [AI_RESTART_JA.md](AI_RESTART_JA.md)・過去のGit commit・各研究記録に保全する。過去の暫定案は最新の固定憲章/戦略に優先しない。まず [ルートSTART_HERE](../START_HERE.md) を入口とする。

## A. 最終目標と不変の優先順位

1. **建築として本当に使えること**：未知の依頼から個性・美術・用途/機能・内部空間・入口・窓・床・屋根・上下動線を一体設計し、ゲーム内で使える建物を実現。目標は独創的な汎用建築AI。建物名ラベルを貼り替えた規格箱・箱の表面装飾・見かけの空間は完成ではない。
2. **最短の実動作を先行**：日本語指示 → 実ローカルQwen/Gemma → 短いAI建築意味計画（ArchitecturePlan/R190等、形式は目的に従う） → 既存B143実ボクセル → 独立検証 → Minecraft Education用の安全なMakeCode等の施工橋 → バックアップ済み専用試験ワールドで実行 → 人が建物に入って確かめる。大規模な理論研究とテスト数の増加は上の経路を進める場合だけ正当化。
3. **モデルが設計し、共通エンジンが精密に実装する**：LLMに大量のMinecraft座標や巨大B143 JSONを毎回書かせない。用途・部屋の関係・プロポーション・屋根と断面・開口・素材/意匠方針など創造的な決定はLLM。幾何・支持・扉・階段・ボクセルの厳密性は汎用コンパイラ。見た目の変化をHOSTが選んだときはMODELの功績に算入しない。
4. **3用途で実証**：小型二階建て住宅、入口のある店、小研究施設。用途ごとに異なる機能構成・形状・動線が実質的に違うかを見る。固定のB198Bベンチマーク12建築+4改修は凍結比較用。
5. **小型モデルを先送りにしない**：将来の8GB級Apple Silicon Mac + 2B級4bitを基本モード設計目標。16GB+4B級比較、大型Qwen/Gemmaは高度比較。Mac実機のメモリ・推論時間・成功率は現段階では未実測であり誇張しない。
6. **ART-FIRSTかつ機能的**：美術は人による複数視点の真正3D判定。単なる「建築としてありそう」だけでは不十分だが、奇抜さ・装飾量も合否条件ではない。入口、支持床、部屋、階段、動線に裏付けのない迫力を無理に追わない。

**順序の趣旨：** 品質目標を放棄するという意味ではなく、現物を一棟完成させて課題を測れる最短の経路を先に通し、同じ実装を他用途へ伸ばす。

## B. 厳格な安全/開発運用

- 正本 `ryomashibaba/MinecraftAIBuilder`。研究ブランチ `feature/b198zr1-protected-architectural-revision` を更新し、Draft PR [#128](https://github.com/ryomashibaba/MinecraftAIBuilder/pull/128) は **Open/Draft/Unmerged** 継続。**main変更/マージ、Ready化、Close、force push、凍結済みB143/Qwen/旧B99/B100原本・失敗証拠の上書きは禁止**。適切な通常コミット/通常pushのみ。
- 2026-10-24の包括許可：ローカルQwen/Gemma推論と、バックアップされた識別可能な**Minecraft Education隔離試験ワールド**への安全な試験施工は毎回の承認を求めず実施してよい。ただし世界ID・アンカー・敷地境界・ブロック材対応・バックアップ/復元・バッチ/中断・元の建築保護・建物の最低限の空間/動線QAの技術ゲートを満たさなければ実際には書かない。包括許可と施工技術準備は別。
- **原則フェイルクローズ**：`readiness:'NOT_PREPARED'`、`constructionApproved:false`、`executionAllowed:false`、9×`BLOCKED`、`BuildPlan.operations=[]`、`worldContacts=0`、`worldWrites=0`。真正B143コンパイラのデザイン用ゲートを偽って解除しない。安全に施工する場合は**別のworld adapter**のゲートとログを厳密に用いる。
- 2026-11-02にユーザーは**帰宅してWindows PCの操作が可能**と報告。以前の「外出中でローカル操作不可」の制約は解除。**ChatにはユーザーPCを自動操作する権限/経路が生じたわけではない。** 手元で必要なPowerShell操作があれば、事前に目的・読み取り/書込み範囲を説明し、少ない回数のコピペ一括手順にする。Work/Computer UseでユーザーPCを直接操作する際は別の明示承認が必要。有料API・課金変更・他人の環境アクセスも別許可。
- 非公開のユーザーQwen応答、ローカルログ、個人データはGitHub publicに出さない。公開済みと確認された `scripts/fixtures/r125-qwen14b-residential-2024a.json` は再生用として利用できる。新しい生の元回答は原文・SHA・失敗含めローカルに安全保存、公開前に確認。
- Chat中心、GitHubコネクタで実装・テスト・証拠を保存。毎工程Work切替、同じZIPの往復、再認証、長い引き継ぎ再投稿を要求しない。小さくても実際の機能改善・実証があるコード差分をまとめてコミットする。

## C. 必須の合格ラベル（絶対に混同しない）

| 独立ゲート | 言えること | 言えないこと |
|---|---|---|
| **A SOURCE/CI** | スキーマ、再現性、B143最終ボクセルと検証器のテスト | 建築全体の美術・Minecraft実物合格 |
| **B 真正3D/機能SOURCE** | 形状/支持床/空間/入口/階段/2幅ルートなどの計算上の候補 | 衝突/移動/歩行/屋根防水の実ゲーム認定 |
| **C 人間ART** | 人が複数視点で見た建築・用途・美術評価 | 未審査の場合の自動PASS |
| **D Minecraft Education実機** | ゲーム内の施工・読戻し・移動/入口/各室/階段・復元証拠 | ローカルHTMLを開いただけで実施工したとの主張 |
| **E 実モデル** | 本物のQwen/Gemmaによる初見要求の設計と再現 | 合成データ、HOST改造、Fake Ollama、テストダブルを新モデル応答と呼ぶこと |

失敗、未完、未審査、データ不足は `HOLD/NOT_REVIEWED/NOT_TESTED` と記録。検査合格だけで「完成」や「正式採用」を宣言しない。

## D. 主要な現存資産

- `source/ai/b143-building-dsl.mjs`: box / ellipsoid / cylinder / torus / beam / staircase、ADD/CUT、repeat、真のボクセル化と source/geometry SHA。**BuildPlan空の設計専用が基本**。
- `source/ai/b198-natural-language-design.mjs`、`source/ai/b198g-local-model-adapter.mjs`、`scripts/b198h-local-workflow.mjs`: 既存の設計検証とローカルLLM境界。
- `source/ai/r125-architecture-plan.mjs`: 短い意味IRから二機能領域・1/2階・真正B143へコンパイル。保存済みモデル原本の既定動作は保護。 `roofVolume:'raised'` を明示した ridge/sawtooth が実高天井を作る。
- `scripts/r125-semantic-pilot.mjs`: **実モデル1 POST**、ローカルOllama限定、オリジナル生回答を先に保存、ArchitecturePlan→B143→幾何/動線/屋根SOURCE審査→読み取り専用HTML。 `--require-usable-roof-volume` は要求した時のフェイルクローズを付加。新規モデル実行が成功した証拠は現時点でなし。
- `scripts/r125-roof-interior-study.mjs`: 完成B143ボクセルから実高天井空気・2×2支持空間・屋根段差/終端候補を独立監査。比較対象はHOST研究であり別のAI応答ではない。
- `scripts/r125-upper-door-repair-study.mjs`: 既存公開QwenのC派生2階扉の分断をオプトインHOST修復。旧C/sourceのfreezeは不変。
- `source/ai/r125-education-makecode-export.mjs` など既存MakeCode輸出、`configs/r125-education-verified-palette-v26.33.json`、旧パレット/Material Probe。**単一石ブロックに全素材を潰す旧問題を繰り返さない**。
- `source/ai/r190-compact-program.mjs`、`source/ai/r190-semantic-massing.mjs` 他R190群は意味設計・物理動線の研究資産。短いIRか既存R125かは実用成果・実モデル成功に応じて選ぶ。新しい設計IRを無闇に並立させない。
- 既存GitHub Actionsの `R125 Saved Qwen C Upper-Floor Door Repair — SOURCE ONLY` 等を再利用。個別の検証用workflowを無制限に追加しない。

## E. 重要な経緯・成果・反省（年代順）

### B100／B143／B198Zの基礎
- B100旧固定研究とB143設計DSLは既存実装として保護。過去の特定建物（図書館等）の局所修正を繰り返す開発から、LLMと共通3D生成器をつなぐ縦貫MVPへ戦略転換。
- 初期のJSON/ベンチマークPASSは「本物の建物ができた証拠」にならなかった。sourceSHA、幾何、入口→室、2幅経路、頭上空間、階段、素材、実3D、人間ART、Minecraft現物を切り離して評価する必要が判明。
- B198Z R79〜R124の《潮光の裂帆図書館》は**人手/コードに基づく独立美術研究**。AI一般設計の実績と混同せずベンチマーク・履歴としてのみ保持。

### R125〜R165：短い意味計画・使える3D・ART不足
- R125短いArchitecturePlanで実Qwen14Bが住宅等を設計した保存済み応答を取得。公開住宅原本 `scripts/fixtures/r125-qwen14b-residential-2024a.json` の計画SHAは `46aed429e795f2622cd8c49d8eb8f1153af20d5d958abf2f5f99020e909ce271`、既定SOURCE/geometry hash・2620ボクセル等を回帰で保護。**出所は実Qwenの意味設計、詳細形状は共通HOST生成**。
- R146等で4機能室・8設備のSOURCE研究、R149〜R155で窓・入口・屋根・高天井・屋根輪郭/家具意匠を比較。真正形状を見た結果、**箱型の外観・用途の読みにくさが強く残る**。テストPASSでもART不合格/HOLDを維持。
- 住宅/店舗/研究施設に共通エンジンを使い、単なる名前差分を禁止。想定外の入口・部屋閉塞に対して必要なQAを作ったが、テストのための開発に戻らない。

### R190／E1・E2：自由設計の難しさを実測
- R190を開始し、モデル自身の意味設計・自由空間から建築へつなぐ多くの研究を実施。ただし大量座標をモデルに書かせる方向は、意味設計とSOURCEの不整合や巨大応答で失敗しやすい。
- **E2** 実Qwen3:14BでB143の箱・窓・柱など全座標を直接書かせた3試行は**原文取得3/3、SOURCE成立0/3**。失敗した手法へ無限に再POSTせずHOLDにして、短いR125意味IRと既存B143へ戻る。
- **E1** 3独立Qwen設計比較はSOURCE不完全・HOLDを記録。モデル由来の全体構想と、HOSTが補ったプログラム/窓を混同しない。設計が実モデルか合成か、匿名/ソース境界を追跡。
- 保存済み実Qwen3:14Bの複数用途でSOURCE成立の記録はあるが、その記録だけで**3用途のMinecraft現物完工・ART PASS・E2自由設計成功**とは言えない。従来の多段階研究は資料として保存し、最短MVPを停滞させない。

### 2026-10-31 教育版初回施工の位置づけ
- Minecraft Education **v26.33** の既存専用テストワールドで、短い実Qwen3:14B意味計画→R125 ArchitecturePlan→B143→MakeCodeの**小さな平屋の花屋**の施工を試行。記録上、計画933ブロックを照合一致、石外壁・ガラス窓が視認できた。後続のゲーム内で**屋内への歩行はユーザーが確認**。ただし入口全条件、全室の機能、設備・装飾、差分/復元、素材の意味的な多様さは未証明。これを全建築の実施工PASSへ一般化しない。
- **素材問題**：B143抽象材7種類をMakeCodeで石/ガラスに潰す旧経路があり、実建築の見た目を大幅に損ねる。検証済みMinecraft Education v26.33の少数ブロックIDから実機で素材対応を増やし、元の素材数・変換数・予期しない石化を検証する。
- 保存済み花屋実機証拠を可能なら**新モデルPOSTなし**で再利用し、「玄関→2つの用途室を歩いて確認」まで最低限の現物判定を先に終える。既存ワールドを安全に識別・バックアップすること。

### 2026-11-01〜11-02 R125：真正3Dと屋根/ルートの失敗・改善
- 公開Qwen住宅からのHOST派生Cの上階床 `standingY=7` は、2×2支持床候補372が **276/96の2成分**。階段シャフト付近の上階ドアを `upperDoorPlacement:'stair-clear'` の明示opt-inで修復すると372/372の1成分に。旧C/実Qwen原文/元A〜Eは変えない。形状SHAの対比は `4d4c1b19...` → `54b3f91c...`（後者はHOST案）。
- Cのsawtooth屋根は、元形状で**平屋根板484/484の上に682屋根輪郭セル**を重ねただけで、居室高天井ではなかった。屋根の外観と本当の空間を混同した反省。
- `roofVolume:'raised'` を明示したridgeに加え、新規sawtoothを許可し、段差の上下連続・終端・屋根下実空気のSOURCE監査を実装。合成住宅／店舗／研究施設で**新たな実空気セル 400/252/374**、高天井空気2×2候補76/51/63を記録。新たな本物のモデル推論3/3ではない。屋根耐候・美術・実歩行も未認証。
- `f7499ad0`：上階支持床から屋根下まで縦に連続する2×2空気候補を追加検査。R125 run [41432515496](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41432515496)、Education-first [41432526839](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41432526839)、B198Z-R1 [41432527154](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41432527154) は成功。
- `cf970b9a`：**AI本人の屋根意図と真正3Dの実空気監査を実モデル経路へ接続**。自然文で高天井や鋸歯を指定したら、モデルがその表現を返さなければHOLD。返した場合は原文保護→HOST別比較→SOURCE連続性監査→従来3D/動線監査。テストダブルで通常/要求不足/プロファイル不一致を検査。R125 run [41438390065](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41438390065) は **12/12 PASS**、Education-first [41438398935](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41438398935) は **SUCCESS**。
- どの結果も **ユーザーのOMENで新機能を実Qwenで実行した結果ではない**。2026-11-02のユーザー帰宅を機にここを最優先へ戻す。

### 重要な失敗と対策
- プログラム床分断を屋根表面分断と誤って混同 → **実ボクセル + standingY + 設計用途**で別分類し、人の屋根歩行は未認証。
- R190-ACの一時失敗 `BASE_ALREADY_HAS_WINDOWS` vs `BASE_PLAN_RECEIPT_MISMATCH` → HOST原本改変をまず拒否する安全な順序は正しく、期待テストを安全な優先順位に合わせて回帰修正。その後155/155 PASS。
- raised sawtooth新設時、旧テストが「sawtoothは拒否」と期待して154/155 → **新仕様を正当に検証、flat/imaginaryなど不正は拒否**し155/155へ回復。テストを通すため安全ゲートを緩めない。
- Playwright 1.56.1 のUbuntu 26.04 Chromiumセットアップ問題 → 専用SOURCE browser QAランナーを24.04に固定。CI環境不良をゲーム内建築不良と断定しない。
- 見た目の白箱、巨大なホスト生成形状の迷走、1棟の修正数百件、ZIP/CMD/CIの増殖 → 一棟に2回連続の固有修正が必要なら共通原因か他用途へ移行。**追加IR、workflow、ページ、テスト、進捗番号を目的にしない**。
- ローカルOllamaのHTTPの過大出力やtimeout、設計された階層の高さ不整合などに遭遇。実際のモデルの生回答と停止理由を安全に保存し、別名のモデルへ黙ってフォールバックしない。

## F. 2026-11-02 現在の確認済みGitHub状態と限界

| 項目 | 2026-11-02の確認 |
|---|---|
| Repository | `ryomashibaba/MinecraftAIBuilder` |
| Branch | `feature/b198zr1-protected-architectural-revision` |
| 作成直前のHEAD | `cf970b9a4bc49e0f2cdce4cf82bdabcfbcb10d3e` |
| Draft PR #128 | Open / Draft / Unmerged |
| R125専用 | [41438390065](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41438390065) SUCCESS / 12/12 |
| Education-first offline QA | [41438398935](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41438398935) SUCCESS |
| 新roof意味IRの実Qwen実証 | 未実施（合成応答のみ） |
| 3用途のEducation実施工 | 未確認（3棟完工とは言えない） |
| 最新研究案の人間美術 / ゲーム内歩行 | ART HOLD / NOT_TESTED |
| 施工デザイン段階 | NOT_PREPARED / 9 BLOCKED / BuildPlan空 |

**引継ぎ文書の後にコミット・CIが増えていることがある。必ずGitHub HEADとrun結果を再取得し、文書を最新の事実に自動昇格しない。** 過去の一時的HOLDはその時点の失敗記録であり現在のCI失敗と決めつけない。他のworkflowが全部成功した保証もない。

## G. 帰宅後に最初に進める具体的な工程（最重要）

1. **読み取りの環境照合だけを先に行う**：Windows 11/OMEN、作業フォルダ（記録上 `C:\Users\ryoma\Projects\MinecraftAIBuilder`）、Gitの作業ツリー・現在ブランチ・origin HEAD、Node.js、Ollamaのプロセスと `qwen3:14b` 実在、Minecraft Education v26.33の**試験ワールド有無/バックアップ**を確認。ユーザーはPCを使えるが、ChatGPTには自動でユーザーPCを操作する経路はない。ローカル編集がある場合は勝手に `reset --hard` 等をしない。
2. **実モデル1件だけ、目標を明示して実施**： `scripts/r125-semantic-pilot.mjs` の既存仕様を利用し、明確に高天井の屋根が求められる小さな研究施設または店舗について、`--model qwen3:14b --prompt "..." --require-usable-roof-volume --out <実在する親フォルダ内の新規子ディレクトリ>` を1回の真のローカルOllama要求で動かす。**新しいroof実機能はまだ実モデルでは未認証**なので、生のMODEL_RESPONSE_ORIGINAL.txt、REQUEST.json、R125_SEMANTIC_REPORT.json、生成B143 scene、屋根SOURCE証拠を読み、妥当性を判定。モデル指定なしのHOST補完や「再試行したふり」禁止。実要求が複雑すぎれば最初は通常のR125短い意味設計を選び、縦貫実績のある花屋を再利用する。
3. **既存Education縦貫優先**：可能ならすでに施工済み花屋の保存記録・世界識別/バックアップから、玄関と用途室の実際の歩行、素材、屋根、窓を確認。新たに安全施工する際は施工候補とワールドの識別・アンカー・復元・材質対応・命令上限が確認できるまでワールドへ書かない。意味設計/実3Dで止まった場合は原因を一つ絞って直し、モデルを無限反復しない。
4. **家・店・研究施設へ再利用**：用途・平面・外観の違いを1枚の真正SOURCE/美術/世界評価表にまとめる。理想の美術品質と8GB 2B小型モデル要件は維持しつつ、数十もの形状・CI候補を先に作る悪循環を避ける。
5. **証拠とGitHub保存**：研究コードは元のPR #128につながるブランチへ普通のcommit。秘密のローカル応答はユーザーのPCに保持し、公開GitHubでは報告用に必要な非機微のメタデータ/合成証拠だけ残す。実質的進捗があった時だけ [AI_RESTART_JA.md](AI_RESTART_JA.md) に1段落程度の現状更新。

### 最小操作の例（**これを無検証で自動実行しない**）

次チャットでは、ユーザーがPCを操作できることを踏まえ、作業ツリー/モデル動作を最小数のPowerShell**読み取りコマンド**でまず確認し、その結果に合わせて実推論用の1回のコピペ手順を作る。WindowsのNode・Git・Ollama・作業ディレクトリが今も同じかを決めつけない。実推論先の`--out`には既存ファイルを上書きしない**新しいディレクトリ**を使う。ユーザーの秘密情報やプロンプトを公開コミットしない。

## H. 次のチャットに委譲する役割と運用規則

あなたは単なる「プラン作成」担当でなく、既存コードと証拠に基づくエンジニア/3D建築品質審査/教育版安全接続担当である。ユーザーが「では次の工程へ」と言ったとき、可能な限り**実装→ローカル/クラウド検証→GitHub研究ブランチ保存→結果とHOLDの報告**を実行。ただしモデルやPCに物理的にアクセスできない場合は、実行したふりをせずユーザー操作を最低限のスクリプトにまとめる。現在はPC操作可能なのでクラウド検証だけに固執せず、ローカル実推論・ワールド実機結果を優先する。

新しいチャット開始文は[START_HERE.md](../START_HERE.md)の第5節にある。長文の引き継ぎをユーザーに繰り返させない。
