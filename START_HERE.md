# MinecraftAIBuilder — START HERE（新チャット・AI開発者の統一入口）

**2026-11-02 JST 更新。長文プロンプト・ZIP交換なしで、GitHub正本を読み込んで既存開発を継続する。**

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
- 既存の旧Qwen2620セル原本、失敗証拠、非公開のローカル結果、ユーザーのワールドは不変。開発作業は研究ブランチのみ。毎回現HEAD・CIを再取得する。

## 4. 安全・出所・履歴

- Qwen/Gemmaローカル推論および**識別・バックアップ・復元・範囲/材/経路/停止**の技術ゲートをすべて満たす隔離済みEducation試験ワールドへの施工は、2026-10-24以降の包括許可内。技術条件未達なら `NOT_PREPARED`、`9 BLOCKED`、`BuildPlan.operations=[]`、`WorldWrites=0` を維持。
- A: SOURCE/CI、B: 真正3D、C: 人間ART、D: Minecraft実機・歩行、E: 実モデル独創性を必ず分離。偽の「モデル生成」「歩いた」「施工済み」を禁止。公開GitHubに未公開のユーザーQwen原本・個人データを追加しない。
- R190/E1/E2の試行、実際の花屋試験施工・素材制約、幾何・動線・屋根の失敗、採否は[完全引き継ぎ](docs/MINECRAFT_AI_BUILDER_COMPLETE_HANDOFF_20261102_JA.md)と[全履歴](docs/AI_RESTART_JA.md)を参照。**既存の本物の成果があるのに、新規の模擬実装へ逃げない**。

## 5. 新チャットで送る一文

> MinecraftAIBuilderをGitHubの研究ブランチのルート `START_HERE.md` から完全に引き継ぎ、リンク先の固定憲章・戦略・完全統合引き継ぎ・AI_RESTARTを読んでください。現在HEAD／PR #128／CIを実照合し、固定方針・原本保護・安全契約を維持してください。私は今PCを使えます。**実Qwen→実B143→Educationの最短縦貫**を優先し、必要なら最小限のPowerShell操作を1回にまとめて案内し、実装・テスト・研究ブランチ保存まで続けてください。長文やZIPを再要求しないでください。
