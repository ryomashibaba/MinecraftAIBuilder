# MinecraftAIBuilder — 開発再開の最新正本案内（2026-11-03）

**2026-11-04 V2実測のHOLD段階分析（新CI未確認）**：新しいQwen5ジャンル試験は構造診断コード合計が前回35→今回10に減った一方、真正B143は依然0/5。housingとstationは構造診断コード0にもかかわらずSOURCE失敗。そこでオフライン再生時の実コンパイラエラーをユーザー原文や機密メッセージでなく**有限の静的ソース失敗カテゴリ**だけにして `sourceFailureFamily` とジャンル横断の `sourceRejectionTriage` に記録し、次回は追加モデル要求なしで既存PRIVATE元回答から原因を絞る。静的構造診断0はSOURCE成功でもART成功でもない。元データを上書きしない。既存R125 Education/main/PR #128/9 BLOCKEDは保護。


**2026-11-04 V4J新旧実Qwenの識別と0追加モデル再診断（CI未確認）**：PRIVATEの元レポートとローカル要求内の `promptProtocol` / `systemPromptSha256` を照合し、不一致はHOLD。両方未記録の旧実績は `LEGACY_UNVERSIONED`、V2は `V4J_SINGLE_RESPONSE_CONTRACT_CLARITY_V2` と区別。共有用5ジャンル再診断JSONに版数別件数と、非注入・元回答SHA一致のジャンル別失敗コード頻度を付加。同じコードは同じ根因の証明ではない。原回答改変・モデル再要求・世界操作は0、実機施工成功経路、main、Draft PR #128、9 BLOCKEDは不変。


**2026-11-04 実Qwen 5ジャンル新規実測 0/5 SOURCE 再生 — V4J作者プロンプト研究改善（新CI未確認）**：提出された `FIVE_GENRES_OFFLINE_REPLAY_SHAREABLE.json` は5件すべて `originalResponseIntegrity=SHA256_MATCH`、`originalWasInjectedTestDouble=false`、`HOLD_REPLAY_SOURCE_REJECTED`、`sourceReproducedCount=0`。構造診断は窓4方向配列5/5、吹抜けの既存屋内室参照4/5、空間親接続3/5、空間ID3/5、空間フィールド3/5など。**共通診断コードは共通の根本原因を証明しない。** 既存SOURCE失敗を自動修正しない。次回の5ジャンルの新しい独立モデル要求でのみ、`V4J_SINGLE_RESPONSE_CONTRACT_CLARITY_V2`（最重要の参照・フィールド・型・枚数を一カ所に集約した短いシステム指示）を使用し、元V4J著者スキーマ/コンパイラ、従来1回/ジャンル、0 world-write、9 BLOCKEDは固定。既存単体V4D・V4H・既存実機施工成功経路のプロンプトは不変。`LOCAL_REQUEST.json` に新旧プロンプト識別とsystem SHAをPRIVATE記録、効果は**未実測**。次のモデル試験で5ジャンル発生コード/真正3D/用途/美術を別々に評価し、逆効果なら研究上HOLDして撤回可能。ユーザーの追加課金・Workなし。


**2026-11-04 V4J 個別実Qwenの真正B143・5ジャンルPRIVATE外観レビュー画面（CI未確認）**：既存0追加モデル要求 `r125-v4j-five-genre-replay.mjs` が、元のSOURCE/geometry SHAを再検証した**非テストダブルの真正B143のみ** `TRUE_B143_FIVE_VIEWS_PRIVATE.svg` を生成し、単一の `FIVE_GENRES_PRIVATE_ART_REVIEW.html` で住宅・店舗・研究・展示・駅の5用途を横並びで比較可能にした。SOURCE HOLD・テストダブルは画像表示しない。実モデル成功ケースがある場合のみWindowsワンクリックからローカルHTMLを開く。外形類似度はSOURCE参考値、ART合格ではない。モデル原文とローカルパスをHTMLに入れず、**共有するのは `FIVE_GENRES_OFFLINE_REPLAY_SHAREABLE.json` のみ**。本番施工・main・既存成功経路に変更なし。9 BLOCKED維持。


**2026-11-04 V4J 5ジャンルワンクリック自動オフライン再診断（CI未確認）**：既存 `scripts/r125-v4e-one-click-ranked-trial.cmd --arcade-five` のY選択で5ジャンルのローカルモデル実験後、同じ隔離クローンにある `r125-v4j-five-genre-replay.mjs` を**自動実行**してPRIVATEの5ジャンル原文をSHA付きで再診断する。追加AI要求0・Minecraft書き込み0。最新の安全な `FIVE_GENRES_OFFLINE_REPLAY_SHAREABLE.json` をエクスプローラーで選択する。再診断が不成立なら既存 `FIVE_GENRES_SHAREABLE_SUMMARY.json` を保護して提示、無断リトライなし。Windows GitHub Actionsで「5回だけの**FAKE localhost** POST・0再生POST・各出力HOLD」を検証。これは実Qwenの成功や人間ART合格ではない。原本、main、Draft PR、9 BLOCKED維持。


**2026-11-04 V4J 5ジャンル PRIVATE 保存済み原文の0モデル呼出し再診断（新規CI未確認）**：既存 `scripts/r125-v4d-replay-private.mjs` をそのまま再利用する `scripts/r125-v4j-five-genre-replay.mjs` を追加。`node scripts/r125-v4j-five-genre-replay.mjs --study "既存PRIVATEのV4J_FIVE_*フォルダ" --out "新規PRIVATE検証フォルダ"` により、実モデル再呼出し0で各既存回答・旧SOURCE/geometry SHA・B143・失敗の構造問題コードを確認。旧SOURCE失敗は勝手に格上げしない。5用途共通のエラーコードを原因未証明の症状として比較し、元がTEST DOUBLEの場合は実モデルPASSに昇格しない。共有ファイルは新規フォルダの `FIVE_GENRES_OFFLINE_REPLAY_SHAREABLE.json` のみ。原文/パス/個別ソース/HTMLはPRIVATE。追加課金・ワールド操作0、human ART HOLD、9ゲートBLOCKED。既存成功経路/main/Draft PR #128は保護。


**2026-11-04 V4J 5ジャンル美術改善の根因切り分け追加（最新CIは未確認）**：実ローカル作者のPRIVATE真正B143成功例に対し、再コンパイルのSOURCE/geometry SHAと別保存の元回答SHA・9ゲートHOLD・5方向真正投影証拠が一致したときだけ、屋根輪郭/奥行き/材料の変化セル数を共有用集計に付加する。屋根輪郭が変化ゼロならそのジャンルを列挙して改善優先事項を明確化。同じSOURCE失敗カテゴリが複数用途で出ても共通根因は**未証明**として扱う。追加モデル要求なし・モデル生回答非公開・自動ART合格なし。実Qwen/実歩行/美術は未検証。従来main、成功原本、Draft PRと9 BLOCKEDを保護。


**2026-11-04 V4J真正モデルの5ジャンル外形比較をSOURCE専用で追加（CI未確認）**：既存V4Iの5方向正規化外形Jaccard計算を、V4JのPRIVATEモデル成功例へ共通適用。各実Qwen候補についてPRIVATE `TRUE_B143_SOURCE.json` から再コンパイルし、保存済みSOURCE/geometry SHAが共に一致した場合のみ、2件以上の独立用途で外形比較。共有するのはジャンル別ボクセル数・投影セル数・10組最大の類似度のみ。モデル生回答や全形状の位置情報は共有しない。SHA不一致・ソース欠損はHOLD。テストダブルは実モデル多様性測定に昇格せず、実Qwen未実施、正式ART HOLD、Minecraft施工0/9 BLOCKED。既存Windowsランチャー・R125成功原本・main・Draft PR #128は保持。


**2026-11-04 V4Jの5ジャンル連続・実ローカルモデル試験経路（CI未確認）**：既存Windowsの隔離起動器に明示オプトイン `--arcade-five` を追加。住宅・店舗・研究施設・展示館・駅舎で独立の自然文依頼を同じ汎用エンジンへ順番に送り、各ジャンル最大1 POST・全体最大5。原文・3Dは各PRIVATEフォルダだけに残し、共有は安全な `FIVE_GENRES_SHAREABLE_SUMMARY.json` のみ。モデル不在・通信不全・タイムアウトは残工程を中断。SOURCEとART/実モデル真正性・Minecraft歩行を別管理し、実Qwenの新試験は**未実施**、正式ART HOLD、9ゲートBLOCKED、mainと933ブロック成功経路、PR #128 Draftを維持。


**2026-11-04 V4Jモデル1応答の研究経路をGitHub保存（新CI検証待ち）**：従来のV4Jは5用途の**合成作者**による真正B143公共ファサードSOURCEに留まっていた。新しい非既定 `--authored-civic-arcade` は、元の研究ブランチにあるV4H二層建築と3ベイ外部前庭を**同じ1 JSONで作者指定**できる契約を追加し、既存のローカルV4D実行器・PRIVATE回答SHA・真B143・入口/上階/前庭の共通SOURCE動線・五方向の前後差分・9安全ゲートBLOCKEDへ接続。既存Windowsワンクリック起動器にも `--arcade` を追加した。オフライン再現（追加モデルPOST=0）、非公開の構造診断、最小共有レシート、正負のテストダブル試験を既存V4D CIへ追加。**コード保存コミット `0d4520f1`、新CI [#41796867155](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41796867155) はこの記録時点で queued、PASS未確認。** 既存の合成V4J CI [#41793756581](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41793756581) のV4JジョブはSUCCESS。現時点で新実Qwen生成0、本物のMinecraftでの新歩行0、正式美術ART合格0。main・旧R125→B143→Education実機成功・凍結原本・Open/Draft PR #128保護。施工は `NOT_PREPARED`／BuildPlan空／9 BLOCKED／WorldWrites0。既存既定と旧V4D/H動作は不変更。新CI失敗ならこの工程は未完了HOLDのままとし、CIと真正3D証拠から修正する。


**2026-11-03最新：ユーザーからのV4D実PC試行2件のSOURCE HOLD（共有壁窓再発）を受け、新V4Eを独立オプトイン研究として実装。** 新契約ではモデルは4方角の窓希望順位を著作、HOSTは全空間接続を認識した後、その順位から外壁だけを数学的に選択する。旧 `--compact` を変更せず `--ranked-windows` を新設。別の一回クリック `scripts/r125-v4e-one-click-ranked-trial.cmd`、PRIVATE元原文、1 POST最大、0追加POST SOURCE再検証、9 BLOCKED、世界書込0。[専用CI #41642486187](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41642486187) **completed/success：Linux 36/36 PASS、Windows新旧ワンクリック実clone・模擬localhost 1POST/失敗時0追加POST再診断PASS**。新V4Eはユーザーの同意で任意実モデル試験可（未実行）、**V4E実Qwen生成0件・ART採用0件**。main/既存Education実機成功/PR #128 Draft保護。[V4D/V4E研究正本](R125_V4D_LOCAL_REAL_AUTHOR_BRIDGE_20261103_JA.md)。

**2026-11-03最新：ユーザー提出のV4Dローカルモデル試行1件から具体的失敗を特定。** testInjectionPresent=false／modelCalls=1／原文SHA一致。ただしモデルの身元は未認証。SOURCE HOLD／3D未構築、JSONは妥当でもroot必須キー1件不足＋schema不一致＋共有壁窓2件（4空間/covered3/sky1/親参照3）。モデル原文はPRIVATE非公開のまま。修正版 `COMPACT_SYSTEM_PROMPT` が必須schemaリテラルと親子双方の窓不可壁・後続の子・windowSide=noneを明記。[実装339a76a](https://github.com/ryomashibaba/MinecraftAIBuilder/commit/339a76a083b89c8ccc9a68a8595a80fc03fa8cb8)、[専用CI #41637699588](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41637699588) **completed/success、Linux30/30・Windows模擬HTTP1POST/追加0POST再診断PASS**。新プロンプトの実Qwen成功率・ART改善は未測定。Minecraft施工0/9 BLOCKED、main・旧Education成功経路・PR #128 Draft保護。次はユーザーが希望時にv2ワンクリックで**新しい一回試行**→実B143・独立ART確認。詳細 [研究正本](R125_V4D_LOCAL_REAL_AUTHOR_BRIDGE_20261103_JA.md)。

**2026-11-03最新：Windowsワンクリック試験でSOURCE HOLDになった場合のオフライン自動診断。** [CI #41635183616](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41635183616) は **completed/success**（Windows Git clone→模擬Ollama GET/POST1→不正接続のSOURCE HOLD→原文SHA確認→追加POST0で診断→安全JSON生成、Linux29/29 PASS）。初回のCIは期待HOLD終了値2が残ってFAILしたが修正済み。ユーザー配布新版 `MAB_V4D_ONE_CLICK_v2.cmd` はblob 518ec0919aと一致。**実モデルQwenの新推論0件、建築ART認定0件、世界書込0件**。main/PR #128 Draft/旧Education成功/9 BLOCKED/Work事前承認を維持。詳細 [V4D研究正本](R125_V4D_LOCAL_REAL_AUTHOR_BRIDGE_20261103_JA.md)。

**2026-11-03最新版：PRIVATE原文を一度もモデルに再投入せず、構造的失敗箇所を安全に分類。** [専用Linux+Windows CI #41629168945](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41629168945) completed/success、Linux29/29 PASS・Windows -CheckOnly PASS。建築IRの契約/接続/屋根/公開庭/共有窓を静的コード・件数のみで診断する。原文や建物名を共有しない。実Qwen新推論0、正式ART採用0、Minecraft世界書込0。次は**本当のモデルの未知依頼1件と真正B143美術判定**が重要で、合成テストの数を建築品質と混同しない。main/PR #128 Draft/R125 Education原本/9 BLOCKEDを維持。[研究正本](R125_V4D_LOCAL_REAL_AUTHOR_BRIDGE_20261103_JA.md)。

**2026-11-03最新版：PRIVATEな元モデル原文を0回の追加推論で真正B143へSOURCE再現する経路が完成。** [専用Linux+Windows CI #41626660965](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41626660965) **completed/success**。Linux従来17/17＋再現新規6/6、計23/23 PASS、Windows通常・`-ReplayStudy` `-CheckOnly` PASS。原本SHA不一致/不正SOURCE/途中切れ/旧HOLD/形状ドリフトは昇格不可HOLD。新 `scripts/r125-v4d-replay-private.mjs` とWindows `scripts/r125-v4d-local-one-shot.ps1 -ReplayStudy <PRIVATE前回フォルダ>` がモデルを呼ばずに新規PRIVATEフォルダに証拠を保存。**本物のQwen新推論0・正式ART認定0・Minecraft施工0**。元SOURCE原本・main・R125 Education成功・PR #128 Draft・9 BLOCKED/WorldWrites0を保護。詳細 [研究正本](R125_V4D_LOCAL_REAL_AUTHOR_BRIDGE_20261103_JA.md)。

**2026-11-03最新：Windows一括モデル試験起動器と共有レシートを実装。** [専用Linux+Windows CI #41624377954](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41624377954) は **completed/success、Node 17/17 PASS、Windows -CheckOnly PASS**。研究ブランチ/Node/HEAD事前検査、ローカルOllama最大1POST、PRIVATE原文保存、共有用 `REVIEW_SUMMARY_SHAREABLE.json` は生回答や個人パスを除外。初回Windows CIの `-notmatch` 誤判定を `-notcontains` に修正。**実モデル推論0・Minecraft施工0・正式ART採用0**、8GB Mac/2B未検証。main・旧成功Education・PR #128 Draftを保護。 [研究正本](R125_V4D_LOCAL_REAL_AUTHOR_BRIDGE_20261103_JA.md)。

**2026-11-03最新：小型LLM短縮IRの注入SOURCE CI 14/14 PASS／実2B・実Qwenモデルは未実行。** 旧詳細IRとEducation成功経路は凍結。モデルが用途・相対配置・屋根/高低・外壁・機能の中核を著作し、HOSTはジャンル非依存の機械的寸法だけを決定する `--compact` をオプトイン追加。専用 [GitHub Actions #41616751488](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41616751488) は14/14 PASS（HEAD 2bcd7031、テストダブルのみ）。初回13/14の誤負例は設計自由度を削らず是正。実モデル能力、8GB Mac、ART、Minecraft施工は未認定。既存状態はNOT_PREPARED/9 BLOCKED/BuildPlan空/WorldWrites0、main/保存Qwen/PR #128 Draft保護。次はローカル実モデル1回の原文・SOURCE・ARTを分離評価する。[研究正本](R125_V4D_LOCAL_REAL_AUTHOR_BRIDGE_20261103_JA.md)。

**2026-11-03最新工程：実LLMへの接続準備（CI 8/8 PASS／実Qwen未実行）。** 相対AUTHOR建築IRから旧汎用SOURCEグラフ・外皮統合・B143・二幅動線に安全に渡す橋を実装。現行HEADはSTART_HEREから照合し、専用CI [#41615154621](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41615154621) を参照。これは注入テストダブルによる通信・SOURCE 8/8 PASSで**モデル実設計の成功ではない**。実Qwenの1件試行はローカル接続がある時のみ、Private原文保存・1POST・fail closed。モデル新推論0、Minecraft世界書込0、ART採用0、mainとEducation成功経路保護。[研究正本](R125_V4D_LOCAL_REAL_AUTHOR_BRIDGE_20261103_JA.md)。

**2026-11-03最新進捗：** V4D汎用AUTHORグラフの屋根・外壁接合欠損、4幅共有扉、公共庭半屋外区画を独立研究コンパイラで実B143補修。専用GitHub Actions #41612917826完走SOURCE 3/3 PASS、元の欠損壁セル545/403/433を補修。一方、ARTは独立真正3D予備REJECT 3/3で正式採用0。合成設計の反復に固執せず、次は実LLM短いIRの接続/用途・外殻・半屋外の統合品質へ。モデル新推論0、世界書込0、旧実機成功保護。詳細はSTART_HEREの先頭と研究専用報告。

**最新2026-11-03 SOURCE進捗（上位は START_HERE）**：研究HEADのV4D汎用空間グラフは直列/分岐/環状3件の合成AUTHORを同一SOURCE/真正B143へ変換、専用R125 CI #41610782194 completed/success。真正3D独立予備ARTは3/3 REJECT、実Qwen新設計0／Minecraft施工0／正式美術採用0。次は公共空間の立体性・外皮接合・用途設備の一体設計を、固定テンプレートに戻らず共通IRで改善。** 旧V4C工程案は履歴として下に保持。

**固定入口：[ルートSTART_HERE](../START_HERE.md) → [2026-11-03完全統合引き継ぎ](MINECRAFT_AI_BUILDER_COMPLETE_HANDOFF_20261103_V4D_JA.md)。** 以下の古い2026-11-02以前の工程ログは歴史として残し、現在地・次作業の優先順位は上記最新版で更新する。現PRはDraft #128、研究ブランチ`feature/b198zr1-protected-architectural-revision`。最新HEADは常にGitHubから再取得する。

- 直近V4C：実B143 SOURCE合成3/3 PASS、CI [#41596939516](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41596939516) SUCCESS、ART 3/3 REJECT。新実Qwen V4C推論0、ワールド書込0。次はV4Dの作者所有の主輪郭・高さの主従・半屋外公共空間の自由度を検証。旧R125/保存Qwen/Education実機成功を守る。
- 上位の[固定憲章](AI_PROJECT_CHARTER_JA.md)・[戦略v2](PROJECT_STRATEGY_V2_JA.md)を維持。main改変・PR Ready/Merge/Close・凍結原本変更・無断Work/有料APIは禁止。技術未準備の施工禁止、9 BLOCKED/BuildPlan空を維持。
- この案内だけで「MVP完成」「美術合格」「世界施工済み」を主張しない。実モデル/合成/人間ART/Minecraft実機を別々に記録する。

---

## 2026-11-02 GitHub固定入口・帰宅後のPC実推論再開準備

- 最新の固定入口としてルート [START_HERE.md](../START_HERE.md) を作成し、[完全統合引き継ぎ](MINECRAFT_AI_BUILDER_COMPLETE_HANDOFF_20261102_JA.md)へ接続。将来の新チャットは短文1つでGitHubの研究ブランチ・憲章・戦略・原本・現状・失敗を再取得する。毎日同じ長文/ZIPを要求しない。
- この文書更新直前のHEADは `cf970b9a4bc49e0f2cdce4cf82bdabcfbcb10d3e`、Draft PR #128 Open/Draft/Unmerged。専用R125 run 41438390065は12/12 PASS、Education-first run 41438398935 SUCCESS。これはSOURCE/TEST DOUBLEの結果であり、最新機能の実QwenやMinecraft実歩行のPASSではない。
- ユーザーは2026-11-02に帰宅しPC操作可能になった。2026-11-01時点の「ローカル操作不可」は解消。次の一手はGit/Node/Ollamaの読み取り照合から始め、既存 `scripts/r125-semantic-pilot.mjs` で **本物の一回のQwen3:14B推論**、元回答の非公開保管、屋根意図→B143実高天井＋室内動線のSOURCEチェックを行う。並行して既存花屋のEducation試験ワールド内の入口/2用途室の実歩行・材料の問題を優先。ガード未通過の施工禁止、Work/Computer Use別承認、主工程の失敗と未認証はHOLD。
- 旧履歴はこのファイル以下とGitHub原本を保持している。新しい工程を無限追加せず、端から端までの完成度を毎回最優先する。

## 2026-11-02 R125モデル自身の屋根意図を真正内部容積へ接続（SOURCE ONLY）

- 起点HEAD `f7499ad0` の3本のCIは R125 #41432515496、Education-first #41432526839、B198Z-R1 #41432527154、すべて **SUCCESS**。前工程の合成3用途・支持床から屋根下の2×2垂直空気SOURCE検証は成立。
- 今回の重要な方針変更ではなく既存R125モデル経路の**欠落した接続**を補修する：`scripts/r125-semantic-pilot.mjs` がモデルへ送る短いArchitecturePlan仕様で、明示オプション `expression.roofVolume:'raised'` を ridge と sawtooth の両方に更新。AIには用途・屋根の種類・軸と実容積を決めさせ、ホストはボクセル計算だけ行う。**モデルが指定していない屋根意図をホストが黙って挿入しない**。
- 直接の自然文に `高天井`/`屋根裏空間` 等が含まれる場合、またはオプトインCLI `--require-usable-roof-volume` が明示された場合、模型が `raised` を返していなければ SOURCEを出す前にHOLD。明示的 `鋸歯`/`sawtooth` または `切妻`/`gable`/`ridge` を求めた場合も不一致はHOLD。**これは限定的な文字列検査であり、日本語全文の意味理解を保証しない**。
- raisedをモデルが返した場合、返した元JSONを絶対に上書きせず、独立HOST比較用だけroofVolumeを外してコンパイルし、両者の真正最終B143から屋根板解除・2×2高天井空気・上階支持床から縦に連続した2×2空気・屋根軒/段差終端の埋めを計測。1つでも不成立なら偽の成功とせずHOLD。専用SOURCE証拠JSONにはモデルの意図とホスト比較の出所を分けて記録。モデル原文保存→厳格認証→3D、元のONE POST/回線localhost/World0を維持。
- 公開GitHub Actionsでは**インジェクトされたTEST DOUBLEのみ**で、正常な架空モデル応答・屋根未要求・別のプロフィールに置換・raw改竄不許可を検証する。新モデル推論成功とは報告しない。保存済み実Qwen原本、旧A〜E、C、mainは不変更。PR #128 Draft維持、9 BLOCKED、WorldWrites0、ART NOT_REVIEWED、Minecraft歩行未実施。
- 次の実用工程：本物の短いAI出力からこの意味IRと屋根空間が出るかを一回の正当なローカルモデルPOSTで確認（クラウドからユーザーPCへ無断接続しない）。結果はMODEL設計とHOSTコンパイルを別々に評価し、Education既存試験ワールド施工へは個別の世界バックアップ/範囲/材料ゲートを経て進める。

## 2026-11-02 R125 2×2上方実空気の支持床〜屋根連続性を監査

- 既存の raised roof の実空気判定を強化。最終B143占有セルについて、屋根直下の2×2高天井空気列に加えて、各列の4セルすべてに**上階の真正支持床が存在**し、立位Yから屋根下2段まで空気が連続する候補を独立計数する。レベル間の本物の階段動線・プレイヤー歩行・気密・構造強度を認定する処理ではない。
- 一般化した同じ `scripts/r125-roof-interior-study.mjs` で、住宅／店舗／研究施設の3つの**合成**建築プログラムに対して0件以上ではなく**1件以上の縦に連続した2幅SOURCE空間**を要求し、既存のプログラム床非退行と9 BLOCKED/World0を保持する。フリーズ原本とB143旧ジオメトリに変更なし。
- 新たなソースのCIは後続のrunを確認する。前HEAD `c50d9a0` のR190-AC #41432012858 は **155/155 SUCCESS**（旧不正フォーム判定との回帰を修正）。Education-first全体QAはこの記録時点で未確定。施工/美術への昇格なし。

## 2026-11-02 R125 共通屋根SOURCE 3用途 実CI結果と統合回帰補修

- 保存HEAD `ef8bba00` のR125専用Actions #41431741878（`verified-source-repair`）は **SUCCESS**。artifact #13133983811 の `roof-interior/ROOF_INTERIOR_SOURCE_REPORT.json` と6真正B143 HTMLを取得して照合した。
- 完成ボクセルの追加天井空気セル：合成住宅400（高天井2×2候補76）、合成店舗252（同51）、合成研究施設374（同63）。屋根端・終端・急な段差の未閉鎖セルは各0、プログラム床SOURCE問題は前後とも各0。**いずれも実Qwen新応答ではなく合成パラメータ研究**。実ワールドの耐候・歩行・美術は未検証。
- 同HEADのR190-AC #41431741903 は **154/155、FAIL 1**。原因は既存 `scripts/r125-architecture-plan.test.mjs` の「sawtooth+raisedは不正」という歴史的拒否期待値が、新たな明示opt-in許可に更新されていなかったこと。安全チェックの緩和ではなく、sawtoothを真正source・追加閉鎖とWorld0で検証し、flatとimaginaryの不正拒否を維持するテストへ更新した。
- この補修コミットのR125/R190-AC/Education-first最終結果は**コミット後に別途検査**。作業中の未完CIを成功と記載しない。mainと元Qwen/凍結A〜E/既存C/既存ridge raisedの幾何SHAは保護、PR #128 Draft維持、施工9 BLOCKED。

## 2026-11-02 R125 共通屋根の「外形だけ」から真正内部容積へ（SOURCE研究）

- 直前コミット `b14d42de` のR190-AC 155/155、R125屋根SOURCE検査、Education-first QAはSUCCESS。PR #128 Open/Draft、main未変更。
- 既存 `ArchitecturePlan.expression.roofVolume:'raised'` の明示指定が有効な場合だけ、新たに `roofProfile:'sawtooth'` を許可する。従来の飾り屋根（未指定）、既存のridge raised、保存済み実Qwen A〜EとC階段修正の原文/幾何は変更しない。
- 屋根を持ち上げた際に失われる外皮の屋根段差および終端の開口を、実壁材によるボクセル閉鎖として追加。屋根下の実空気の2セル縦長列・2×2隣接列を、B143最終ボクセルから再測定する。雨水耐性・Minecraft実歩行を保証しない。
- 用途に依存しない共通コンパイラの評価として、公開済みQwen14B元住宅から派生した**合成**住宅／1階店舗／2階研究室の3プログラムを独立SOURCE比較。新しいモデル推論ではない。専用 `scripts/r125-roof-interior-study.mjs`、テスト、既存R125 CIとartifactを再利用し、異なる用途に同じ共通能力を使う。各検査はレポートにSOURCE/geometry SHA、屋根実空気セル、2幅列、外皮連結候補、プログラム床のHOLD、作者識別を記録する。
- **CI判定**は当該コミットのGitHub Actions終了後に確認。テストSUCCESSを美術・実Minecraft機能・防水の認定に昇格させない。ART HOLD、WorldWrites0/9 BLOCKED/BuildPlan空/NOT_PREPARED、原本公開境界を維持。
- **次**：真正形状の比較HTMLを人間の複数視点で審査し、屋根内部の使いやすさ/床からの到達/採光と、安全な試験ワールド施工の距離を評価。モデル由来の屋根設計とHOST派生を取り違えず、小型Macの短い意味IRという基本目標を維持する。

## 2026-11-02 R125 真正3D屋根断面の実測 / R190-AC 1件の回帰原因修正

- **ローカル不要の本物の検証資料**：前HEAD `cefc770e` の GitHub Actions R125 #41424133813 は SUCCESS。artifact #13130813426 に保存された legacy / stair-clear の真正B143 HTML と `REPAIR_SOURCE_REPORT.json` を取得。ChatGPT隔離Chromiumに両HTMLを実際に読み込んだ（PC幅1100、ページJS例外0、Canvas実表示を確認）。これは Minecraft実機やiPhone実機ではない。
- **実形状の所見**：C案の屋根は sawtooth の外形を示すが、flat roof-base が上階の屋根下全面に残る。真正B143ボクセルで上階の屋根板 **484/484**、さらに屋根板の上に **682**セルのソリッド輪郭がある。従ってプロフィールは**内側に連続する高天井を開いていない**（`DECORATIVE_PROFILE_ABOVE_SOLID_CEILING`）。モデル自体の成果ではなくHOST C案の問題。外皮が防水か、人が屋上へ行けるか、実際に歩けるか、美術合格かは別のHOLD。空洞を装飾だけで「広い室内」と表示しない。
- **実装**：既存 `scripts/r125-upper-door-repair-study.mjs` の最終ボクセル監査に屋根板と上側輪郭の真正占有測定を追加し、3D比較HTMLと `REPAIR_SOURCE_REPORT.json` へ出力。期待している既知Cの数が変わった場合はSOURCE_DRIFT相当で検査FAILし、過去のSHAや設計を自動修正しない。既存CIとテストを再利用し、新しい3D生成器/ワークフローを増やさない。
- **R190-ACの原因**：`cefc770e` CI #41424134150 で **155中154 PASS、失敗1件**。 `scripts/r190-compact-daylight.test.mjs` の negative test が HOST計画に外部窓を加えて改竄した場合、正しい優先拒否 `BASE_PLAN_RECEIPT_MISMATCH` に対し `BASE_ALREADY_HAS_WINDOWS` を期待していた。検証関数の安全な順序は不変。改竄を先に拒否する期待値へ訂正するとともに、HOST二重レシートを合わせた負例でも既存窓禁止を別途確認する。
- **優先順位の判断**：Cの扉修復後は同じ住宅への個別屋根改修を続けない。屋根形態と内側の使用空間を同時に変える**用途非依存の共通屋根意味IR**を、住宅・店舗・小研究施設での再利用を条件に次工程で検討する。上記の数値は一例に限定し、Mac小型LLM対応・実用途・Education実施工への最短経路を優先する。
- **安全不変**：既存Qwen原文、元A-E、旧C、修復CのSOURCE/geometry SHA不変、MODEL新POST 0、WorldContacts/WorldWrites0、main不変更、PR #128 Open/Draft、NOT_PREPARED/9 BLOCKED/BuildPlan空、ART HOLD、Minecraft実歩行 NOT_TESTED。

## 2026-11-02 R125 屋根警告のSOURCE帰属を明確化（形状は変更しない）

- **課題**：C案の上階扉を直した後も B198C は standingY=13/14 の分断を HIGH と表示するが、これを直ちに「居室床不通」や「屋根の危険」と断定できない。人間が屋根を歩けるという主張もできない。
- **実装**：真正最終B143ボクセルに基づき、設計中の屋根以外の追加要素が達する最高Yと、当該 standingY-1 の実支持セルを突き合わせて、プログラム床以外の警告を `ROOF_ONLY_NONPROGRAM_SURFACE` / `UNRESOLVED_NONPROGRAM_SURFACE` に区別する。検証不能な要素は屋根と決めつけない。既存の HIGH 所見、プログラム床のFAIL/HOLD、屋根の人間審査は維持し、警告を消すのではなく意味を明示する。
- **変更範囲**：`source/ai/r125-architecture-plan.mjs` の評価結果への分類追記、既存の `scripts/r125-upper-door-repair-study.mjs` の比較レポートとHTML、対応テスト。既存R125修復Cloud CIを再利用し、新workflow/建築テンプレートは増やさない。
- **残る次工程**：クラウドテストで真のY13/14分類とSHA非退行を検査し、修復案の真正B143複数視点を美術・屋根断面として審査する。警告を消すためだけの不要な形状詰め込みはしない。ARTはHOLD、実Minecraft歩行未確認、試験施工禁止。
- **保護**：公開済みQwen14B原文、元A〜E幾何、従来C、別案Cの形状SHAとデフォルト実装は不変。新しいモデルPOST0、Minecraft worldContacts/worldWrites0、BuildPlan空、9 BLOCKED、NOT_PREPARED、main不変更、PR #128 Open/Draft。

## 2026-11-02 R125 実Qwen C案の2階SOURCE分断を修復（Cloud PASS・別案を保護）

- **調査事実**：保存済み公開Qwen14B元意味設計 `scripts/fixtures/r125-qwen14b-residential-2024a.json`（原SHA `46aed429e795f2622cd8c49d8eb8f1153af20d5d958abf2f5f99020e909ce271`）からのHOST派生C案の2階 `standingY=7` は、2×2支持床372候補が276と96の**2領域**に分断されていた。階段シャフト `x=3..4,z=3..7` に内部扉 `x=3..4,z=9` が近すぎ、連続する2幅床候補が途切れるとSOURCEの座標から特定。Minecraft物理歩行ではない。
- **修正方針**：元A〜E案、実Qwen原文、既存の `compileArchitecturePlan` 既定動作は**一切変更しない**。`upperDoorPlacement:'stair-clear'` を明示した場合だけ、上階z軸仕切り扉をシャフトから余裕を取った位置へ配置。建物名や用途で条件分岐しない共通HOST修復規則、デフォルト `legacy` を維持。
- **GitHub保存**： `source/ai/r125-architecture-plan.mjs` にopt-in規則、`scripts/r125-upper-door-repair-study.mjs` とテスト、`.github/workflows/r125-upper-door-repair-cloud.yml` を同一コミット `5c86807f8ab7f167e240a590393b7785653e25b6` に保存。GitHub Actions `41422419862` の `verified-source-repair` は**SUCCESS**。成果物 `R125-C-Upper-Floor-Verified-Repair-Study` / artifact ID `13130078070` に旧案と修復案の真正B143単独HTMLおよび独立SOURCE評価JSONを保存。
- **独立実測値**：旧C `geometrySha256=4d4c1b19196e14b8aaa99edc53c94d1511ef8e3e622675883f302658a334a5dc`、2階372候補が2領域（最大276、最大比0.7419）→ 修復案 `geometrySha256=54b3f91c206982f8a8288dbafc6dee51947813b8115192f451f92c35a00c8dbc`、**1領域372/372**。モデルから出された意味計画の `planSha256=9d32de7181ae9ba9b7953102055e10e53c01ea6b1011b2681b6043f9eab2cbcc` は旧/新で一致。SOURCEプログラム床のHOLDは修復後解消。
- **残る不合格**：修復案にも `standingY=13`（4領域）、`standingY=14`（3領域）で外側屋根由来のSOURCE断片化警告。美術審査 `ART HOLD/NOT_REVIEWED`、Minecraft歩行 `NOT_TESTED`。正式採用、施工、完成認定はしない。
- **閲覧・品質検証**：クラウドartifactの `legacy/index.html` と `stair-clear/index.html` を実際に取得し、それぞれ真正ボクセルと独立の形状SHAを含むことを確認。2つの元ビューを単一ファイルに埋め込んだ `MinecraftAIBuilder_R125_C_2階床_修復前後3D比較.html`（約140KB）をChatGPTから提供。ローカルPC操作不要。Chromium 420×900で両iframe計3,067表面ボクセルずつ描画、＋ボタン・視点リセット・比較切替が成功、JS例外0。表示画像 `R125_C_修復前後_スマホ比較.png`。これはChatGPT隔離ブラウザの表示確認であり、iPhone実機・Minecraft実歩行ではない。
- **次に進む工程**：屋根断片化の解決は、現在のC屋根 sawtooth の元形状SHAを維持したうえで、屋根頂部の局所構造/外皮連結を真正B143に基づくHOST別案として研究。構造の見せかけ補完や既存Cの上書きは禁止。幾何の屋根だけの連結性を改善しても、人間美術とワールド物理は別ゲート。
- **不変**：main未変更、Draft PR #128 Open、モデル呼び出し0、ユーザーPC操作0、ワールド接触/書込0、BuildPlan空、NOT_PREPARED、9 BLOCKED、非公開R190原本の公開0。

## 2026-11-02 13:42 JST以降 — クラウドChromium QA復旧・建築SOURCE不良の明示

- **失敗の原因・修正**：GitHub Actions run 41379919641 の失敗はUbuntu 26.04上でPlaywright 1.56.1のChromiumがインストールできなかったため。先行の2件の生成テストおよびSOURCE照合はPASS。Ubuntu 24.04に固定（commit 433a421ff5cfb78eeea81b42ba53598563f9ad06）し、run 41389992699 はSUCCESS。MOBILE_420/DESKTOP_1280の本物のChromiumはCanvas描画（62997/149551非背景ピクセル）とモデル切替・拡大・縮小・断面・視点リセット、JS例外0・外部通信0でPASS。artifact 13116733901保存。
- **建築品質の実測問題を表示**：保存済み実Qwen14Bの意味設計から生成した5案を調べると、C案の2階（standingY=7）でFRAGMENTED_PROGRAM_FLOORが発生し、PROGRAM_FLOORS=HOLD。AはPROGRAM床の問題なし、B/D/EはPROGRAM床は問題なしだが外部屋根のSOURCE断片化の注意あり。いずれも美術・Minecraft物理歩行は未証明。5案中B–Eはホスト派生で追加モデル応答ではない。
- **実装**：scripts/r125-expression-gallery.mjsに選択案連動のSOURCE品質/プログラム床連結/外部幾何注意/MODELとHOSTの作者情報を追加（commit 7aba148e1d5f3e411811f4c67e88d00529996201）。SOURCE HOLD状態を隠さず、動線不良を建築として合格と表示しない。元のQwen設計・形状・プライバシーは変更しない。
- **自動ブラウザ再検査**：scripts/r125-expression-gallery.test.mjsとscripts/r125-qwen-cloud-mobile-qa.mjsに選択案作者情報、C案床HOLD警告、A案元モデルの出所、E案HOST出所を実際のChromiumで確認するテストを追加（commit f206a4ceeebf3843efb5ba1690a3704f81855200）。GitHub Actions run 41390393492がSUCCESS（テスト2/2、MOBILE_420とDESKTOP_1280両方PASS、外部通信0、worldWrites0）。
- **成果物**：artifact ID 13117111708に、B143 5案の正本HTML、SOURCE評価JSON、スマホ/PCスクリーンショット2枚を保存。ChatGPTで単一HTML MinecraftAIBuilder_R125_5models_品質審査付き3D.html（250956 bytes）をユーザーに提供。HTMLのSHA-256は803cd866720123c0bc4b77d412584ead3bc7e1cb0c631e340e06d5bcc2d7d8bf。ローカルPC/Node操作不要。
- **残りの課題**：直接開けるGitHub Pagesの新URLは未確認。C案PROGRAM床分断の根本原因を調査し、建物固有の見せかけ修正でなく共通B143問題として修復研究する。実Qwenの直近R190住宅・花屋・研究施設の非公開原本は公開GitHubに載せない。ART HOLD、実歩行NOT_TESTED、NOT_PREPARED、BuildPlan空、9 BLOCKED、worldWrites0、main未変更・PR #128 Open/Draftを維持。

## 2026-11-02 R125クラウド5棟QA成功、真正単一HTML抽出、Chromium回帰検査へ

- **確定済みの実行事実**：GitHub Actions run `41374756553` は `success`、`verified-mobile-gallery` も成功。Actions artifact ID `13111215231` / `R125-Public-Qwen-5-Scene-Mobile-3D` が約53KBのZIPとしてGitHubに存在（期限2026-11-23 UTC）。ZIP実体をChatGPT側で取得、`index.html` は246830 bytes、モデル原本SHA `46aed429e795f2622cd8c49d8eb8f1153af20d5d958abf2f5f99020e909ce271` のみ。A=保存済み真正Qwen3:14B住宅意味設計2620ボクセル、B=3385、C=3209、D=3838、E=2758のホスト派生4案。モデル呼び出し0・世界書込0・9ゲートBLOCKED・Minecraft歩行未実証。
- **ユーザーへの直接成果**：ZIP解凍なしで開ける単一ファイル `MinecraftAIBuilder_R125_Cloud_Qwen_5models_3D.html` をChatGPTのsandboxファイルとして提供。GitHub Pagesの公開デプロイとは区別する。オリジナルのHTMLをバイト列のまま抽出し、Qwen原文/幾何を改変しない。
- **追加実測**：このHTMLをPlaywright/Python+Chromiumで `set_content` した420×900pxのスマホ幅で確認。Canvas 398×744 / 背景以外描画ピクセル63018、5案選択、断面切替（2619→1935表示）・ズーム・視点リセット・E案への選択成功、JS page errors=0。実ブラウザ検証はChatGPT隔離環境内であり、スマートフォン実端末やMinecraft実機での合格ではない。表示証拠 `R125_Cloud_Qwen_Mobile_Proof.png` も会話内で保存。
- **クラウド側への恒久化**：`scripts/r125-qwen-cloud-mobile-qa.mjs` を `89984fc8` で追加。GitHub Actionsを改修（`fa4a3390`, `03781fe6`, `18d227e7`）、ピン留めPlaywright 1.56.1による420pxモバイル+1280pxPCの本物Chromium Canvas検査、操作、ネットワーク通信0、エラー0、撮影PNGを同じartifactに含める。アニメーションフレーム同期待ちと短時間連続更新の新旧run重複キャンセル対策を入れた。
- **正確性の境界**：新Chromium QAを有効にしたHEADのGitHub CIはこの記載時点で未完走。run `41379919641` が待機中。先行runの成功を新検査後の成功と偽らない。既存B143 Pagesの重いパイプラインは以前CANCELLEDで配信確証なし。R190最新3用途非公開原本は公開GitHubへ一切載せない。
- **固定**：main変更なし、Draft PR #128維持、local Windows不要、MODELとHOST分離、ART HOLD、Minecraft歩行NOT_TESTED、NOT_PREPARED/9 BLOCKED/BuildPlan空/WorldWrites0。

## 2026-11-02 ローカル不要の軽量CIで公開済みQwen真正3Dを生成（実装保存・実行結果待ち）

- 現地のWindows操作は不可。既存ユーザー添付 `R190` 住宅・花屋・研究施設のモデル原文/3Dを**公開リポジトリへ保存しない**。すでに公開されていた `scripts/fixtures/r125-qwen14b-residential-2024a.json` のみを材料にする。
- 既存B143 Pagesは巨大B167の検証経路に巻き込まれ、push run `41359773171` がcancelled。最新HEAD `dce4ccca` のEducation-first QA `41359778946` はSUCCESS。ただしPagesや直URLの新配信を未確認。キャンセル済みPages検証を再実行したが再度CANCELLED（連続更新とconcurrency）、成功とみなさない。
- **新しい独立した軽量クラウド工程**：`.github/workflows/r125-qwen-cloud-preview.yml` を研究ブランチに追加（コミット `3d7da772d9879ca03c466a2a97abe646fec754e0`）。GitHub ActionsのUbuntu+Node 22で公開済み元Qwen設計の真正B143 5モデル（A=実モデルの元意味設計、B〜E=HOST派生の比較用構造）を再生成する。固定元プランSHA・5つの違うgeometry SHA・モデルとホストの作者区別・WorldWrites0/9 BLOCKED/施工禁止・モバイルCanvas操作・単一HTMLを検査。モデル呼出・PC操作・Minecraft書込み・Pagesへの公開デプロイをしない。合格時のみ21日保持の `R125-Public-Qwen-5-Scene-Mobile-3D` Actions artifact を登録する。
- **現在地**：初回GitHub Actions run `41374756553` は作成され実行待機。実行成功/HTML成果物の存在/Pages公開は未確認。ユーザーには前回の添付された真正R190住宅大窓のローカル操作不要な単一HTMLプレビューをすでに提供済み。次はこのrunの最終結果を見て必要なら実原因を修正し、個別の閲覧URLまたはActions成果物の操作を減らす。main、Draft PR #128、凍結Qwen/旧Sourceを保護する。
- SOURCE≠ART/実際のゲームの歩行。ART HOLD、minecraftWalking NOT_TESTED、NOT_PREPARED・BuildPlan空・9 BLOCKEDを維持。

## 2026-11-02 遠隔スマホ閲覧へ移行 — 既存公開Qwen住宅のGitHub Pages統合

- **ローカルPC操作禁止/不要の継続方針**。ユーザーは外出中でWindows・ローカルQwenを操作できない。今後のSOURCE研究はGitHub上の保管済み資料とActionsで実行する。ローカル実行の要求や結果の捏造をしない。
- 旧B143 Pages CIの `B148_DEFAULT_MODEL_HOOK` 回帰失敗はスマホボタン登録で末尾 `setScene();\n</script>` が崩れたため。操作ボタンを維持したまま末尾を修正し `f083e6b3076c1aba4f71217148752baafbfc6e94` に保存。旧CI run `41354986223` による原因実証済み。**修正後のPagesジョブ完走/デプロイは別途確認**。
- 既存公開資料 `scripts/fixtures/r125-qwen14b-residential-2024a.json`（本物Qwen3:14Bの過去保存済み意味設計、モデル入力プランSHA256 `46aed429e795f2622cd8c49d8eb8f1153af20d5d958abf2f5f99020e909ce271`）に限定して、既存の `scripts/r125-expression-gallery.mjs` をB143 Pagesビルド中に実行し `b142-site-output/qwen-reference/index.html` を生成する工程を `.github/workflows/b143.yml` に追加（`4ed145a8891c4b60b6ddbcb995a7a426b5968dae`）。HTMLはスマホ対応の真正B143、Aは元Qwen意味設計、B〜Eはホスト派生の形状研究で「新たなモデル応答」と偽装しない。生成時に原文SHA、モデル出所、5真正SOURCE、9 BLOCKED、世界書込0を検査し、失敗時は既存Pagesに配信しない。
- **プライバシー境界**：今回チャットに添付されたR190住宅大窓 `index(8).html`（幾何SHA `1475bb3796d1b1b9cc216e736a6355f55a7f161f343e35f1dfbf5cfe05e44f10`）および住宅/花屋/研究所3用途の個別原文を**公開GitHubリポジトリ/GitHub Pagesへアップロードしない**。今回のクラウド閲覧追加は既に公開されていた別世代のQwen住宅である。ユーザー添付3Dは会話内の単一HTMLとして保持。
- **確認が必要な点**：Actions run `41359608164` の最終結果、b143-site/desktop/mobile Chromium QA、Pagesデプロイ先の実URL。単に設定しただけで「公開された」「5形状の実測成功」を断定しない。これらの結果に応じて既存ビルド不具合を直す。ART HOLD、Minecraft歩行NOT_TESTED、施工NOT_PREPARED/9 BLOCKED、BuildPlan空、main及びPR #128 Draft保護。

## 2026-11-02 R190 採光意図と真正B143窓を結ぶ再生証拠（SOURCE限定）

- **新実装**：保存済み真正モデル原文の `--replay-latest` で、モデルが daylightIntent を記述していた場合は、各室の希望方角・採光量とHOSTが安全確認して実際に配置したB143窓の位置・寸法を対照する。`DAYLIGHT_INTENT_RECEIPT.json` を個別保存し、`WINDOW_RESEARCH_REPORT.json` と3D比較HTMLに出所・希望達成／HOST逸脱／未実現を表示。AIが意図を指定していない旧Qwen原本は明示的に `HOST_DERIVED_NOT_MODEL` と記録し、モデルの功績に偽装しない。
- **真正性・安全**：元モデルprogram SHAとB143 SOURCE・geometryの整合、窓の最終配置、希望達成の証拠を独立照合。偽造した希望達成・窓配置・原本整合をHOLD拒否。MODEL/HOST/ART/実歩行を分離し、NOT_PREPARED/9 BLOCKED/BuildPlan空・WorldWrites0継続。新コミット `733c5aab52188a75ff06f936281b4218858d7d2d`（`scripts/r190-compact-program-study.mjs` とテスト）。
- **検証済み境界**：変更JS構文解析PASS。隔離の真正B143ロジック合成3室実行で、旧形式は指定0件でHOSTのみ、新形式は希望2件・充足2件（西3×2、北4×3）、他室の動線とWorldWrites0を確認。モデル作者の希望達成を偽装した入力はHOLD。隔離実行のSHA処理は検証用の代替実装のため、**正式Node CI・暗号学的SHAの実行合格ではない**。
- **未達・次工程**：最新HEADのEducation-first/R190-AC CIの実行完走、実Qwen新採光形式へのモデル応答、保存済みWindows原本での大窓再生、美術C、Minecraft歩行Dは未確認。既存3用途・11室688/688は旧仕様のSOURCE実測。次はCIを確認して新3DのSOURCE／人間美術レビューを行い、用途と外観・室内が本当に一体化したか判定。再推論・ワールド書込・Work移行を勝手に実施しない。

## 2026-11-02 スマホから真正B143 3D閲覧（ローカル操作なし）

- ユーザーは外出中で今後PC/PowerShellのローカル操作不可。**PCに依存する `--replay-latest` の再実行を要求しない**。モデルがローカルPC上のみなら新たな真正Qwen推論は遠隔実行できない。既存保存済み設計のソース査読・GitHub研究コード改修は継続できる。
- ユーザー添付の住宅大窓 `index(8).html` はB143 galleryの埋込み真正SOURCE（2140 surface cells、モデル/ホスト派生窓36セル）。形状SHA256 `1475bb3796d1b1b9cc216e736a6355f55a7f161f343e35f1dfbf5cfe05e44f10`、ソースSHA256 `931e60b50cf573e870f6d731c297950d29322b172e9f33b9307f7aac6a7f6d87`。同じ埋込みJSONを改変せず、スマホ用の操作・縦画面を加えた**単一HTML** `MinecraftAIBuilder_R190_住宅3D_スマホ閲覧.html` をChatGPT添付としてユーザーに提供。Chromiumヘッドレス実機相当の幅420pxでレンダリングし、2,140セル表示、zoom/cut/resetイベント動作、ページJSエラー0を確認。添付単体の再生であり、公開Webサイトのデプロイではない。
- 今後生成する汎用B143設計にも適用するため `source/ai/b143-viewer-template.html` に同じスマホ操作（画面上＋/－/断面/リセット、縦画面は模型先・操作後）を加えた。実装コミット `496d34f0012b7570ee6fc589478350ddaae47f43`、既存3用途保存済み研究のテストにボタン・単一HTMLを照合する回帰検査を追加 `25e866d4ddf95d1ac468f2a47e7492eeff3ec1f6`。B143の真正形状生成・模型作者・実モデル原文・main・ワールドは一切変更しない。
- **公開の取り扱い**：当該GitHubリポジトリはpublic。ユーザーがChatGPTへ渡した実Qwen住宅データを、別途の公開同意なくGitHub Pagesや公開ブランチへコミット/アップロードしない。3用途全体の本物の3Dを公開可能な形で所有していると推定しない。GitHub Actionsに実Qwenデータがない場合、新しいモデル/建築の真の自動生成をしたと主張しない。
- **境界**：この追補時点ではGitHub Actionsの最新実行を待機中と確認。モデル生成・美術/実歩行・Minecraft操作のPASSではない。ART HOLD、NOT_PREPARED/9 BLOCKED、BuildPlan空、worldWrites0、Draft PR #128を維持。

## 2026-11-02 R190: モデル指定の採光・眺望意図（実装済み、CIは未確定）

- **目的**：保存済み実QwenのR190コンパクト3用途・11室688/688 SOURCE床接続実測を維持し、窓の方角・採光量をAIの定性的建築意図としても選べるようにする。既存3棟のSOURCE実測は新機能の検証ではない。
- **実装**：任意の daylightIntent に spaceId / preferredFace / scale（modest, balanced, generous）を指定できる。モデルが部屋と希望方角・採光の強さを選び、ホストが座標と真正B143窓を安全ゲート内で解決。希望方角/規模を達成できたかの記録を保持し、達成不能な選択も隠さない。旧原文には項目がないため、従来の2×2小窓経路は維持。
- **証拠保護**：元のMODELプログラムSHAとモデル意図を照合し、差し替えたホスト原案や捏造されたAIの窓意図をHOLDで拒否。変更コードと回帰テストを継続ブランチに保存：コミット a91821ae16a064f8858a7235dd15ce7471d462ef / 9e5e23e0bbfe09aed034e2b16364eb010e509c2e。凍結Qwen原文、main、旧B143 SHA、Minecraftワールドは未変更。
- **検証境界**：変更5ファイルのJavaScript簡易構文解析は成功。コミット後のEducation-first / R190-AC CI、実モデル新仕様での実際の応答、3D美術審査、実歩行はまだ未確認。既存の3/3・688/688は旧設計のSOURCE計測である。
- **次工程**：最新PR HEADとCIの最終結果を確認。保存済みQwen3用途は再推論0の replay-latest で小窓/大窓の真正3Dを比較。新しい採光意図は新規の真正モデル応答で初めて評価し、MODEL/HOST/ART/Dを混同しない。ART HOLD、NOT_PREPARED、BuildPlan空、9 BLOCKED、world0、main保護、PR Open/Draftを維持。

## 2026-11-02 R190 CI調査：旧SVGテストの誤検出を修正

- GitHub Actions R190-AC run `41352155075`（途中コード `2fc6aba`）は150テスト中149 PASS / 1 FAIL。**失敗はSVGに必要な正規の `xmlns="http://www.w3.org/2000/svg"` を、旧テストの `https?:` 禁止正規表現が外部URLと誤認したテスト実装ミス**。当該ログで新しい「HOST expanded real-glass candidate preserves model, original scene and safety」単体テストは個別PASS。
- この誤検出は `d3ad62754a9a002cd2124e0a1c8982920a51328b` で、外部リソース参照 `href/src` や `url(` と危険要素を検出しつつ、必要なXML名前空間URLは認めるテストへ修正。**この修正後HEADの全CI PASSはまだ確認していない。** Education-firstを含め現在のrun状況を確認してから完了とする。
- 既存実Qwen(4)の3/3、11室688/688接続、窓8は独立のユーザー実測であり、今回追加の大窓3D別案（HOST派生）の生成結果と混同しない。

## 2026-11-02 実Qwen保存済み3用途のSOURCE床実測 → 外観別案に進行

- **ユーザー実行の真正証拠**：`E1_COMPACT_REPLAY_REPORT(4).json` とChrome画面、保存先 `C:\\Users\\ryoma\\Projects\\MinecraftAIBuilder-E1-Outputs\\R190-COMPACT-REPLAY-HBEKJI`。住宅・花屋・研究施設の真正SOURCE 3/3、窓付きSOURCE 3/3、研究外殻MakeCode 3/3、実窓3/3/2計8。モデル再要求0、worldContacts=worldWrites=0、ART HOLD、実歩行NOT_TESTED。
- **入口からの2×2支持床**：住宅4室 36/36＋104/104＋47/47＋104/104＝291/291、花屋4室 47/47＋104/104＋36/36＋36/36＝223/223、研究施設3室 36/36＋102/102＋36/36＝174/174。**合計11室688/688、孤立0**。2×2床の候補位置数であり、Minecraft物理歩行・内装機能・人間のART審査ではない。完成度をSOURCEの数字で偽装しない。
- **スクリーンショット美術判定**：住宅は部屋のボリュームと外形に違いはあるが、単調なブロック外皮と小さい窓で用途・品質が十分に読み取れない。ART HOLDを継続。正本原文SHAは不変。
- **次の実装**：既存の元外殻/小窓3Dと別に、`deriveR190CompactExpandedGlazingVariant` を導入。B143真正幾何・室内床ルートを毎候補再検証し、窓の幅/高さだけをHOST側が変える独立大窓研究案を出す。保存済み3用途の再生結果に `HOST_LARGER_GLAZING_RESEARCH_ONLY` の真正3Dとガラスセル数・作者証拠を追加する。関連コミット `0216891`（生成器）、`2fc6aba`（単体テスト）、`49dc169`（3用途接続）、`5786df7`（再生テスト）、`0e8ce0a`（文書改行修正）。**新しい大窓3DはユーザーPCで未再生・人間ART未審査。コミット/テスト記述はCI成功の主張ではない**。
- 次は現在HEADのR190-ACとEducation-first CIを照合して、保存済み3用途 `--replay-latest` を再推論0回で再生し、小窓と大窓を同一角度で美術比較。安全条件（main/PR Draft/凍結原文/ワールド未変更、NOT_PREPARED/9 BLOCKED/BuildPlan空）を維持する。ユーザー操作を最小化し、既存専用Git cloneを`git pull --ff-only`で同期すればよい。

## 2026-11-02 追補 — 真正B143 SOURCE室内アクセスの可視化（実装保存、CI判定待ち）

- 保存済み実Qwenの住宅・花屋・研究施設を、元原文に再問い合わせせず比較する現行 `replayR190CompactSaved` に、各室の2×2支持床候補の連続性を**真正最終B143ボクセルから図示するSVG** `SOURCE_FLOOR_ACCESS_MAP.svg` を追加した。入口へ連結する床は緑、孤立した床候補は橙、支持床は灰、部屋輪郭と入口実証点を表示。もとの回転3D比較HTMLからマップへ移動できる。出所・source SHA・geometry SHAの整合を再監査し、室別数値との相違はHOLDにする。建物別のハードコード・モデル原文改変・新規モデル推論なし。
- 実装コミット `8fd3fbf1969dac1350fdd705dd54e915c8d41d69`、継続ブランチ `feature/b198zr1-protected-architectural-revision`、PR #128 Open/Draft。変更は `source/ai/r190-compact-daylight.mjs`、`scripts/r190-compact-program-study.mjs` と対応テストのみ。既存原本・main・教育実機ワールド未変更。
- **検証境界**：この追補時点の新コミット専用R190-AC、Education-first CIは判定待ち。既存実Qwen3棟の新SVGはその保存済みWindows原文がここで実行できないため未生成・未観察。既存 `E1_COMPACT_REPLAY_REPORT(3).json` は以前のSOURCE3/3・窓研究3/3の実証で、新SVGや実歩行の実証ではない。新機能をSOURCE限定とし、ART HOLD/実歩行NOT_TESTED/BuildPlan空/NOT_PREPARED/9 BLOCKED/WorldWrites0を維持。
- **続く優先工程**：CIの成否を確認し、失敗なら実原因のみ修正。保存済み実Qwen原本のPCから `node scripts/r190-compact-program-study.mjs --replay-latest` を一度だけ実行して、3棟のSVG・数値・窓付き真正3Dの結果を比較。孤立領域があれば共通配置/ドア/内装設計で改善。試験ワールドの識別・バックアップ・空き範囲・復元・命令制約が整うまで施工禁止。全工程でmain/凍結原本を保護し、WorkやPC操作に別の許可なく踏み込まない。

## 2026-11-02 入口から各室までのSOURCE 2幅床到達率（コード実装済・CI確定待ち）

- **新コードの事実**：R190 compactの既存 `auditR190CompactInteriorEvidence` に、真正最終B143ボクセルと入口からの2幅床BFSに基づく `reachableTwoWidePadsFromEntrance`、`disconnectedTwoWidePads`、`reachableTwoWidePadFraction` を追加。保存されたsource-route witnessを独立再計算と照合して食い違いはHOLD。3用途の `--replay-latest` が出す `ROOM_SOURCE_FLOOR_REVIEW.json` と比較HTMLに室別計測を表示し、既存テストに整合/改ざん拒否を追加。**R190 compactに限定したSOURCE上の改善**であり、R125の主経路・既存Qwen原文・B143原本・mainに変更なし。
- **GitHub保存**：`feature/b198zr1-protected-architectural-revision` / Draft PR #128に関連コミット `28b6c64`、`82bd098`、`944c408` を保存。これらを現在HEADそのものと混同しない。関連CIでは前HEAD `82bd098` のR190 compact新テストは通過した一方、R125の古い `r125-semantic-pilot.mjs` 文字列クォート破損による6失敗が観測され、後続 `8c6d845` で文字列修正された。**後続HEADの全CI PASS・保存済みQwen3棟での新計測値・Minecraft実歩行は未確認。** R55等の別CI失敗も個別に区別する。
- **必ず続ける工程**：最新PR HEADとR190-AC/Education-first CIの結果を先に確認する。保存済み実Qwen住宅・花屋・研究施設の `--replay-latest` をPCで再推論0のまま実行し、入口からつながらない室内床・家具/室用途・窓の3D見た目を現物で比較。必要ならR125の最短自然文→本物B143→検証済素材MakeCodeへ、建物固有テンプレートではない共通機能修正を施す。その後、対象ワールド識別・別バックアップ・安全な空き領域・復元を確認したMinecraft Education試験ワールドだけで実際に入口/室内を人間が歩く。CI成功をART/実世界PASSに昇格しない。
- **不変**：ART HOLD、正式採用0、実Qwen元原文の改変0、NOT_PREPARED/9 BLOCKED/BuildPlan空、ワールド接触・書込0（この工程）、main変更/merge/force push禁止。Work・ユーザーPC操作は別途事前承認制。ZIP・長文再提出不要。

## 2026-11-01 続工程 — 室内SOURCE床計測＋元/窓付き3D比較

保存済み実Qwen3用途を再要求せず、replay-latestで実ボクセルの各室支持床・頭上2セル空気・2×2床候補を室別記録する。モデル元外殻とHOST窓付き別案の真正3Dを並べる。新報告ROOM_SOURCE_FLOOR_REVIEW.jsonはSOURCE計測だけであり、家具、ART、実歩行、採光、ワールド安全、施工許可を認定しない。安全初期値と原本を維持。CIおよび実3用途の保存済み再生は別途検証する。次はこの比較から共通の機能欠陥を特定して実用改善する。

## 2026-11-01 再開の現在地 — 実Qwen 3用途SOURCE/窓派生/教育外殻 3/3

**新しいチャットはこのGitHub正本から再開する。PDF/ZIP/引き継ぎMarkdownを毎回生成したり、ユーザーに貼り直させない。** 最初に本ファイル、`docs/AI_PROJECT_CHARTER_JA.md`、`docs/PROJECT_STRATEGY_V2_JA.md`、必要に応じて`docs/R125_THIN_VERTICAL_SLICE_PLAN_JA.md`、続いてPR #128のHEADと関連CIを確認する。記述済みの旧コミット/古いCI結果を最新と混同しない。新チャットでは「MinecraftAIBuilderをGitHub正本から引き継いで、次工程へ進めて」だけでよい。GitHubの未反映のローカル実測証拠があるときだけ追加ファイルを受け取る。

- **最新のユーザー実測**：`E1_COMPACT_REPLAY_REPORT(3).json`（2026-11-01）。保存済みQwen3:14Bの住宅・花屋・研究施設が真正B143 SOURCE **3/3**、STRICT_USER_ATTESTEDのMinecraft Education用研究外殻MakeCode **3/3**、HOST派生の実ガラス窓付きSOURCE **3/3**（住宅3、花屋3、研究施設2＝**計8窓**）。Qwen再要求0、元原文の書換0、WorldContacts/WorldWrites 0。窓付きのMakeCode研究出力も3棟とも`OFFLINE_RESEARCH_ONLY`だが、施工許可や実行済みを意味しない。
- 外殻研究パケット：住宅2140ボクセル/47直方体（26×12×29）、花屋1802/45（25×10×33）、研究施設1400/42（16×12×30）。モデルは用途・部屋関係・外形種類を決定。ホストが実寸・配置と**窓の位置/寸法**を決定し、作者を区別。花屋は保存済み同一原文の配置探索27候補目で成立（希望方角2か所を変更）。研究施設は2候補目（1か所変更）。SOURCEのSHAとモデル原文は保護。
- **ユーザー提供2視点スクリーンショットの美術所見**：3棟とも非矩形などの差はあるが、外観は直方体の集合に近く、住宅/花屋/研究施設の機能と建築表現の個性が十分には読み取れない。現時点の目標建築品質には未達（**ART HOLD、暫定的にはREJECT寄り**）。画像は基本外殻ビューであり、ホスト派生窓付き外観の十分な複数視点審査ではない。窓付き生成が成功しても美術PASSではない。
- **実施工は未達**：今回の3棟のMinecraft実設置、入口から各室への実歩行・利用、内装・家具、外観の美術承認、採光の実測は未実施。9 BLOCKED/BuildPlan空/NOT_PREPAREDの安全デフォルトを維持。AIモデル実行と安全な試験ワールド施工はユーザーが包括許可済みだが、技術的なワールド識別・バックアップ・場所/範囲保護・復元・明示した実行手順が整うまで書込禁止。
- **GitHub正本**：`ryomashibaba/MinecraftAIBuilder`、`feature/b198zr1-protected-architectural-revision`、Draft PR #128（Open）。現行コードは`source/ai/r190-compact-program.mjs`、`source/ai/r190-compact-daylight.mjs`、`scripts/r190-compact-program-study.mjs`、`source/ai/r125-education-makecode-export.mjs`。`--replay-latest` は再推論なしで保存済み原文を検証し、既存外殻・窓付き別案・研究用MakeCodeを出力し結果フォルダをエクスプローラーで自動表示する。main／凍結原本／旧ワールドは変更しない。
- **直近優先工程**：テスト増殖や3/3 SOURCE達成の繰返しでなく、(1) 窓付き真正3Dを複数視点で人間が美術審査、(2) 入口・内装・各室アクセスを共通IR/実3Dで実用化し、(3) バックアップ済みの明示されたEducation試験ワールドで1棟を限定施工して実際に歩く。続いて他2用途とMac 8GB/2B級の実モデルを検証。特定の建築を人手テンプレートに固定しない。
- **GitHub CIの区別**：現在HEAD・チェック名・日時を毎回再確認。2026-11-01のコード段階ではR190-AC 141件PASS等のオフライン検証あり。ただし統合CIには失敗/キャンセル/待機もあり、全CI成功でも建築美術・実ワールド施工の認証でもない。最新実測や未実行を推測で上書きしない。


## 2026-11-01 R190実Qwen 3用途SOURCE 3/3 → R125教育版の外殻研究出力を接続

- **実モデルの確認済み範囲**：ユーザー提出 `E1_COMPACT_REPLAY_REPORT(1).json` では、保存済みQwen3:14Bの住宅・花屋・研究施設がSOURCE 3/3。原文再推論0回・世界書込0回。花屋は27候補目で成立し、モデルの希望した隣接方向2箇所をホストが変更（記録済）。**外観ART、窓、室内、Minecraft実歩行・施工は未認証**。
- **新しい共通経路**：`scripts/r190-compact-program-study.mjs --replay-latest` は原文SHAを検査して真正SOURCE再生に成功した場合、従来の `source/ai/r125-education-makecode-export.mjs` を使用し、厳格な実機確認済み素材とボクセル実占有範囲への座標平行移動でMinecraft Education用**研究外殻**を作成する。80×80などのB143設計キャンバス全体を無駄に施工前点検しない。原本と既存SOURCE/geometry SHAは保持する。
- 出力先は各用途の `EDUCATION_SHELL_RESEARCH_ONLY/`。未対応素材・40000体積・20000ボクセル等の出口制限は**個別HOLD**、SOURCE PASSを変更しない。作成コードは`mabset/mabbuild/mabverify` の明示的人間操作を要する。**プログラムはワールド識別・事前バックアップ・復元を自動保証しない**。試験ワールドのバックアップ・周辺安全確認前の実行は禁止。本番や完成建築の認定なし。
- GitHub R190-ACのオフラインCIは新しい厳格B143施工用境界を含み **139件成功・0失敗**（実Qwenモデル/実ワールド実行を含まない）。R55既存CIの失敗は未解消、他の総合QAは当時待機中。PR #128 Open/Draft、main保護。
- **次工程**：保存済み実Qwen3棟の新しいオフライン外殻レポートを読み、実モデル由来の材質/寸法での出口成立数を実測。3棟の外観を真正3D複数視点で目視美術審査し、窓・室内を共有コンパイラの意味設計として確立。その後、識別済みバックアップ試験ワールドへの限定施工と入口/各室の実歩行を別判定する。個別用途向けテンプレート化、追加モデルの無制限再推論、無断World書込をしない。

---

## 2026-11-01 `iron_block` 実機成功 → metal素材の安全登録

ユーザーがMinecraft Education v26.33の試験ワールドスクリーンショットを提供。MakeCode短縮コマンド `mb` に対して `PROBE MATCH: iron_block` と実際に設置された鉄ブロックが視認できる。登録するのは `metal → iron_block` の**既定ブロック表現**。モデルが特定の鉄素材を指名したわけではなく、外装 `screen` を鉄ブロックで表現するだけで意匠/見通し/通行を保証しない。これまでと同様、モデル作成元のArchitecturePlanは未変更。先の `white_concrete` 登録に続き、`wood/stone/concrete/metal/glass` で構成される生成物を厳格素材パレットのもとで出力可能にする。

既存R125自由建築ランナーから**モデル呼出ゼロ**の保存済みプランを実コンパイルする回帰テスト：metal屋根と、モデル意図 `expression.facadeLanguage=screen` の外装金属スクリーンを含む平屋店舗。SOURCE入口→両部屋と素材数/出力ハッシュを独立に確認。ただしCIは合成のテストプランであり**ユーザー自身の10/24 933ボクセル原本の実コンパイル、Minecraft実施工・室内歩行、ART審査の成功は未確認**。未検証accentは引き続きHOLD。テスト用のworldWrites0、9 BLOCKED、NOT_PREPAREDと人間承認境界は維持。

**次の実験**：独立Windowsクローンを安全に最新化した上で、既存 `C:\\Users\\ryoma\\Projects\\MinecraftAIBuilder\\r125-multiuse-20261024-233958\\entry-shop\\ARCHITECTURE_PLAN.json` を `--plan` から直接再出力、SOURCE_ROUTE_CANDIDATE、各実証素材の内訳、SHA一致を確認。元原本と既存ワールドは自動書込なし。合格後は新しいバックアップ済み試験ワールドの安全な空き領域でのみMakeCodeの `mabset` / `mabbuild` / `mabverify` を人間が実行し、入口/売場/バックヤードの通行を観察する。main不変更、PR Draft継続。

---

## 2026-11-01 `mb` 実機初回エラー修正：stone_bricks未認識

ユーザー実機スクリーンショットで8素材バッチの `mb` 実行時に `stone_bricks` が「このブロックはわかりません」と表示され、既存バッチは `MB HOLD: AIR/invalid at stone_bricks; zero writes` で正常に施工前停止。**8候補中、他7件も未検証**。これを全候補失敗扱いにせず、未知名がAIRへ解決される場合はその候補だけ `MB SKIP invalid/AIR`、残る候補の照合を続行する。全ての対象地点の空き/支持床は先に確認する。全て無効ならzero writes、重複IDもSKIP（同じブロックの別名かもしれず採用しない）。`blocks.blockByName` 自体の例外は全対象の名前解決段階で書込0のまま停止。MakeCodeの例外捕捉・ブロックID補正は実施しない。

既知の未認識 `stone_bricks` は、Bedrock系旧別名 `stonebrick` に変更して**あくまで新規試験候補**とする。公式MakeCode文書は `blockByName` がゲームのコード名を使うと記載するが、端末/版での受理は個別実機証拠優先。`stonebrick` の実機成功はまだ確認されていない。`white_concrete` の既存ユーザー画面検証成功は維持。既存の建築原本/PR Draft/main/安全境界を変えない。

---

## 2026-11-01 Minecraft Education: white_concrete実機証拠・8候補一括素材試験

ユーザー実機画像でMakeCode `mabprobe` → `PROBE MATCH: white_concrete` と白いコンクリート1ブロックの現物を確認。厳格素材パレットに `concrete → white_concrete` を**白色をホスト既定とした色選択**と区別して追加。AI原設計の `roof:'concrete'` 自体は変更しない。既存 `stone,glass,oak_planks` の素材契約を維持。

効率化：既存 `scripts/r125-material-probe.mjs` に単発コマンドの短縮形 `mb` と、一括 `--batch` を実装。定数の未検証8素材（灰／薄灰／黒／赤／青コンクリート、トウヒ・シラカバ板、石レンガ）を等間隔で最大8点だけ検査。チャット1回 `mb` は全地点の空気/支持床と全ブロック名を*先に*検査し、未検証IDで初期化失敗してもそれ以前に書込なし。成功時もブロック照合＋**人による各素材の見た目確認が必要**。元ワールドへの施工不可、バックアップ済み空試験ワールドコピーのみ、1回限り、自動再試行なし。バッチ各候補は現物確認までパレットに自動追加しない。既存 `--block` と旧 `mabprobe` も継続。

次：既存実Qwen店舗`entry-shop`保存済み設計を再推論0で再コンパイル。入室SOURCEは検証済みだが、現Minecraft歩行は未検証。MakeCode施工は必ず新しい保護済み試験ワールドで行い、原本・main・PR #128 Draftを維持。

---

## 最優先：R125実用化ルートへ再集中（2026-11-01 JST）

正式方針は `docs/PROJECT_STRATEGY_V2_JA.md` の最短縦貫。E2実モデルの直接B143 3試験は全件SOURCE_HOLDなので**主工程から凍結・研究へ移した**。E2原文、実失敗証拠、各独立診断を保護し、再推論や新しい中間言語の開発をデフォルトにしない。

今回の実装：既存R125の `auditArchitecturePlanCirculation` と `auditR125SourceRoutes` を日本語依頼・保存済みArchitecturePlanのMakeCode出力前に接続。X軸二分割の入口中央が仕切りに重なる旧R125幾何問題に対して、新しいMakeCode輸出のみ `entrancePlacement:'source-accessible'` を明示的に選び、AI自身のsplitAxisから右区画の実玄関を決定する。既存 `compileArchitecturePlan(plan)` デフォルトの生成幾何・旧SOURCE SHAは不変。 `SOURCE_WALKABILITY_REVIEW.json` が生成され、どちらかHOLDならMakeCodeを生成しない。既存の検証済Education素材パレット（石・glass・ユーザー実証済oak_planks）、source SHA、原本、実ワールド書込0を維持。**SOURCE通路候補と実際のMinecraft歩行は別判定**。

直近の次工程は既存花屋の保存済みArchitecturePlanを**再推論0回**でR125に再投入してSOURCE歩行監査・検証済素材・MakeCodeを確かめ、元ワールドと混ぜずにバックアップ済み試験世界で入口/売場/作業室の歩行を確認すること。保存原本のパスが判明しなければ無断で別設計を作らない。次に住宅/研究施設で汎用性を確認、必要に応じて本物の外観品質を改良する。リアルな施工・歩行の新実績は今回未取得。PR #128 Draft、main保護。

---

## E1比較ビュー拡張（2026-10-31 JST、実モデル未実行）

3件一括結果のHTMLを追加（`E1_REVIEW.html`）。用途別の真正3Dビューアを同時に表示し、原本・幾何・最終占有形状SHA、失敗理由を比較。これは機械美術認定ではなく人間が作品の品質を審査するためのローカル閲覧物。HTMLは外部通信なし・診断文字列をescape。旧単件生成や試験ワールドには触れない。

---

## E1：3用途の一括ローカルQwen比較（2026-10-31 JST、実推論は未実行）

`RUN_R125_FREE_BUILD.cmd study-three` または `node scripts/r125-r190-free-engine.mjs --study-three` を追加。同じR190/既存B143/検証済パレットと現行Ollama単一POST経路で、モダン住宅・花屋・小研究施設の固定した異なる日本語依頼を1件ずつ生成し、回答原文・個別真正3D/MakeCode・SHAと一括比較レポートを保存する。ソース立体構成の差は定量代理であり、美術審査の代替ではない。ローカルモデル不存在時は後続要求をSKIPし、捏造原文・偽PASSなし。実推論・実ワールド施工・人間美術評価は今回まだ実施していない。新規テストは合成モック専用。既存R125単件入口と安全境界、PR Draft、mainを維持。

---

## S0→S1：R190の複数区画屋根断面（2026-10-31 JST、実モデル未検証）

既存R190自由生成経路で、従来の一つの`roofFormIntent`を維持しながら、モデルが異なる最大2区画に独立した屋根断面を指定できる`roofFormIntents`を追加。真正B143の実屋根高さ・上部空気・端部封止を区画別に監査する。断面を単なる装飾部品へ変換しない。旧単数/新複数の同時入力、同一区画重複、屋根の物理的不成立はHOLD。合成素材/設計の回帰テストを追加し、実Qwen3:14Bの新規POST・美術採用・Minecraft実施工は未実施。実CI結果は確認まで未認定。main、凍結原本、PR Draftは変更しない。

---

## S0→S1：R190汎用マス構成の既存R125自由施工入口への接続（2026-10-31 JST）

単純な矩形二分割を繰り返すR125の主形状表現を拡張するため、既存R190の意味空間生成器 `r190-semantic-massing.mjs` を**既存自由建築入口のオプトインモード**として接続した。独立コード `scripts/r125-r190-free-engine.mjs` は、`node scripts/r125-free-build.mjs --engine r190 --prompt "日本語の自由建築依頼"` または保存済みR190設計の `--engine r190 --plan <ファイル>` で選択できる。既存`r125`モードは既定として保護し、古いQwen原本・B143凍結原本は変えない。

R190にはモデル指定の複数用途空間、異なる寸法・高さ、接続する実体積、明示的窓、任意の屋根断面等を表す能力があり、作者の意図をホストが用途固定テンプレートに変換しない。B143の実ボクセル・ソース経路監査・既存Education exporter・実機検証済み素材パレットを共用。未対応素材/モデル指定窓なし/動線不成立/上限超過は**HOLD**、石への暗黙の代用はない。新モデルリクエスト全文、原応答、SHA、ソース、MakeCode、3Dレビューを別々に保存。新たなMinecraftへの自動書込なし、旧`mabbuild/mabverify`の手動・試験ワールド安全契約を維持。

実装コミットには独立合成テストと、既存`r190ac-offline-source-review.yml`へ追加したR125/R190回帰が含まれる。[CI対象Run #41186896014](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41186896014) は本記録時点で**queued／結果未確認**。**モデル実Qwen/Gemma新規POST0、自由建築の実機施工0、C美術NOT_REVIEWED、D実歩行NOT_TESTED、Eモデル汎用性NOT_TESTED**。古いR190合成テストから本物のモデル成功を主張しない。

**次**：新CI結果を見て必要なら修正 → Qwen3:14Bで異なる3用途（優先1件はモダン建築）を1回ずつ実推論して元回答を保護 → 実3Dの主形状/入口/室内経路を比較 → 採用候補1件を新規バックアップ済み試験世界へ施工・美術/用途を人間評価。数値TECH PASSをART・実Minecraft PASSに昇格させない。

---

## R190-CD 初回CI完了・BO/BN接続まで実装（2026-10-31 JST）

初回[Actions #41078728011](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41078728011)はWindows／Ubuntu**両SUCCESS**（Node合成6/6、CC凍結2案真正voxelを再生成して負例品質判定、Python独立再集計PASS）。CC A68,921/B81,204ボクセルは不採用のまま、外部入口が未指定、保守的経路での到達認定0、CB旧作者ルート84上昇段が保守的な上下移動基準と不一致、天空レストラン床+空気8.9%。**CDの技術成功は「失敗作を勝手に成功扱いせず見抜く」こと。美術・用途・実MC歩行をPASSにしない**。

CDの追加実装で真正BN/BOから同じ審査器に渡す`r190cd-bn-adapter.mjs`、2つの合成BN原本（上下展示/閲覧・横長コンコース）を使う回帰テスト、`r190cd-offline-raw-review.mjs`一括実行（保存済みsource+任意元依頼・通信0・原文固定・無効はHOLD＆偽3Dなし）を追加。B143本来の幾何SHAはdesign+voxels、CCはvoxels単体という差を保持して厳格照合。床y=0を含め、BNモデル指定の空間・入口・用途をホストが補正・推定しない。**追加統合CI #41079857037 は本記録時点でqueued／実行結果未確認**。

この工程は新Qwen/Gemmaの実推論・新3D建築創作・Minecraft施工0。新たなモデル自由設計成功は依然**未実証**。旧BO exact SHA+UUID個別承認nonce契約、B143/BN/BQ/BV旧検査、全凍結原本、main、Draft PR #128維持。NOT_PREPARED／9 BLOCKED／BuildPlan空／worldContacts=worldWrites=0／ART採用0。詳細 `docs/R190CD_INDEPENDENT_INTEGRATED_GATE_JA.md`。

---

## R190-CD 品質ゲート優先へ方針転換（2026-10-31 JST）

R190-CCはWindows/Ubuntu CI限定TECH PASS、A/BともART/現用途REJECTで凍結。R190-CDは新造形器・手作り設計案を追加せず、BO（自由日本語→ローカルモデル）を本来の正規入口として保持したまま、最終SOURCE幾何から**明示入口・外部水平空気接続・2×2足元＆3セル頭上空間・各用途への保守的到達・CB作者経路と保守的移動の差・SHA・ART独立判定**を実測するモデル非依存の厳格品質ゲートを構築。既存CC A/B真正sourceを「不適合を正しく止める負例」として使い、新たなモデルPOST・Minecraft施工・自動建物補修はゼロ。技術CI成功でもART PASS・MC歩行認定はない。**新R190-CDのCI結果は実行まで未確認。** 詳細`docs/R190CD_INDEPENDENT_INTEGRATED_GATE_JA.md`。main・凍結原本保護、Draft PR #128維持、NOT_PREPARED／9 BLOCKED／BuildPlan空／worldContacts/worldWrites=0。

---

## R190-CC 16真正視点・機能不合格（2026-10-30 JST）

[専用Actions #41074911692](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41074911692) Windows/Ubuntu両SUCCESS。真3DブーリアンA68,921/B81,204 voxel、実3D cut A68,135/B99,824、CB凍結267経路支持、16 XML・10独立投影・SHA一致。真正ボクセルの16視点を自ら取得して画像で検証。**ART A/BともREJECT**（Aは傾斜した巨大な塊＋大きな明色翼、Bは膨張した楕円・円弧の寄せ集め）。高層レストラン床＋3セル空気が両案26/292（8.90%）、上層オフィスA99/264、B17/264で**FUNCTION REJECT**。技術PASSは美術・用途合格に昇格しない。

**最重要の反省：巨大壁→巨大板→2塔/太塔→多角塔→有機塊と、表現力の実験が建築の美しさと用途を取り残した。** 次R190-CDは「形状生成器だけ先に作る」を止め、建築の空間プログラム・公共動線・一目で分かる外形を同時に設計し、さらに自由自然文→AI主体設計の正規目標へ接近する。ユーザーの特別承認なしに新たなQwen/Gemma POSTは不可。詳細 `docs/R190CC_FIRST_ART_FUNCTION_AUDIT_JA.md`。

main・全凍結原本保護、Draft PR #128 Open/Draft、NOT_PREPARED/9 BLOCKED/BuildPlan空/worldContacts=worldWrites=0/正式ART採用0/施工禁止。

---

## R190-CC 3Dブーリアン主殻の本格研究（2026-10-30 JST）

前工程CBのWindows/Ubuntu CIは修正後両SUCCESS、46,829voxel・267作者明示アンカー／84上昇は技術限定PASS、ART REJECT。CCでは高さごとの2D八角輪郭を補間する構成をやめ、任意の方位に傾く3D超楕円体（各軸の中心・長さ・回転・指数を作者指定）を立体和集合・立体差集合で組み合わせ、外殻と内部実支持床を生成する新SOURCEを作成。A：SHEARED SKYLIGHT BASIN、B：TIDAL ARCHED RIFT。原BMとCB原本SHAを固定参照、CB階段267位置の実床・頭上空気はそのまま、B143はVIEWER ONLY。2案×8実視点・10投影独立照合・Windows/Ubuntu CIを新設。**CC CI・美術・実機歩行は未判定**、詳細 `docs/R190CC_3D_BOOLEAN_ARCHITECTURE_JA.md`。

設計者ChatGPTの研究SOURCE≠Qwen/Gemma自律生成。技術成功を美術合格に昇格禁止。main・旧原本不変、Draft PR #128維持、NOT_PREPARED/9 BLOCKED/BuildPlan空/世界接触・書込0、モデルPOST0、施工禁止。

---

## R190-CB 技術進捗・真正8方向美術不採用（2026-10-30 JST）

**SOURCEルート技術限定**：最初の[CI #41067774403](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41067774403)ではSOURCEテスト5/5成功／既存B143 VIEWER安全契約`worldCoordinates:null`欠落でワークフロー失敗。必須安全条件を緩めずにCB側を修正し、契約回帰テストを追加。修正[CI #41068043088](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41068043088)は**Ubuntu 6/6＋独立最終ボクセル経路・8SVG/5投影・SHA監査PASS**、Windows結果は未確認（逐次再確認すること）。作者明示267アンカー／84上昇／最終46,829真正ボクセル、原本SHA `041ac8905c697cb3eb347f8af3300d1ab470657edb8c841944eafdab7e8df353`、幾何SHA `28f4a93fa6dfeb4753375af0b9af68cdba8d9f1113e91096e9f3a41fb287ebdd`。

**ART：REJECT、正式採用0**。初回の失敗CIの保存済み真正ボクセルから別プロセスで再作画した8方向を実見。全体は単純な先細りの帯付き高層体に留まり、東西側面の主殻反復、天空の空洞・クラウンの造形が弱い。細部装飾で延命せず、次CCでは規則的な多角柱補間への美術依存を捨て、主構成そのものを刷新。カメラ内空洞画像は視認不能のため美術根拠にしない。

**FUNCTION/REAL MC/構造：HOLD**。作者指定の2×2床・3空気セルは全267地点で実セル上成立したが、上昇2セル水平の代理経路であり実Minecraft移動や地上入口・各室枝動線・落下安全・施工を認定しない。**詳細：`docs/R190CB_FIRST_ART_AUDIT_JA.md`**。

旧原本とmain保護、Draft PR #128維持、NOT_PREPARED／9 BLOCKED／BuildPlan空／worldContacts=worldWrites=0／モデルPOST0／Minecraft施工禁止。技術CIが通っても美術REJECTを覆さない。

---

## R190-CB 真正3Dと作者明示階段の一体造形研究（2026-10-30 JST）

CA真正動線監査CI #41063515673はWindows／Ubuntu全工程SUCCESS（CAはART・FUNCTIONともREJECT維持）。これを受け、CB研究原本「RIFT LANTERN」を新規作成。ねじれた非対称の一体主塔＋切除公共空洞＋オフセット上部レストラン、6用途領域、作者明示267経路アンカー（84ブロック上昇）を**独立CB SOURCE**に入力。CA compiler依存による幾何とCBが作者明示の足元2×2・頭上3空気セルを生成し、別Pythonで真正ボクセル・SHA・実画像5投影を照合する。型式は未拡張のB143 VIEWER ONLY、モデル自由設計・実施工なし。**CB CI・美術・実移動は未認証**。詳細 `docs/R190CB_ARCHITECTURAL_CIRCULATION_JA.md`。

凍結BM/BY/BZ/CA原本、main無変更。Draft PR #128維持。NOT_PREPARED／9 BLOCKED／BuildPlan空／worldContacts=worldWrites=0／ART正式採用0。

---

## R190-CA 第一次真正3D審査・独立経路監査（2026-10-30 JST）

**技術限定PASS**：CA専用CI [#41060853546](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41060853546) Windows/Ubuntu両SUCCESS。実ボクセルA62,565/B45,568、立体切除A9,518/B11,342。修正版BZ CIも両OS SUCCESS。

**ART：A/BともREJECT**。取得した16視点画像を真正SOURCEから確認。Aは凡庸な平行2塔、Bは段状の太塔へ退行。内部支持床は確かに実在するものの、美術品質を最優先に再設計。

**FUNCTION：現CA両案REJECT**。Bは最上層付近のオフィス候補238/238セルで頭上空間が遮蔽、別途独立して計算した2×2足元＋3空気セルの代理経路では第一公共ホールから他の上層機能に到達0。これは真Minecraft歩行合格の反証としては代理検査であり、モデルの特性・未実装階段/梯子等による限界を明示する。新しい独立経路監査`scripts/r190ca-navigation-audit.py`はSOURCEを変えずCI証拠を増強する。今回追加のCI再実行結果は未検証として扱う。

**全根拠と次工程のCB設計契約：`docs/R190CA_FIRST_ART_FUNCTION_REVIEW_JA.md`**。旧原本・main無変更、Draft PR #128維持、正式ART採用0、実Qwen/Gemma新POST0、NOT_PREPARED／9 BLOCKED／BuildPlan空／worldContacts=worldWrites=0、Minecraft施工禁止。

---

## R190-CA 新規実制作の起点（2026-10-30 JST）

BZの初期SOURCE限定技術PASS（実行版）、A/BともART REJECT（巨大板・折り紙状集合）を踏まえ、CAでは使用可能な内部容積を意図して不規則な複数の実建築体積・作者指定水平床・立体的な公共空洞の同時設計へ変更。固定用途テンプレート・BOX後付け・装飾延命ではない。独立形式の研究サンプルであり、実Qwen/Gemma回答は含まない。

CAに2独立原本（STRATIFIED CIVIC RIFT/ASCENDING PUBLIC ATRIUM）、決定論的source compiler、8真正視点、用途床+3セル空気の実測、独立Python投影/SHA/用途監査とWindows/Ubuntuの新専用CIを追加予定。**当該CAのCI・美術/機能/構造の判定は未認証。** BZ修正版CIも確認できるまでは未認証。詳細 `docs/R190CA_SPACE_MASS_RESEARCH_JA.md`。

`main`/旧原本保護、Draft PR #128 Open/Draft、NOT_PREPARED/9 BLOCKED、BuildPlan空、worldContacts/worldWrites0、Qwen/Gemma新実POSTなし。CI成功数は美術向上ではない。

---

## R190-BZ 第一次最終美術審査・証拠品質修正（2026-10-30 JST）

**正式判定：初期SOURCE技術限定PASS、A/BともART REJECT、全体ART HOLD、正式採用0。**
初期専用CI [#41051881586](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41051881586) はWindows/Ubuntu各7/7成功、A 44,089/B 50,872真正ボクセル・保護空洞侵入0。実ボクセル8視点を取得して検査すると、初期ORTHO SVG10個のXML構文エラーと東西投影軸の誤りが判明。修正済みソースと独立XML／ボクセル投影照合器・回帰テストをGitHubへ保存。**修正後CIは別途確認が必要**。

真正形状から独立再投影して視覚審査：Aは三段の巨大帆板、Bは斜めの巨大折り板の集合となり、都市高層建築としての連続した建築体験に不足。Aは6近傍1成分/Bは2成分だが、いずれも建築的まとまり・公共空間・実在オフィス・レストラン・上下動線が未成立。新形式によりBYの全高連続側壁は縮小したものの、美術的成功ではない。B143・BY・旧原本・mainは無改変、施工禁止／NOT_PREPARED／9 BLOCKED、実Qwen/Gemma新送信なし。

**詳細正本：`docs/R190BZ_FIRST_ART_AND_EVIDENCE_AUDIT_JA.md`**。次はCIの修正確認と、板断片の追加・リボン装飾ではなく、建築の中身・主殻・公共空洞・都市入口を一体構成した根本設計へ進む。CI連鎖を減らすため複数変更を極力一括コミットする。

---

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
