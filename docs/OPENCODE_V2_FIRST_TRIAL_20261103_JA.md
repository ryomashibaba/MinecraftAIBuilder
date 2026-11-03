# MinecraftAIBuilder — OpenCode V2 1回目の隔離・読み取り試験（2026-11-03）

## 状態と意図
- **準備実装のみ**。この作業でOpenCodeのモデルを実行したわけではない。無料クラウド利用可能量、実モデル品質、V4D SOURCE/ART、Education実機は未認定。
- 起点の通常研究HEADは `20f703239b6ecbe43a1d057ff7b9b644fc19ce56`。専用ブランチ `research/opencode-v2-readonly-pilot-20261103` のみに安全契約とプレフライトを追加。
- `main`、通常研究 `feature/b198zr1-protected-architectural-revision`、移行元 `research/opencode-transition-20261103`、Draft PR #128、PRIVATE原文、R125→B143→Education成功経路は変更しない。

## 第一段階：PCで一回のモデルなしプレフライト
- 公式OpenCode **V2** 対応。V1の権限設定とは互換でない。既存PCへ自動インストールしない。
- `scripts/opencode-v2-readonly-preflight.py` は、OpenCode V2 CLIを検出できる場合だけ、**公開GitHubから専用ブランチをLOCALAPPDATAの別ディレクトリへclone**。既存ローカルプロジェクトのgit操作・Minecraft操作は行わない。
- 新しいcloneのみに `opencode.json` を作成。**全プロバイダをdeny**し、外部ディレクトリ・編集・シェル・MCP/プラグイン等をdeny、read/glob/grepだけ許可する。これはOpenCodeのツール制限であってWindows OSレベルのサンドボックスではない。さらに無人モデル起動を許可するものではない。
- 出力 `MAB_OPENCODE_PREFLIGHT_RESULT.json` は最小限の状態コード・公開SHAのみ。鍵、API利用量、PRIVATE出力、モデル文章は自動外部送信しない。
- 受入条件は `READY_READONLY_NO_MODEL_INFERENCE`、`model_requests=0`、`isolated_clone=true`、`opencode_v2_static_policy_written=true`。**これを実モデル試験PASSへ昇格させない**。
- `OPENCODE_NOT_INSTALLED`、`OPENCODE_V2_REQUIRED`、ネットワーク・Git・規約/アカウント未確認の場合はHOLD。

## 使用方法
- 専用ブランチをGitHub上で確認し、公開元から取得したスクリプトを別フォルダに保存して `python scripts/opencode-v2-readonly-preflight.py` を実行可能。ユーザー操作を減らすため、次のチャットではGitHubの**特定コミットとblob SHA照合付きの1回のPowerShellコマンド**を案内する。
- OpenCode V2のインストールが無ければ終了コード2でHOLD。ユーザーの明示判断なしに `npm install -g @opencode/cli` は行わない。OpenCode 1を上書きしない。
- `python scripts/opencode-v2-readonly-preflight.py --self-test` はオフライン静的検査だけでGitHubアクセス・ファイル書込・AI推論をしない。
- 既存のローカル環境が必要なStrata/VALORANTへの干渉なし。ゲーム中は新たな重いGPUジョブを起動しない。

## 第二段階：最初の本物の無料モデル試験（未実施）
- 公式のモデルカタログと利用条件・料金が**その場で0円**と確認でき、アカウント/残量条件を理解した場合に限る。OpenCode Consoleへカードやクレジットを追加することを試験開始条件にしない。
- 明示した1つの無料モデルのみ・1回だけ・無料枠切れならHOLD。モデル自動選択、課金モデルへのfallback、Auto Approval、コード編集、Work、ユーザー本番ファイルへのアクセスを禁止。
- 読み取り試験の課題：`AGENTS.md`、`START_HERE.md`、`docs/R125_V4D_LOCAL_REAL_AUTHOR_BRIDGE_20261103_JA.md`を読ませ、実Qwen1回のSOURCE HOLD、最新のCI 30/30が形式ゲートに限ること、R125実機経路、ART未認定、9 BLOCKED、PRIVATE非送信、次の真の価値ある未解決バグの有無を引用行付きで説明させる。
- 合格なら**別のさらに隔離された作業ブランチ**で実際の不具合1件だけを実装比較。バグが根拠不足ならコード変更0を正答とする。実装→独立テスト→差分審査までを評価し、品質不足モデルは採用しない。
- 共有するのはユーザーが内容を点検した最小限の報告のみ。OpenCodeのセッション、PRIVATE raw、資格情報、PCパスを自動でGitHubに送らない。

## 評価・終了
- 比較指標：正しい事実把握、真の未解決課題の特定率、SOURCE・ART・実Educationを区別できるか、意図しない変更0、ユーザー介入、所要時間、モデル使用量・無料枠の実測、最終品質。
- 移行基盤の整備が通常開発を妨げれば停止し、ChatGPT主体に戻す。OpenCodeの無料モデルは主力と決めつけない。

参照： https://opencode.ai/v2/docs/permissions 、https://opencode.ai/v2/docs/policies 、https://opencode.ai/v2/docs/models 、https://opencode.ai/v2/docs/cli/commands 。
