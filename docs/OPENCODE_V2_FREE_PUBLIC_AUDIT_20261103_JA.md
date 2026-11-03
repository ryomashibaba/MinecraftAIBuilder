# MinecraftAIBuilder — 無料クラウドモデルの初回実証ゲート（2026-11-03）

## 事前検査の実測
- WindowsユーザーPCの従来CLIは `1.19.0`（OpenCode V1）。V1を保持したまま `@opencode/cli` V2を `%LOCALAPPDATA%/MinecraftAIBuilder/OpenCodeV2Pilot/cli/` に並行導入した。
- ユーザー実測：`READY_READONLY_NO_MODEL_INFERENCE`、`model_requests=0`、試験コピー `trial_9gqdhsuk`。これはV2起動確認と静的安全設定合格であって、モデルの利用権限・アカウント料金・実推論品質のPASSではない。
- 次は `scripts/opencode-v2-free-public-audit.py`。既存成功した隔離コピーを**読み取り専用**で扱い、新規の別ディレクトリで候補のカタログと任意の公開資料モデル試験を実行する。通常開発HEADやmain、旧凍結原本、Draft PR #128は不変更。

## 公開料金（公式で2026-11-03確認）
OpenCode公式 https://opencode.ai/v2/docs/console/models は、`glm-5.3-flash-free`、`deepseek-v4.1-flash-free` 等の **Freeモデルを期間限定の入出力0ドル**と表示。普通の `glm-5.3-flash` と `deepseek-v4.1-flash` は有料の**別モデル**であり混同禁止。モデルの実アカウント利用資格、無料枠残量、課金画面、提供終了日時はここからは確定できない。
無料モデルの一般可用性は OpenCode V2へ接続したアカウントによる。サインインなしでは`opencode` providerが表示されないことがある：https://opencode.ai/v2/docs/models/ 。
**カード登録・有料APIキー・自動リチャージ・Go契約はこの試験の条件ではない。** 0円で使えない場合はHOLDとして通常開発を止めない。

## 試験器の使用
- `--receipt <path>`：前工程の `MAB_OPENCODE_PREFLIGHT_RESULT.json` を渡す。
- `--self-test`：通信・モデル呼出・PCの既存ファイル変更なしの静的テスト。
- 省略時：`opencode models` で指定無料モデルが利用可能な候補として見えるか確認。**実推論は0回**。
- `--run`：無料モデルIDがCLI一覧にあった場合のみ、`AGENTS.md`、`START_HERE.md` とV4D文書の**公開GitHubスナップショット中の短い抜粋だけ**を、明示した `opencode/glm-5.3-flash-free` に渡し回答をローカルへ保存。モデル指定は固定・他provider利用をdeny・全ツールdeny・1CLI実行・agent steps=1・制限時間180s。自動有料モデルfallback・ファイル変更・Minecraft世界書込・旧PC設定変更は禁止。
- モデルへのAPI HTTP要求が実際に何件に分割されたかはアプリの内部処理によるため `actual_provider_http_requests=NOT_OBSERVED` とする。例：タイトル生成で追加のリクエストがあり得る。**モデル結果を受信しても本当の課金額は推定だけでは断言しない。**
- `FREE_PUBLIC_MODEL_AUDIT_RESULT.json` が共有用。生の回答 `MODEL_RESPONSE_PRIVATE.txt` はローカルのみ保存しGitHub自動送信なし。ユーザーが内容を目視確認してから共有可能。
- `FREE_MODEL_NOT_AVAILABLE_IN_CURRENT_ACCOUNT` は、**選択モデルがカタログに見えなかった**という意味であり、アカウント解約やOpenCode自体の失敗を意味しない。
- `MODEL_RESPONSE_RECORDED_NEEDS_INDEPENDENT_REVIEW` でも**品質未認定**。内容をChatGPT側で正本と照合し、間違い・見落とし・タスク特定能力を評価。真のSOURCE/ART/実Education改善は次工程。
- 調査中の本物の PRIVATE Qwen原文、ユーザーのローカルプロジェクト、Minecraft世界ファイルは一切送信しない。

## 2026-11-03：初回実GLM起動失敗の保存・再実行禁止診断
- ユーザーPC初回実測：`MODEL_LISTED_NO_INFERENCE`／`FREE_MODEL_RUN_FAILED_OR_UNAVAILABLE`／`opencode/glm-5.3-flash-free`／`catalog_model_listed=true`／`model_run_invocations=1`。実HTTP要求数と課金結果は不明、正常なモデル回答は未取得。**`MODEL_LISTED_NO_INFERENCE` は失敗時に残った古い状態値であり、実推論0回を意味しない。**
- 原因不明：旧コードは stderr とCLI終了コードを記録していなかった。認証、使用枠、OpenCode設定、CLIエラー、ネットワーク等のどれかはまだ確定していない。
- 公式OpenCode CLI V2の `run --standalone`、`--archived`、`--agent`、`--model`、`--file` はドキュメントに存在するが、各PCの実行時認証・設定まで保証しない。
- `scripts/opencode-v2-failure-diagnostic.py` を追加。以前のPRIVATE回答文字列を共有せず固定カテゴリに分類し、`run --help` と `--version` を照合。**新規モデル呼出0、Git変更0、Minecraft変更0**。過去に保存していない stderr を復元したと偽装しない。
- `scripts/opencode-v2-free-public-audit.py` の再発防止として、モデル実行開始時に状態を `HOLD` に落とし、CLI戻り値と stderr の**固定カテゴリ・長さ・ハッシュだけ**を新レシートへ保存するよう修正した。原文 stderr や資格情報は共有禁止。
- 優先は事後診断→原因の切り分け。**同一失敗を無闇に再試行しない**。無料のまま正常動作・課金0の根拠が取れない場合はOpenCodeを主経路に採用しない。旧main、通常研究、Draft PR #128、Qwen PRIVATE、Education成功経路は保持する。

## 2026-11-03 最終トリアージ：追加モデル実行はHOLD、通常開発優先
- ユーザーが共有した二回目の実行レシート：`status=HOLD`、`FREE_MODEL_RUN_FAILED_OR_UNAVAILABLE`、`catalog_model_listed=true`、`local_run_flags_supported=true`、`cli_exit_code=1`、`response_chars=0`、`stderr_chars=126`、`cli_failure_category=UNCLASSIFIED_CLI_FAILURE`。ネットワーク実リクエスト数とアカウント請求状態は未観測。
- 本試行のCLIコマンドは合計2回実行済みで、推論の正常回答は0件。**モデルが低性能であるという証拠ではない。**
- さらにユーザーの読み取り専用PC診断：`debug config`終了0、JSONとして解釈可能、`debug agents`終了0、`mab-auditor`検出、`expected_model_configured=false`、以前のログ末尾300行に認証/クォータ両語句有り、設定エラー語句なし。**全体設定 `config.model` の単一項目確認と個別エージェント設定を混同しない**。
- 過去300行ログは対象実行時刻（2026-11-03T14:10:05Z付近）と `run=` IDで相関確認されていない。ログの認証/クォータ語句を今回の失敗原因と断定しない。エラーstderr原文は以前の実行で保存していないため、この証拠から原因特定は不可。
- OpenCode公式の設定仕様：https://opencode.ai/v2/docs/config/ 、Agents：https://opencode.ai/v2/docs/agents/ 、ログrun IDでの追跡：https://opencode.ai/v2/docs/troubleshooting/ 。
- **対応方針：新しいモデル試行、OpenCodeのインストール更新、課金、認証設定の破壊的変更、通常研究ブランチの書込を保留。** この有料API非依存の代替経路は`FREE_PROVIDER_EXECUTION_HOLD`であり主戦力として未認定。
- 事後調査を再開するなら、本人のローカルログを外部へ送らず、当該実行の`run` IDと時刻に一致したエラーカテゴリのみ抽出する。あるいは別途アカウントの無課金接続資格を確認。課金設定変更やログ原文公開を先に要求しない。
- MinecraftAIBuilderのR125安定経路・実教育施工成功・V4Dの既存HOLD・建築美術ゲートの継続開発を最優先し、Browser Ink TPSも通常開発継続。Work事前承認制と全原本保護は不変。
