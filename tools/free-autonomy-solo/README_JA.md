# 2026年12月対策：単独プロジェクト長時間自律実行の安全研究

この試作は MinecraftAIBuilder / Browser Ink TPS **どちらか一つ**を同時に担当させるための、外部監督型 `OpenCode` CLI 実行器です。**Strataの正式な代替認定ではなく、OSS/無料クラウド/ローカルLLMの可換な選択肢としての研究実装**です。

## 固定境界

- 両プロジェクト同格。`project` に書いた**一件だけ**を1セッション中ずっと担当。OSの単一ロックで二重実行を拒否。
- `main` 禁止・`research/` 接頭辞必須・リポジトリのGit origin完全照合・専用clone必須。モデル実行後・QA後・push前にGit origin/branch/HEADを再照合し、モデルによる勝手なcommitやremote差替えをHOLD。原本/凍結資料/ `.github` / `.env` は研究対象外。
- 自動の `git commit` は**独立テスト成功後のみ**、pushはコマンドに明示した場合のみ・research branch限定。merge/公開/実世界書込/課金はしない。
- `--model` は明示 `ollama/...` または`opencode/...-free`のみ。モデルを勝手に有料モデルへ切り替えない。無料モデルが継続して呼べるかは別途真正試験。
- CLI実行成功は「真正ローカルモデル認証」ではない。ユニットテスト成功も建築ART/原作忠実度/180秒真正Chrome/実機Minecraft成功ではない。
- 出力ログと再開状態はGitの外側で保存する。モデル応答や元入力が含まれる可能性があるため、ログをそのままGitHubに公開しない。
- **重要：Git cloneだけでは任意のOSコマンド実行を安全に隔離できない。** `OpenCode --auto`は承認待ちを減らすが、シェル権限が強い。現状は実行前に別のOSサンドボックスとネットワーク/ファイル境界が確立していることを要する (`--sandbox-attested`)。このフラグ自体に隔離能力はない。未構築で有効にしないこと。

## プロトタイプの使い方

1. OS隔離済みの**捨てられる独立clone**を作り、既存開発フォルダ・ワールド・原本をマウントしない。`research/`ブランチを使用。Docker/WSL等でのローカルモデル到達・GPU/CPU負荷は実機実証が必要。
2. 下のJSONを Gitリポジトリ**外**に置き、絶対パスを設定。 `tasks` は1セッションで順次こなす複数の開発目的で、1工程ごとにプロジェクトを替えない。任意の `continuous_goal` を併記すると、指定課題終了後も同一プロジェクトで別の意味ある工程を選び、全体の実行時間・サイクル上限まで継続する（上限は安全予算であり品質合格ラインではない）。無変更・独立検証失敗が続けばHOLD。`allowed_prefixes` は対象変更領域に限定する。`checks` は実プロジェクトの独立検査を複数指定する。
3. `python solo_agent.py --config ... --sandbox-attested --push` で実行。`--push` を省略すればローカルコミットまで。`state_dir/state.json` で結果と未認定フラグを確認。

### 設定例：MinecraftAIBuilder

```json
{
  "project": "minecraftaibuilder",
  "sandbox_runtime": "docker",
  "docker": {"network": "bridge", "memory": "6g", "cpus": "2"},
  "network_access_approved": true,
  "workspace": "C:/FreeAutonomyIsolated/MinecraftAIBuilder",
  "branch": "research/free-autonomy-pilot-20261104",
  "model": "ollama/qwen3:14b",
  "tasks": ["汎用ArchitecturePlan生成処理の単体の失敗を再現し修正", "独立テストと負例を追加", "別ジャンルの非退行を比較"],
  "checks": [["node", "--test", "scripts/r125-v4d-local-architect.test.mjs"]],
  "allowed_prefixes": ["source", "scripts"],
  "state_dir": "C:/FreeAutonomyPrivate/MAB-20261104",
  "continuous_goal": "既存のStrategy v2を守り、実Qwen→B143→真正ARTを段階的に改善する。SOURCE/ART/実機を混同しない",
  "max_cycles": 12,
  "max_minutes": 840
}
```

### 設定例：Browser Ink TPS

```json
{
  "project": "browser-ink-tps",
  "sandbox_runtime": "docker",
  "docker": {"network": "bridge", "memory": "6g", "cpus": "2"},
  "network_access_approved": true,
  "workspace": "C:/FreeAutonomyIsolated/browser-ink-tps",
  "branch": "research/free-autonomy-pilot-20261104",
  "model": "ollama/qwen3:14b",
  "tasks": ["既存原作証拠に基づく小さな未解決課題を解析して修正", "既存の独立テストを増強", "研究ブランチ上で非退行を再検証"],
  "checks": [["npm", "run", "typecheck"], ["npm", "test"]],
  "allowed_prefixes": ["src", "scripts", "tools"],
  "state_dir": "C:/FreeAutonomyPrivate/TPS-20261104",
  "continuous_goal": "既存の原作証拠・忠実度ゲートを維持して、180秒4v4に向けた原作SOURCEの未達を一つずつ解消する",
  "max_cycles": 12,
  "max_minutes": 840
}
```

上記は**起動例**であり、実際のWindowsでの隔離・LLM・OpenCode・npm/Node・性能・安全を確認したものではない。研究branch名が存在しなければ起動しない。自動clone/重いモデル同時起動を行わない。全員の承認は細かく求めないが、main・公開・課金・実Minecraft書込・Work/Computer Useへの移行は別途ユーザー承認。

## 現時点の証拠

`python -m unittest -v test_solo_agent.py` のLinux/Python 3.13.5ローカル隔離Fake CLI試験11件はPASS。**Fake CLIであり実LLMのコード生成成功数は0件、Windows実機無人運転は0件**。SOURCEテスト成功後コミット・origin/branch/paths/モデル制限・再開の限定動作を確認しただけ。Strata A33の真正推論・長時間運転HOLDは維持。

## 2026-11-04 Docker境界（今回新規・未実機）

- `solo_agent.py` は `sandbox_runtime: docker` を**必須**とする。旧 `--sandbox-attested` フラグは単なる起動者の認識確認であり、Docker実行を迂回できない。
- OpenCode 2の研究用イメージ `ghcr.io/anomalyco/opencode:2.0.0` と、QA用 `node:22-bookworm-slim` を**事前にローカルで確認**する。監督器は自動pullやインストールをしない。利用可能なイメージ・CLI互換性はWindows実機で再検証。
- AgentとQAはどちらも `docker run` の別コンテナ内で実行。Git cloneを `/work` だけにマウントし、`.git` は重ねて読み取り専用、ホストHOME・Docker socket・ユーザーデータ・GitHub認証をマウントしない。root filesystem readonly、権限/CAP縮小、CPU・RAM・PID制限、タイムアウト後の `docker rm -f` を準備。ただしこれらのオプションが実Windows環境で正しく成立した証拠はまだない。
- 実モデルへの接続のための例では `network: bridge` と `network_access_approved: true` を**明示**する。ネットワーク到達を認めるため、隔離クローン内には秘密情報を置かない。ネット接続が不要な試験は `network: none` を指定する。Ollamaは `host.docker.internal:11434/v1` に接続する設定を注入するが、Windows側Ollamaのbind・firewall・LAN露出対策を別途検証する。
- QAコンテナは `node` / `npm` / `python3` のみ呼び出せる。ただし既定QAイメージはNodeであり、`python3` の有無や `node_modules` の準備は未確認。QA成功を実アート・原作再現・実世界内施工・真正LLM生成と混同しない。
- `python -m unittest discover -s tools/free-autonomy-solo -p "test_*.py"` で監督器とDockerコマンド構築をFake試験。**実Docker/Windows/本物のOpenCode/真正Qwen/無料クラウド連続実行は未証明（HOLD）**。
- 次の真正実行は「Docker本体の実起動と隔離→OpenCodeの固定モデル1回の真正応答→小さなソース修正→独立QA→研究コミットとpush→2工程目へ連続」の順で、証拠が揃うまで本番長時間運用を開始しない。


## 2026-11-04 真正Linux Docker / OpenCode 2 CLIの限定PASS

研究HEAD 0f519ba0bc15a77e7bf15b3574848dd9ae4b24c5 / [専用Actions #41742013939](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41742013939)：3ジョブすべて completed/success。

- offline-contract-only：Mock/Fakeの安全回帰20/20 PASS。実LLM試験ではない。
- native-docker-smoke-no-llm：真正Ubuntu Docker Server 28.0.4で独立2コンテナ起動。使い捨てworkspace書込、.git readonly、root filesystem readonly、socket非公開、network none、タイムアウト停止を検証。
- real-opencode-v2-cli-no-llm：公開OpenCode v2.0.0イメージの本物のCLIを隔離Dockerで起動しヘルプ応答を確認。認証情報なし、ネットワーク遮断、モデル推論0回。
- 独立QAは常時 network none。agentは別途明示承認した場合のみbridge使用可能。QA前後の変更対象とSHA256が異なる場合はcommitせずHOLD。
- 既存r55-future-source-preflightは別にFAILし得る。今回の専用CI成功とリポジトリ全体のCI成功を混同しない。

未達＝HOLD：Windows Docker実機、真正Ollama/Qwen/Gemma推論、無料クラウドモデルの真正連続利用、実LLMが行うソース修正→独立QA→GitHub push、長時間無人運転、MABのART/実機・TPS正式4v4/原作180秒品質。

次ゲート：PC利用可能時に隔離使い捨てclone上でWindows Dockerとモデル通信を一括確認する。既存Windows/Ollama設定、原本、ゲーム、本番、main、保護研究ブランチに触れない。ユーザー操作はできるだけ1回にまとめる。


## 2026-11-04 今回：真正無料クラウド試行の実測FAILとローカル別経路

最上位目的は12月のChatGPT非依存・無料/低費用・長時間自律実開発。Strata完成や単体テスト数の増加自体を目的にしない。MinecraftAIBuilderとBrowser Ink TPSは同格、ローカル同時担当は1件、main/原本/本番/有料API/Workは保護する。

- `free_model_real_once.py` は公開の使い捨てコードfixtureだけを用い、OpenCode 2.0.0 `opencode/glm-5.3-flash-free` の真正実行を1回試みた。[Actions #41742847107](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41742847107) は **completed/failure**。CLIは選択モデルを表示したが、240秒で終了せず **exit 124**。コード変更・独立QA・commitは0。認証/通信/混雑/モデル能力のどれが原因かは未特定。無料モデルのカタログ掲載は稼働実績でない。
- 以後 `genuine-free-model-once-ephemeral` は `workflow_dispatch` の明示実行時のみ。通常pushでは呼び出さず、無料モデル枠の無用な連続消費を防ぐ。
- `windows_readonly_audit.ps1` はWindows上のGit/Python/Docker/Linux image/Ollama loopbackだけを読み取り、推論・インストール・pull・Docker実起動・プロジェクト改変を行わない。Windows Actionsでは**AST構文だけ**PASSし、ユーザーWindowsでの稼働結果は未取得。
- `local_ollama_real_probe.py` は**手動起動時だけ**、既に導入済みのローカルQwen/Gemmaから選択した1モデルへ1回だけ localhost POSTする。公開の小さなコードfixtureをJSONで受け、許可AST構文だけを検証し、独立8ケースの結果を非公開ローカル保存。原本・GitHub・外部APIには書かない。GitHub CIのこの経路は**オフラインMock/合成入力4試験のみ**であり、ローカル真正モデル実行はまだ0。
- [専用Actions #41743900196](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41743900196) は**4ジョブSUCCESS、無料モデル実行ジョブSKIPPED**。オフライン回帰24/24 PASS、Linux実Docker・OpenCode CLIヘルプ・Windows PowerShell AST限定PASS。MAB ART/Minecraft実機、TPS 180秒/4v4、Windows本体・真正Ollamaコード生成/長時間無人開発は引き続きHOLD。

次は Windows本体の読取専用診断→Qwen/Gemma真正1応答を観測し、実LLMによる対象コード変更→独立QA→隔離研究ブランチ保存の連続工程へ進む。ChatGPT枠やユーザー手動操作を無駄に消費しない。詳細な合格率・速度閾値は未確定のまま。


## 2026-11-04：無料クラウドを含む承認済みモデルの限定フォールバック

- 既存 `solo_agent.py` に任意の `fallback_models` を追加。**新しい監督器/Workflowは追加しない**。一度の長時間セッションで担当する **project は固定**。別のプロジェクトへの切り替えではなく、モデル呼び出しが失敗した場合のみ、設定に列挙した別モデルを同じ目的で試す。
- 設定例：`"model": "opencode/<実際の無料モデルID>-free", "fallback_models": ["opencode/<別の実際の無料モデルID>-free"], "per_task_attempts": 2`。これは説明用のプレースホルダーで、実際のモデルIDと無償性・認証条件は都度確認する。フォールバック候補は最大3個、重複不可、`ollama/...` または `opencode/...-free` の明示指定のみ。モデルの自動探索、有料モデル自動採用、追加API課金、モデルダウンロードはしない。
- `AGENT_EXIT != 0` の場合、Gitの origin / branch / HEAD とワークツリーが**完全に変わっていない場合だけ**次の明示候補へ移る。部分的なソース編集、untracked生成物、勝手なgit commitがあったらHOLDし、次モデルに渡さない。従来のQA失敗時は同モデルの反復修正を維持。モデル使用履歴と研究コミットの要求モデルをPRIVATE状態に記録する。
- `fallback_models` 省略時は従来どおり単一モデル。Docker OS隔離、単一ローカルプロジェクトロック、研究ブランチ限定、独立QA、明示pushが必須。CIのFake CLIによるフォールバック成功は**真正無料モデルの稼働・有用な開発成果・長時間無人成功を意味しない**。
- 無料クラウドの実運用前に、選択したモデルが現行の無料提供対象であること、認証方法・利用枠・ソース送信範囲を確認する。OpenCode無料モデルの過去240秒タイムアウトは原因不明のまま。モデル名が`-free`で終わることだけでは利用可能性も課金ゼロも保証できない。
- Gemini CLIについては2026年6月18日から個人向けGoogleログインによる利用終了とのGoogle公式案内があるため、古い「1日1,000回無料」の説明をそのまま根拠にしない。GoogleのGemini API規約には18歳以上の年齢制限があり、Antigravityも**18歳未満は利用不可**と公式FAQに明記。Qwen CodeのOAuth無料枠も2026年4月15日に終了。これらを自動的に有効化したり、年齢・利用規約や課金境界を迂回する実装を追加しない。Strata/Google Antigravity/Qwen Code等は条件付き候補として維持するが、利用資格・費用と実測認定は別途必要。


## 2026-11-04：中断・クラッシュ後の安全な再開ゲート

- 長時間自律運転（ローカルLLM/無料クラウド共通）では、モデルがソースを書きかけたままクラッシュ・タイムアウト・OS中断になる場合がある。**以前の実装では再起動時に `state.last_head` とGit HEADの一致だけを確認しており、未検証の変更が残った作業ツリーを引き継げてしまった。**
- 修正後は `solo_agent.execute()` の単一プロジェクトOSロックを取得してから、**GitHub pushの再試行やモデル呼び出しより前**に origin / 研究branch / HEAD / git statusを再点検する。HEADの外部変更または未検証の変更（未追跡ファイルを含む）でHOLDにし、理由を外部PRIVATE状態ファイルに保存する。保護された原本やmainへ変更は加えない。
- 同一セッション内の不合格候補の連続再修正は従来通り。ただし中断を挟んで再起動した際には、未検証の差分を勝手に前回モデルや別無料プロバイダへ渡さない。未検証ファイルは**自動削除・自動公開しない**。隔離クローンでのレビュー・退避後に正常なclean状態から再開できる。
- 回帰は真正Git一時リポジトリ＋Fake CLIで、「一度コミット済み→未検証の残骸あり→モデル/QAの追加実行禁止→clean後に再開」「未送信のQA済みresearchコミットがある→dirtyならremote pushにも進まない」を検査。**Windows本人PCの長時間真正LLM試験ではない**。自動退避・無人復旧は別設計とし、原本を損なう雑な `git clean -fd` などは導入しない。
