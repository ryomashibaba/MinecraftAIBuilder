# MinecraftAIBuilder — START HERE（新チャット・AI開発者の統一入口）

**2026-11-02 JST 更新。長文プロンプト・ZIP交換なしで、GitHub正本を読み込んで既存開発を継続する。**

> **最初に行うこと**：このファイル → [完全統合引き継ぎ](docs/MINECRAFT_AI_BUILDER_COMPLETE_HANDOFF_20261102_JA.md) → [固定憲章](docs/AI_PROJECT_CHARTER_JA.md) → [正式戦略](docs/PROJECT_STRATEGY_V2_JA.md) → [最短MVP](docs/R125_THIN_VERTICAL_SLICE_PLAN_JA.md) → [時系列の詳細な研究・失敗記録](docs/AI_RESTART_JA.md) を読む。指示の優先順位は「ユーザーの最新指示／固定憲章と戦略 ＞ 実コードと実CI ＞ 履歴文書の過去時点の記述」。

## 1. GitHubの正本と保護境界

- Repository: `ryomashibaba/MinecraftAIBuilder`、研究ブランチ `feature/b198zr1-protected-architectural-revision`。
- Draft PR [#128](https://github.com/ryomashibaba/MinecraftAIBuilder/pull/128) を **Open / Draft / Unmerged** のまま継続。**main変更、PR Ready/Close/Merge、force push、凍結原本の上書きは禁止**。
- この文書を書き込む直前の研究HEAD: `cf970b9a4bc49e0f2cdce4cf82bdabcfbcb10d3e`。**このSHAを「永久の最新」と見なさず、各チャット開始時にGitHubの現在HEAD・差分・CI・PRを再取得**。
- 研究ブランチへの通常のコード保存は許可されている。既存CI・保存済み証拠・B143基盤を再利用し、新規作り直しはしない。

## 2. 何を完成させるプロジェクトか

**未知の日本語等の自然言語指示 → ローカルQwen/Gemmaが用途・空間・動線・意匠を自主設計 → 短い意味IR（ArchitecturePlan等） → B143の実3Dボクセル → SOURCE・3D・美術の別々の審査 → バックアップしたMinecraft Education試験ワールドで施工 → 人が入口・室内・階段を実際に歩いて検証。**

初期実証は **小二階建て住宅／入口付き店舗／小研究施設** の異なる3用途。特定建物のラベル替え、箱の装飾、形だけの階段・空洞、固定テンプレートを禁止。大規模な将来構想より、動く**最小の縦貫成果**を先に作る。基本モードは将来 **8GB Apple Silicon Mac + 2B級4bit** を目標とし、大規模27Bモデルへの必須依存を避ける。

## 3. 今の真の状態と最優先工程

- 2026-11-02の `cf970b9a` で `scripts/r125-semantic-pilot.mjs` に **モデル自身が選んだ ridge/sawtooth 屋根の raised 実高天井**をSOURCE監査する機能を追加。プロンプトで要求した屋根の不一致はHOLD。**公開CIはTEST DOUBLE、まだこの新機能の実Qwen推論PASSではない**。
- 確認済みCI: R125 run [41438390065](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41438390065) **12/12 PASS**、Education-first run [41438398935](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41438398935) **SUCCESS**。CI外の美術・Minecraft実歩行・汎用AI品質は別。
- 3用途の **HOST派生合成** raised sawtooth では屋根板下の新たな実空気セル 住宅400／店舗252／研究施設374、2幅上部空間候補 76／51／63。実Qwenが3棟を新規設計した数字ではない。
- **ユーザーは帰宅し、2026-11-02現在 Windows PC を操作可能**。以前の「外出中のためローカル操作不可」は解除。ただしChatGPTが勝手にPCへアクセスできるわけではない。ローカルWork/Computer Use は別途ユーザーの事前承認が必要。
- **次の一手**：既存Qwen3:14B + Ollamaの実動作と、ローカルGit作業木を読み取りで確認。問題がなければ既存 `r125-semantic-pilot.mjs` で **1件の本物の短いモデル応答**を保存し、要求した屋根・入口・機能室・SOURCE床動線・元応答・真のB143を検証。失敗は元回答のままHOLD。過去の保存済み花屋の世界内歩行/既存MakeCode経路を優先的に再利用し、異なる残り2用途へ展開。無目的な追加CI/IRは増やさない。

## 4. 安全・出所・履歴

- Qwen/Gemmaローカル推論および**識別・バックアップ・復元・範囲/材/経路/停止**の技術ゲートをすべて満たす隔離済みEducation試験ワールドへの施工は、2026-10-24以降の包括許可内。技術条件未達なら `NOT_PREPARED`、`9 BLOCKED`、`BuildPlan.operations=[]`、`WorldWrites=0` を維持。
- A: SOURCE/CI、B: 真正3D、C: 人間ART、D: Minecraft実機・歩行、E: 実モデル独創性を必ず分離。偽の「モデル生成」「歩いた」「施工済み」を禁止。公開GitHubに未公開のユーザーQwen原本・個人データを追加しない。
- R190/E1/E2の試行、実際の花屋試験施工・素材制約、幾何・動線・屋根の失敗、採否は[完全引き継ぎ](docs/MINECRAFT_AI_BUILDER_COMPLETE_HANDOFF_20261102_JA.md)と[全履歴](docs/AI_RESTART_JA.md)を参照。**既存の本物の成果があるのに、新規の模擬実装へ逃げない**。

## 5. 新チャットで送る一文

> MinecraftAIBuilderをGitHubの研究ブランチのルート `START_HERE.md` から完全に引き継ぎ、リンク先の固定憲章・戦略・完全統合引き継ぎ・AI_RESTARTを読んでください。現在HEAD／PR #128／CIを実照合し、固定方針・原本保護・安全契約を維持してください。私は今PCを使えます。**実Qwen→実B143→Educationの最短縦貫**を優先し、必要なら最小限のPowerShell操作を1回にまとめて案内し、実装・テスト・研究ブランチ保存まで続けてください。長文やZIPを再要求しないでください。
