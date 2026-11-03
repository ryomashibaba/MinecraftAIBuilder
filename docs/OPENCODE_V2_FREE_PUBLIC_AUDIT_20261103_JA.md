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
