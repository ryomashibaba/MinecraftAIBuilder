# MinecraftAIBuilder — START HERE（新チャット・AI開発者の統一入口）

**2026-11-02 JST 更新。長文プロンプト・ZIP交換なしで、GitHub正本を読み込んで既存開発を継続する。**

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
