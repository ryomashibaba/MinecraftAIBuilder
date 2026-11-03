# V4D 本物のローカルLLM著作を汎用建築SOURCEに接続する橋渡し

**2026-11-03 JST。既存の憲章・戦略v2・R125主経路、過去V4D全候補ART REJECTを保持。** ここで行う作業は見栄えの悪い合成案をまた一つ増やすのではなく、**本物のモデル出力を、短い意味IRを介して既存の汎用3D建築SOURCEへ安全につなぐオプトイン経路**の実装である。

## 1. 何を実装するか

- `source/ai/r125-v4d-relative-author-ir.mjs`：相対配置を持つ短いAUTHOR IR `minecraftaibuilder-r125-v4d-relative-author-intent-v1` を受け入れる。各用途の主従・前後左右の接続、4幅の公的扉、屋根断面・採光・公開庭の庇と柱・用途設備は**すべて入力モデル側で選択**する。HOSTはローカルアンカー(48,42)から確定的に相対位置を算出するだけで、部屋ジャンルや名前に応じた形状のテンプレートを作らない。
- 既存 `r125-v4d-authored-topology.mjs` → `r125-v4d-envelope-integration.mjs` → 真正B143 → 2幅SOURCE動線・各用途設備のサービス位置監査、9 BLOCKED安全ゲートへ連結する。1つでも失敗すれば**入力を直さずHOLD**。未検証のMinecraft世界座標や実施工コマンドは含まない。
- `scripts/r125-v4d-local-architect.mjs`：既存 `preflightR125Ollama` を使用し、正確にモデルが `/api/tags` に列挙された場合だけ、`127.0.0.1` のOllama互換チャットエンドポイントへ最大1件のPOST。JSON形式指定、応答長とtimeoutを制限。自動再POST、追加課金API、外部URL、Minecraftワールド接続は禁止。
- **応答元テキストはモデルが不正JSON、途中打切り、SOURCE不合格の時も先に `MODEL_RESPONSE_ORIGINAL.txt` へそのまま非公開保存**する。成功した場合のみ `AUTHOR_INTENT_ORIGINAL.json` / `TRANSLATED_AUTHOR_GRAPH.json` / `TRANSLATED_AUTHOR_ENVELOPE.json` / `TRUE_B143_SOURCE.json` / `TWO_WIDE_ROUTES_SOURCE.json` / `index.html` を保存する。独立した報告は常に `V4D_LOCAL_AUTHOR_REPORT.json`。成果物をGitHubに自動uploadしない。

## 2. 嘘の成功を避ける強制ゲート

- **Github CIは実Ollamaにアクセスしない。** 自動テストの通信はテスト関数によるフェイク応答であり、たとえ最終B143が正しく出来ても `HOLD_TEST_DOUBLE_NOT_REAL_MODEL` を返す。モデルに署名/暗号的認証が無いため、ローカルの実応答の場合も `declaredProvider` を越えて「本当に特定モデルが著作した」とは断定しない。
- SOURCEが成功した実ローカル応答の状態は `SOURCE_READY_PRIVATE_ART_REVIEW_REQUIRED` であり、**ART合格でも、Minecraftで使える施工準備済みでもない**。応答モデル原文を自動で補正してSOURCEをでっち上げない。 `finish_reason=length` は打切り原文を保存して停止。
- 3～5用途ノード、うち開放公開空間1つ以上、屋内用途2つ以上を持つ**公開空間型建築の限定研究**。小さい住宅などあらゆる依頼に使える汎用完成システムではない。常に3～5用途の巨大な箱を作るものになっていないか、独立ARTで審査する。
- 現在のHOST形状制約は軸平行・単層・ローカル領域（Minecraftワールド上の位置を指定しない）。8GB Mac/2B実モデルがこの意味IRを扱えるかは未検証。2026年11月3日までの実機成功R125→B143→Education経路はそのまま保持。

## 3. ローカルで行う場合の最小操作（現時点でユーザー操作は不要）

当該研究ブランチを既に取得した**隔離した作業コピー**で、Windows PowerShellから次の1回のみ実行できる設計。原本ワールドにはアクセスしない。

```powershell
$out = Join-Path $env:USERPROFILE ("Documents\MAB_V4D_PrivateAuthor_" + (Get-Date -Format 'yyyyMMdd_HHmmss'))
node .\scripts\r125-v4d-local-architect.mjs --model "qwen3:14b" --out $out --prompt "小規模な公共文化施設を設計してください。入口、閲覧、制作、屋外の交流空間が実際につながる独自の形態にしてください。"
```

`$out` は**存在していないGitリポジトリ外の私用フォルダ**に限定される。実機が無くてもGitHubでSOURCEコードとテストだけを先行して検証可能。ローカル実行をしたと主張しない。

## 4. 今回のCI受け入れ条件

`scripts/r125-v4d-local-architect.test.mjs` は、短いAUTHOR IRの真正B143変換と3D/動線・外皮・設備サービス接続、入力無修正、偽モデル応答の非昇格、モデル未導入時のPOST=0、JSON打切り原文保護、不正IRの原文保護、localhost以外拒絶、既存フォルダの破壊防止を試す。CI完走の成否はリンクと実行HEADで確認して報告。

固定保護：main不変更、Draft PR #128 Open/Draft/未マージ、元private Qwen原文・凍結V4D案不変更、Education成功経路不変更、NOT_PREPARED／9 BLOCKED／BuildPlan空／worldWrites0、Work事前承認制。**これがユーザーの目標である本当の高品質AI建築の達成を証明するものではない**。

## 正式CI結果・実行境界（2026-11-03 JST）

- [実装コミット ece29cbe](https://github.com/ryomashibaba/MinecraftAIBuilder/commit/ece29cbe5ba5ccf1ede9e996656e1de96cf8f6df)。[専用 GitHub Actions #41615154621](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41615154621) は **completed/success**（チェックアウトHEAD `ece29cbe5ba5ccf1ede9e996656e1de96cf8f6df`）。
- Node.js構文検査、原文の変更を防ぐSOURCE設計翻訳、1合成AUTHORでの真正B143物理連続性・公開庭・設備接近、ルーフ意図で実geometryが変わる負例、偽Ollama `GET /api/tags`→`POST /v1/chat/completions` 1回、モデル未登録POST=0、`finish_reason=length` の元回答保存、非合法設計拒否、非loopback URL・重複引数・既存出力ディレクトリ拒否の**全8テスト合格、失敗0件**。テストの正常応答も `HOLD_TEST_DOUBLE_NOT_REAL_MODEL` としてART・実モデル認定なし。
- GitHubのActions実行者には実Ollama権限もローカルPCへの操作経路もない。今回の実モデル `qwen3:14b` POST **0回**、実Qwen3:14Bの建築生成成功数 **0件**、新Education施工 **0件**。モデルが多様な未知用途で綺麗な建築を著作できるかは**わからない**。実機Mac 8GB/2Bでの速度とIR完走も未測定。
- 次の段階はGitHubの合成案を増やすことではなく、ユーザーの許可済み**隔離ローカル環境が操作可能な時だけ**1件を実Ollamaで実行し、原文のSHA・失敗理由・SOURCE真正3D・美術判定を分離する。実モデルの失敗は追加無断再POSTしない。ローカル操作不能時は、安全な静的コード検証以上を「実機成功」と言わない。
- 合否はSOURCE PASS（CIの合成試験に限定）／新モデルART NOT_REVIEWED／元ART HOLD・REJECT履歴維持／WorldWrites0。旧main、Draft PR #128、R125 Education成功原本、PRIVATEモデル応答は全保持。

## 2026-11-03 追加工程：2B/4B向け短縮AUTHOR IR（専用CI未確認）

旧詳細モードは10個以上のフィールドを各用途ノードに要求し、外窓の寸法・庇の高さ・設備オフセットまでモデル自身が数値で生成する必要があった。これは**小型モデルの制約として重大だが、実モデルにおける失敗率は未測定**。既存詳細IRは保持し、オプション `--compact` で `minecraftaibuilder-r125-v4d-compact-spatial-intent-v1` を受け取る。

短縮IRの作者の責任は、3〜5用途の目的、1つ以上の公開空庭、親子相対接続、部屋規模、屋根 `ridgeX|ridgeZ|shedX|shedZ`、高さの `low|medium|high`、壁/ガラス、外窓の方向、用途設備の意味と素材。HOSTはジャンル名では形状を選ばず、**全用途共通の機械的寸法**だけを `source/ai/r125-v4d-compact-model-ir.mjs` で展開する。具体的には屋根峰の%50・高さの3段階、4幅開口の断面、入口オフセット7、屋外庇深4、単一外窓幅6/高さ3、設備3x2x2。モデルが選ばなかった寸法はHOST既定値であることを `GENERIC_MECHANICAL_NORMALIZATION.json` に明示して保存。これをモデルが全て自由に設計したと主張しない。

元の短縮IR・SHAと機械展開後の詳細IR・SHAを**両方**保存し、SOURCE真正B143の改変防止/原文凍結を検査。旧通常モードの意匠とSOURCE安全ゲートは不変更。3用途の差・建築美術・3D公共体験・実Minecraft施工・2B/4B実機成功は独立未検証。固定の家/店舗テンプレートや人工物そのものを作者に代わって創作するHOSTにはしない。

実行可能時の任意のローカル1回試験例（既に安全な研究ブランチにcheckoutされている隔離作業コピーのみ）：

```powershell
$out = Join-Path ([Environment]::GetFolderPath('MyDocuments')) ('MAB_V4D_CompactPrivate_' + (Get-Date -Format 'yyyyMMdd_HHmmss'))
node .\scripts\r125-v4d-local-architect.mjs --compact --model 'qwen3:14b' --out $out --prompt '未知の公共文化施設を独自に構想し、屋内の用途室と屋外の公開庭を機能的につなぐ建物にしてください。'
```

実行経路自体は変更済みだが、GitHubのCI完走まではSOURCE PASSを宣言しない。実LLM試行はユーザーPC/個別のローカルモデルサーバーへのアクセスが必要であり、今のクラウドAIの研究コード保存だけでは実行できない。

## 2026-11-03 実CI・失敗の是正（SOURCE ONLY）

- 初回実装HEAD `5103f801fb45e21927d7557c65eb729e6e2dfa36` の専用CI [#41616542303](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41616542303) は **13/14、1 FAIL**。不正AUTHOR変形の負例で、「屋外公開庭を原玄関ではなく別の有効な屋内用途空間へ接続する」ことを不正として扱っていた。しかしその変更は技術的にSOURCE成立可能であり、AUTHORの創造の自由度を妨げる。生成器は変更せず、負例を未存在親室への参照へ修正。
- 修正HEAD `2bcd7031ff88d5b5d30b339c49a80bcb56750ba2` の [GitHub Actions #41616751488](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41616751488) は **completed/success、Node test 14、pass14、fail0**。既存の詳細IR経路8件に加え、短縮IR→詳細IR→元B143・意味的な高さ変更→実最終形状差、機械的正規化の明示、SOURCE通路/3用途設備アクセス、入力不正拒否、1回模擬POST/私有原文保存/模擬非昇格の6件を検証した。
- **実モデル推論実績は0件**。Nodeの注入モデル応答は真のQwen3:14B、2B小型モデル、8GB Mac上の実測ではない。小型モデルがこの短縮IRを正しく生成する可能性は実データ不足で**わからない**。
- SOURCEテストはHOLD施工状態（NOT_PREPARED、9 BLOCKED、BuildPlan空、worldWrites0）。正式ART採用0件、過去のV4D建築のART REJECTを維持。次の実用工程は隔離ローカルコピーで未知自然言語→モデルの原文を1回生成・失敗時も保存→SOURCE真正3Dを独立評価する試験。1例成功でも住宅/店/研究施設を跨ぐ汎用性能や美術品質を自動認定しない。

## 2026-11-03 続き：安全な1回実モデル試験の起動器と最小限共有レシート（初回CI未確認）

前工程の `--compact` SOURCE 14/14 PASSは本物のQwen実生成ではない。次工程でPCの操作負担と非公開モデル原文の流出リスクを減らすため、既存ローカル実行経路に次の二つを追加する。構造的建築品質やARTの成功とは別の技術改善として扱う。

- `scripts/r125-v4d-local-one-shot.ps1`：Windows PowerShell 5.1/7で動かす起動器。**現在研究ブランチであること、追跡ファイルに未保存の変更がないこと、Node 20以上があること、既存JSが存在すること**を事前にチェック。勝手にgit fetch/pull/checkout/stash/resetしない。モデルが未導入/未起動なら停止し、継続的なループにしない。実行はOllamaループバックに最大1POST。原文・真正B143はGit外の `LOCALAPPDATA\MinecraftAIBuilder\PrivateModelStudies\V4D_...\` に新規保存。
- 同じファイルの `-CheckOnly` は**推論・PRIVATEディレクトリ作成・Git更新を一切せず**、起動可否を検査する。これをGitHubのWindows runnerで確認し、偽Ollamaサーバーを実PCと取り違えない。
- `scripts/r125-v4d-shareable-receipt.mjs`：既存のローカル実験が終わったとき、私人の元回答・住所パス・依頼文・HTTP宛先・生のエラー文面を**許可リストに含めず**、`REVIEW_SUMMARY_SHAREABLE.json` だけを自動生成する。安全ゲートの虚偽報告、複数POST、モデルの注入試験→本物への偽昇格は拒否。SOURCE成功後も `humanArchitecturalArt: NOT_REVIEWED`、`minecraftWalking: NOT_TESTED` を変えない。

実際にユーザーのPCで実行する場合だけ、**事前に安全確認済みの研究ブランチの作業コピー内**のPowerShellから1行で起動できる。

```powershell
& .\scripts\r125-v4d-local-one-shot.ps1
```

作業コピーが古い/別ブランチ/追跡ファイル変更中であれば、安全のため明示的にHOLDする。実モデル成功でも自動GitHubアップロードはしない。チャットで共有するなら **`REVIEW_SUMMARY_SHAREABLE.json` だけ**で一次診断可能。ART判断には追加の視覚証拠とユーザー確認が別途必要。

**ユーザーPCに接続できないこのチャット内では実モデル推論0、Minecraft世界接触0のまま。** GitHub ActionsのWindows検査成功も実Windows上のQwen推論の成功ではない。
## 2026-11-03 GitHub Windows・Linux CI 完走結果

- 実装コミット [88655719](https://github.com/ryomashibaba/MinecraftAIBuilder/commit/8865571968cc3b6e7fdc2df1308262cf949d464e)。Windows起動器、共有用の最小限JSON、旧ランナーの安全な原文保存、SOURCE検証と安全偽昇格の負例試験を追加。
- 初回 [Actions #41624217688](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41624217688) は全体FAIL。ただしLinux側は**17/17 PASS**。Windowsランナーで起動器が `CHECK_ONLY_SAFE_NO_MODEL_CALL_NO_WORLD_WRITE`、`RESEARCH_HEAD`、`AUTHOR_MODE=COMPACT` を正しく出力したにもかかわらず、CIテストがPowerShell配列への `-notmatch` 使用で誤判定した。起動器や安全機構の不具合ではない。
- 修正コミット [496c210c](https://github.com/ryomashibaba/MinecraftAIBuilder/commit/496c210cc3a2f7321217e834de566f21bdc466ac) はCI側の `-notmatch` を `-notcontains` に変更。最終 [Actions #41624377954](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41624377954) は**completed/success**。LinuxのNode **17 tests / 17 pass / 0 fail**、Windows-latestのPowerShell **-CheckOnly PASS**。このWindows検査はOllama POST 0、PRIVATEフォルダ作成0、Minecraft世界書込0。
- `REVIEW_SUMMARY_SHAREABLE.json` は元回答・プロンプト・ローカルパス・APIエンドポイント・エラー全文を含まない。成功SOURCE候補と模擬モデルの区別、9 BLOCKED/WorldWrites0を保持する。人間ART・実Minecraft歩行・Mac 8GB/2B実績は全てNOT_TESTED/NOT_REVIEWED。
- PCの安全な隔離研究ブランチが準備できた場合だけ、PowerShellから `& .\scripts\r125-v4d-local-one-shot.ps1` を1回実行できる設計。モデルの原文はローカルPRIVATEに残し、自動アップロードや自動再試行はしない。今回のチャットでは**本物のQwen/Gemma推論0回、Minecraft施工0回**。

## 2026-11-03 追加：既存PRIVATEモデル原文を0 POSTでSOURCE再現する（正式CI PASS）

最後の一回モデル試験でモデルが失敗した場合、モデルを再試行してコストを増やすよりも、**正確に保存された元JSON原文を、バージョン付きSOURCEコンパイラで再生し、当初の結果と比較する**必要がある。モデルの応答が不正だったのか、建築グラフがSOURCEに適合しなかったのか、後日のコード変更で結果が異なったのかを分離する。

`scripts/r125-v4d-replay-private.mjs` は `--study <PRIVATE研究フォルダ> --out <存在しない新規PRIVATEフォルダ>` を受け取り、元 `MODEL_RESPONSE_ORIGINAL.txt` のSHA-256を当初 `V4D_LOCAL_AUTHOR_REPORT.json` の原本SHAと照合。少しでも原文が変更されていれば即時HOLD。原本 `LOCAL_REQUEST.json` に保存された厳密な契約に従い、以前の `--compact` / 詳細モードを明示的に選択して既存AUTHOR→B143のSOURCEコンパイラで再検証する。**HTTPやOllama、Minecraftの呼び出しは実装しない**。

合否の安全条件：
- 原試験のSOURCEと最終形状SHAの両方が正しく一致した場合のみ、元の成功SOURCEを**オフラインで再現できた**とする。合成モデル（testInjectionPresent=true）は `HOLD_TEST_DOUBLE_REPLAY_ONLY` であり、実LLMの成果として数えない。
- 元の応答が不正JSON、`finish_reason=length`、原文未保存、SOURCE不合格だった場合は、モデルを再呼び出しせずHOLD。過去に不合格だった原文を新コードでコンパイルできても `HOLD_PREVIOUSLY_FAILED_BUT_CURRENT_COMPILER_ACCEPTS` にして正式合格へ変更しない。
- 元のSHAと再コンパイル結果が不一致なら `HOLD_RECOMPILED_GEOMETRY_OR_SOURCE_CHANGED`。何が変わったかを確認する対象であり、制作品質の向上認定ではない。
- 元のPRIVATEディレクトリは読み取り専用でアクセスし、レポート・真のSOURCE・ギャラリーは**新規フォルダ**だけに保存する。元回答、ユーザープロンプト、パス、秘匿エラー全文は新フォルダや共有用 `REPLAY_SHAREABLE_STATUS.json` に複製しない。
- SOURCE再現成功でも人間ART、建築用途評価、実Minecraft歩行、8GB級Mac/2B実証は未認定。NOT_PREPARED、9 BLOCKED、BuildPlan空、WorldWrites0は不変。

Windowsの安全な研究作業コピーからは、必要な時だけ以下のように前回試験フォルダを指定して**モデルを呼ばない**再現ができる：

```powershell
& .\scripts\r125-v4d-local-one-shot.ps1 -ReplayStudy "$env:LOCALAPPDATA\MinecraftAIBuilder\PrivateModelStudies\V4D_前回試験フォルダ名"
```

新CIは真正B143同一SHA再現と、SHA改ざん・途中切れ・未設置モデル・不正AUTHOR接続・SOURCEドリフト・シンボリックリンク入力・上書きの負例、およびWindows `-CheckOnly -ReplayStudy` の推論0/出力0の契約を検証する。CIの模擬元回答を実Qwen/Gemma原文と混同しない。

### 2026-11-03 GitHub Actions 正式実測

- 研究実装 [コミット99abad4e](https://github.com/ryomashibaba/MinecraftAIBuilder/commit/99abad4e092c416d549f7d11c82319264546cddf) により、オプトインの PRIVATE SOURCE再検証コード・6件の専用負例テスト・Windows起動器の `-ReplayStudy` 分岐・Linux/Windows CIを保存。
- [Actions #41626660965](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41626660965) は **completed/success**。Linux Nodeの既存テスト **17/17 PASS**＋オフライン再現の新テスト **6/6 PASS**、計 **23/23 PASS、0 fail**。Windowsの `-CheckOnly` は通常と `-ReplayStudy` の両方を検査し、モデル推論・PRIVATEディレクトリ生成なしに正しいモード判定を確認。
- 新6試験は、既存模擬AUTHOR原文の真正B143 SOURCE/geometry SHA一致再現、1バイト改変SHA不一致HOLD、不正接続と旧SOURCE不合格の維持、旧 `finish_reason=length` と未導入モデルのHOLD、原本と再コンパイル済形状の不一致HOLD、入力シンボリックリンク/不正報告/出力上書き防止を含む。いずれも**本物のQwenへの再問い合わせは0回**。
- **原文のSHA一致は元のレポートとの整合性確認であり、モデルの暗号学的身元保証ではない**。モデルの実質的な発想品質・Mac 8GBでの実行性能・美術ART評価・Education内の実歩行は今回未確認。施工状態はNOT_PREPARED、9 BLOCKED、BuildPlan空、WorldWrites0。正式ART採用0件。
- 次工程は隔離ローカル環境で本物のQwen/Gemmaを1回生成した時に、このSOURCE再現機能を使って**モデル/IR/実コンパイラ由来の問題を切り分け、3D美術審査の可否を別途判断**すること。ローカルモデルの結果なしに新しい合成建築の数を増やすことは優先しない。

## 2026-11-03 新工程：実モデルの失敗分類を原文保護のまま再生する（専用CI PASS）

前工程は過去モデル原文のハッシュ照合と真正B143再コンパイルのSOURCE一致を検証できた。しかし「何が失敗したか」が大分類しかなく、未完成のJSON、必要なフィールド欠落、機能設備の記載欠落、空間接続、公開庭への接続、屋根意匠、窓の共有壁衝突を一段階細かく区別しにくかった。

新規 `scripts/r125-v4d-author-source-diagnostics.mjs` は、作者の**原文SHA確認後**にだけ解析し、個人名や秘密の用途名を一切取り出さず、以下の安全な定型コードを返す（ただしSOURCEやARTの合格ではない）。

- ルート契約/必須キー/余分なキー、意味のある用途記述の有無（意味の質そのものは評価しない）、部屋数、屋根種類、素材・寸法の規則。
- 親となる既存の空間への参照、北入口と窓の競合、外窓と共有壁の競合、屋根のある室と公開空間の判別、用途設備の必要な記載、屋外半屋外接続条件。
- 元のJSONが壊れている時は、文字列・位置を含まない `ORIGINAL_RESPONSE_NOT_JSON` の固定コードだけ。元のSHAが一致しないときは診断を作らず、無条件HOLD。
- 元データが構造上有効でも屋根・立体・動線・機能に問題があれば**既存真正B143コンパイラのSOURCE判定を優先**。小型LLMの構造的問題がゼロでも世界的水準の美術・使いやすい室内・実Minecraft歩行が合格だとは扱わない。

元PRIVATE原文やAUTHORの任意文字列/JSONの値は診断結果にコピーしない。コード・問題件数・部屋の配列indexのみを保存し、共有用 `REPLAY_SHAREABLE_STATUS.json` も静的コード/件数だけの許可リストで維持。GitHub Actions [#41629168945](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41629168945) は **completed/success**。Linux Nodeで既存23件＋新6件の**29/29 PASS・fail0**、Windows通常/再生CheckOnlyもPASS。これは模擬モデル応答による構造SOURCE診断の成績であり、実Qwen、ART、Minecraft施工の成功ではない。

### 次の実質成果の優先順位

合成診断テストだけ増やしても建築の美観が改善した証拠にはならない。**次はローカルの本物のQwenで未知の依頼1件を生成し、原文→SOURCE→真正B143美術審査を行うことが最優先**。実モデルにアクセスできない現状ではモデルが通る確率や建築美術の質はわからない。実モデル呼び出し0、正式ART採用0、Minecraft施工0。安全な隔離研究ブランチで `& .\scripts\r125-v4d-local-one-shot.ps1` を一度だけ使用し、PRIVATE原文から共有可能なレシートを得る。SOURCE成功でもARTは別途合否判断し、既存9 BLOCKED/BuildPlan空を維持。
