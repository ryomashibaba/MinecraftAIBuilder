# MinecraftAIBuilder — Minecraft Education 実施工MVP最優先（2026-10-31 JST）

上位方針：[AI_PROJECT_CHARTER_JA.md](AI_PROJECT_CHARTER_JA.md)、[PROJECT_STRATEGY_V2_JA.md](PROJECT_STRATEGY_V2_JA.md)。最新Draft PR #128を継続。目的は**自由な希望を受け、見た目が簡易でも一棟をEducation内に実施工する**こと。芸術的品質・多用途反復はその後。

## 現状と正確な区別
- 以前からCode Builder/MakeCodeおよびBridge/WebSocket系の実機施工研究があるが、現在のR190/B143はworldWrites=0、BuildPlan空、9ゲートBLOCKED。実ゲームへ直結できていない。
- Compact ArchitecturePlanから2階1室ずつ・東側直線階段等の限定幾何で**合成**B143ボクセルは生成できる。現時点で本物のQwen→Compact→真正3Dの成功は0。
- 今回のMakeCode exporterは**オフラインのデータ橋**。B143原ソースをSHAで再検証した場合のみ、最終占有を同材料の直方体へ圧縮する。非空外形の実体だけを出し、意図した空洞は埋めない。Minecraft Worldへの接続機能ではない。
- ゲーム内実験は**ユーザー自身が用意したコピー済み平坦試験ワールドで、実行前に明示チャットmabbuild**するまで開始しない。makecode側はworld IDやバックアップを認証できず、手動条件である。既存ワールド・商用/授業用ワールドへの使用は禁止。

## 実験手順（初回はゲーム内実動作未検証）
1. ローカルWindows（Node 24）で安全な既存B143ファイルを用意。既存の確実にcompileDesignできる設計を優先。既存の旧Qwen原文は新しい形式に偽変換しない。
2. `node scripts/r125-export-education-pilot.mjs --design <B143_SOURCE.json> --out <FRESH_LOCAL_OUTPUT_DIR>`。Compact案の場合は `--compact <PLAN.json> --brief <UNALTERED_BRIEF.txt>`。実現不能な設計はHOLD。
3. 出力`EXPORT_REPORT.json`のSHA・予定ブロック数/コマンド数を確認。コピー済みの**平坦/空の試験ワールド**でユーザーがMakeCode JavaScriptを貼り付け、`mabset`で位置を固定。`mabbuild`で全敷地空気と地面支持を検査してからKeep配置。最後に`mabverify`と目視・現物歩行。
4. 初回はMakeCodeのStatic TypeScriptコンパイルの可否、各ブロック名の対応、長時間スキャン所要時間、チャットコマンドの重複/途中停止、置き残しを必ず実測。不具合時はコピー元を復元し、新しいBuild Jobとして再検証。重複施工は厳禁。
5. 実ゲーム成功を記録する場合のみワールドコピー識別子、版、日時、ゲーム画面、コードSHA、模型SHA、置かれた材料/数と目視検査を個別記録。GitHubにユーザーワールド固有位置・秘密・非公開原モデル応答をアップロードしない。

## 安全と既知制限
- MakeCode APIは公式 `blocks.fill(...,FillOperation.Keep)`、`blocks.testForBlock`、`positions.add`、`player.onChat`。当該Minecraft Education版での実動作は未検証。
- 広い建築を早期実現するための一時パレット変換は幾何変更と分離。現状concreteはstoneの代替、その他はblockByNameの実機対応確認待ち。
- 設計ソースが有効でも本来の任意自然言語→B143への入口が未完成。最初のMVPは手元で完成済みのB143設計を使用し、実際のMinecraft内に**一棟出せるか**を最優先する。続いて日本語→短いIR→B143の実Qwen接続に取り組む。
- 既存の安全ゲートを勝手に解除しない。生成済みMakeCodeプログラムは、実際の権限確認済みプレイヤー操作まで「施工済み」ではない。
