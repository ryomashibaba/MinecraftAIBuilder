# 2026年12月対策：単独プロジェクト長時間自律実行の安全研究

> **2026-11-04 最終QA状況（古い節の「未実行」表記より優先）：**
> 公開済み真正Qwen3:14B元2段階修正案は独立SOURCE QAで不合格（[Actions #41845806261](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41845806261)）。同じ公開材料から生成した別由来・アシスタントレビュー修正案は、GitHub隔離Dockerで2段階ともSOURCE QA合格（[Actions #41847626931](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41847626931)）。**Qwen自身が2段階成功したとは報告しない。** ユーザーPCでの操作不要、作品ART/実機と長期自律は未証明。
>
> **正本監査**：[QWEN_REAL_SOURCE_PUBLIC_QA_RESULT_20261104_JA.md](./QWEN_REAL_SOURCE_PUBLIC_QA_RESULT_20261104_JA.md)


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

## 2026-11-04：無料クラウド真正再試験とアカウント未接続の境界

- 過去の真正無料モデル試行 [Actions #41742847107](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41742847107) の**attempt 2**を、GitHub連携から手動で1回再実行。実ログではOpenCode 2.0.0の匿名Docker環境が `Model unavailable: opencode/glm-5.3-flash-free` を返し、exit 1となった。モデル推論、コード変更、独立QA、研究コミットは発生していない。**attempt 1 は240秒のタイムアウト**であり、当初のタイムアウト原因が今回の「モデル不可」と同じだったことまでは証明できない。
- OpenCodeの公式 [モデルドキュメント](https://dev.opencode.ai/v2/docs/models/) は、モデルの有効性がプロジェクトのプロバイダ設定・認証状態に依存し、サインアウト状態では`opencode` providerが見えない場合があることを明記している。無料モデルが [公式一覧](https://opencode.ai/v2/docs/console/models/) に掲載されていても**この匿名CIから推論できる証拠ではない**。
- そのため、既存の `free_model_real_once.py` で実LLM要求前に、資格情報を注入しないDocker `opencode models opencode` **厳密1コマンドだけ**でモデル可視性を検査する。該当モデルがリストされない、コマンド失敗、時間切れでは推論を一切試行せずHOLD。モデル一覧への表示は可用性・無料資格・速度・品質の保証ではなく、実推論ゲートは別。
- 既存 `opencode_native_probe.py` のGitHub Linux CLIジョブで、公開の捨てクローンと認証情報なしの条件のまま、上記モデル一覧の可視性を **診断扱い** で記録する。モデル一覧取得が失敗しても従来のCLIパーサ試験成功を失敗と混同しない。Docker画像の固定・ホスト認証情報非共有・オフラインQAは維持する。
- 追加の認証情報・GitHub Secrets・API課金・有料モデルへの自動移行は実装しない。今後、無料クラウドの利用条件と対象アカウントが実際に整った隔離環境を用意できない場合は、この経路をHOLDのままにし、既存のローカルLLM/Strata経路と同格の開発目的を追求する。未承認のWork/Computer Use/本番公開は開始しない。
- 既存の単一プロジェクト監督器 `solo_agent.py` でも、Docker内OpenCodeが明示的な `Model unavailable:` で終了し、承認済みの代替モデルが尽きた場合は、同じ実行条件で残りの再試行枠を使い切らず `NO_APPROVED_AVAILABLE_MODEL_IN_THIS_ENVIRONMENT` のHOLDにする。別モデルへの移行は既存のクリーンワークツリー検査後に限る。実モデルの認証や長時間運用の成功とは区別する。


## 2026-11-04：Windows本人PCでの真正モデル試行（PRIVATE・ワンダブルクリック）

**目標：基盤の模擬PASSから進み、導入済みOllamaによる実ソース修正案2段階が生成できるかを本人PCで確認する。** モデルが本当に実行できたと認定するには、本人PCの PRIVATE receipt が必要。ここでは実AI成果/ゲーム改善はまだHOLD。

- [RUN_FIRST_PRIVATE_REAL_MODEL_PILOT.cmd](./RUN_FIRST_PRIVATE_REAL_MODEL_PILOT.cmd) を1ファイルだけダウンロードし、Windowsでダブルクリックする。GitとPython 3.13および起動済みOllamaが必要。GitHubへの読み取り専用のアクセスも使う。Chrome/ゲーム/既存プロジェクト作業フォルダーを閉じる必要はない。
- 画面の `1`（MinecraftAIBuilder）または `2`（Browser Ink TPS）を選ぶ。同時に両方は実行しない。既に `qwen3:14b` が導入されていれば優先して使い、そうでなければ導入済みモデルから選択する。モデルの自動pull・インストール・有料サービス接続はしない。
- CMDは**変更不能なGitコミット** `1710e849a5b51bd40ceb4f4f20f3e8f8a49d96cf` のPowerShellソースを取得し、Git Blob `149fb594b6c646c9b0753cbdb2431d2adb544354` を照合してから起動する。既存Python側も4ファイルのGit blobを照合する。手元の `LOCALAPPDATA/FreeAutonomyPrivate` へ隔離Git cloneと未実行 `.txt` 下書きを置く。
- 完了または失敗の両方で、小さな共有用 `SHAREABLE_FIRST_PILOT_STATUS.json` を `LOCALAPPDATA/FreeAutonomyPrivate/QwenRealProjectPilotSource/<run-id>` に保存する。画面の `UPLOAD_THIS_SMALL_STATUS_JSON=...` で場所を表示し、**この小さいJSONだけ**をチャットに添付すれば次の工程を判断できる。新しい集約項目には、試行回数、2段階の結果、所要秒、モデル報告の出力tokens/s、HOLD理由を含む一方、ソース本文・差分・プロンプト・トークン・ローカルユーザーパスを含めない。モデル応答、Gitのユーザー資格情報、PRIVATE下書きの全文はアップロードしない。
- 成功しても `TWO_REAL_SOURCE_PRIVATE_DRAFTS_ONLY` の意味は **「実モデルに2段階の単一ファイル修正案を提出させ、限定構文ゲートを通した」だけ**。生成されたコードの実行、独立QA、研究コミット/プッシュ、最新本線へのマージ、作品品質の採否は次のゲート。真正モデル身元はAPI自己報告にすぎず、独立認証ではない。
- CIは `cmd /c ... --ci-self-test` とPowerShell ASTの形式検査のみ。ユーザーWindows/Ollama実機と本物のモデル呼び出しの成功証拠にはならない。失敗ならHOLDの小さな共有JSONを受け取って原因を分け、**手順を増やす前にこちらで修正**する。


## 2026-11-04：真正Windows Qwen試行（初回HOLD）からの具体修正

本人Windows上の実行ログ（本人がチャットに貼付）から確認できたこと：

- `qwen3:14b` への`/api/chat` 要求を2回試行し、モデル報告の完了JSONは得たが、固定MABソースに対してどちらも `PATCH_MATCH_MUST_BE_UNIQUE`。**stage 1で0/2案、stage 2に未到達、HOLD**。原本編集・QA・Git commit・remote pushは0。PINNED_SOURCE_INTEGRITY_PASSで、モデルの独立身元や成果の品質は未証明。ログには私人用の保存先が含まれるため、公開Gitの記録には絶対パスを再掲しない。
- この失敗はLLMにソースの引用文字列を完全一致で出力させる方式に起因し得る。曖昧・不一致を適用可能に緩和するのは危険なので、**編集候補の厳密一致行をホストが既存ソースから一意に抽出**し、モデルには `{"slot":番号,"replace":新しい1行または置換コード}` のみ返させる方式へ変更。任意 `find`、曖昧/重複行、範囲外slot、空/同一置換、保護アンカーの削除は引き続き拒否。model生成コードは私的テキストのまま・実行なし。
- GitHub実ソース2系統の選択を保持し、長時間モデル切替や原本リライトは行わない。段階2も独立した一意編集slotから選ぶ。合格しても意味のある品質・ART/4v4・長時間無人開発は未認定。
- さらに、旧ランチャーは結果JSONの`UPLOAD_THIS_SMALL_STATUS_JSON=`パスを表示するだけだったため、ユーザーから「終了後にファイルが表示されなかった」と報告。**新PowerShellは結果JSON保存後、Windows ExplorerでそのJSONを選択表示する**。Explorerが開かなくてもJSONは必ずprivateフォルダに保持し、表示されたパスから手動で開ける。
- 新版の起動CMDは新PowerShell版の固定コミットおよびGit blob SHAのみ実行可能にし、さらに下位Python実装と固定マニフェストのSHAも確認する。旧版の実行失敗を隠さず、再実行による本物の2段階修正案は別途実測を要する。


## 2026-11-04：本人Windowsの真正Qwen3:14Bで2段階PRIVATE下書きが完成

本人が添付した `SHAREABLE_FIRST_PILOT_STATUS.json` の検証結果：

- プロジェクト `minecraftaibuilder`、要求モデル `qwen3:14b`、固定ソースコミット `fe1682e15ffa063f4dc415b06c4d76a54737a06e`。
- `status=TWO_REAL_SOURCE_PRIVATE_DRAFTS_ONLY`。第1段階：5.569秒・45出力tokens・Ollama報告37.67tokens/s。第2段階：2.845秒・61出力tokens・37.94tokens/s。モデル要求計2、受理したPRIVATE下書き計2。**初回の `PATCH_MATCH_MUST_BE_UNIQUE` はこの実走では発生しなかった。**
- **真正モデルの編集内容やQA結果は添付されたサマリーに含まれていない。** 実際のコードの構文・意味・テスト合否・優位性・速度の一般化は未検証。未承認コード実行0、元プロジェクト変更0、GitHub push0、有料API0。
- 既存の隔離Docker SOURCE QAへの接続は、本人WindowsのDocker Desktop導入・可用性が未確認であるため自動開始しない。保護された本線・Minecraft本体・Draft PR #128は一切変更しない。

### 次工程：既存2件のPRIVATE下書きに対する、モデル再実行なしの静的事前検証

- 既存 `promote_private_real_drafts_docker.py` に `--static-only` を追加。同じ安全な受け渡し境界で、本人PCに残った元ソースの固定Git履歴・ソースblob、モデルreceipt、2段階のSHA256連鎖、候補の変更量、保護契約アンカーの保存を検査する。
- **生成コードの実行・Node/npmテスト・Docker起動・モデル再要求・Git commit/push・外部API呼び出しは0**。結果は `SHAREABLE_STATIC_PREFLIGHT.json` のみローカル保存。PASSでも**静的整合性の確認だけ**であり、有効な建築改良・SOURCE QA・ART合格とは決して判定しない。
- [RUN_CHECK_EXISTING_PRIVATE_DRAFTS_ONCE.cmd](./RUN_CHECK_EXISTING_PRIVATE_DRAFTS_ONCE.cmd) は `minecraftaibuilder` / `qwen3:14b` を既定値にし、プライベート保存場所のうち最も新しい整合した成功receiptを**1つだけ**選ぶ。ダブルクリックで実行し、結果JSONをExplorerで選択表示する。下書き本文やPatchはチャットに送らず小さい結果JSONだけを添付する。
- スクリプトは固定Git SHA/Blobで検証した公開Python検証器のみダウンロードし、本人のモデル応答やゲームソースは外部送信しない。候補が欠損・改変・別モデル・別プロジェクト・既存原本dirtyならHOLD、勝手に修復・削除しない。
- これは独立QAへの**準備**であり、正式な独立テストはDockerを含む隔離環境を確認した後、別工程で実施する。CIの本検証は真正Git一時fixture＋偽Docker禁止の静的コード経路のみ。本人PCの最新候補そのもののQA合格は別途確認する。


## 2026-11-04：真正Qwen3:14B・既存2段階PRIVATE修正案の静的PASS、次は実コードを実行しない構文検査

本人が添付した `SHAREABLE_STATIC_PREFLIGHT.json` で `status=STATIC_PRIVATE_DRAFTS_ADMISSIBLE_FOR_ISOLATED_QA_ONLY` を確認。MAB固定コミット `fe1682e15ffa063f4dc415b06c4d76a54737a06e` に対し、stage 1・2ともモデルreceiptとSHA256一致、変更量有界、保護対象契約アンカー維持の3条件PASS。生成コード実行0・Docker0・本来のNode SOURCE QA0・Git commits0・GitHub push0・有料API0。**これは修正コードの良否、Nodeでの構文合格、作品ARTの合格ではない**。

- 今回、既存 `promote_private_real_drafts_docker.py` に **`--mjs-syntax-only`** を追加。既存の静的署名・Git HEAD・差分境界の検査に合格した場合のみ、同じ PRIVATE 下書き2件と比較用元MAB `.mjs` を `node --input-type=module --check` の **標準入力**に渡し、構文の受理/拒否を確認する。Node.jsの `--check` はモジュールのコードを実行せず、依存モジュールのロードやゲームテストも行わない。
- Node.jsが導入されていなければ `NODE_NOT_INSTALLED_NO_AUTO_INSTALL` でHOLD。インストール、Docker、自動モデル再推論、追加コスト、公開pushはしない。ユーザーPCがWindows 11であることだけではNodeの導入済みを仮定しない。
- プライベートなソースやNode構文エラー原文は表示/送信しない。結果JSON `SHAREABLE_MJS_SYNTAX_RESULT.json` はステージごとのSHA256/構文PASS、モデル自己申告、コード非実行、HOLD理由のみ。元ソース・2件の修正案ともユーザーPCの私有作業領域内に留まり、原本Git履歴とファイルを変更しない。
- 既存の [RUN_CHECK_EXISTING_PRIVATE_DRAFTS_ONCE.cmd](./RUN_CHECK_EXISTING_PRIVATE_DRAFTS_ONCE.cmd) は新版でMAB `qwen3:14b` の最新成功PRIVATE下書きを選び、この構文パーサへ進める（既存PRIVATE下書きを再生成しない）。Windows Explorerで小さなJSONを選択表示する。**構文PASSであっても独立機能QAではなく、正式なSOURCE QA/生成コードの実行/採用/長時間自律運転とは分離**。
- 実装のGit回帰試験は、動作させるとファイルを作るはずの悪意を想定したJavaScript文を `node --check` に与え、ファイルが作られないことを確かめるほか、構文エラーが適切なHOLDになること、Node未導入でもHOLDになることを検証する。ユーザーの真正生成コード本文はこの公開CIへ持ち込まない。


## 2026-11-04：本人が公開研究ブランチへの送信と隔離SOURCE QAを明示承認

本人がチャットで「この2件の修正案を公開GitHubの研究ブランチに送信して、隔離環境で本物の動作テストを行ってもよいです」と承認。これは **MAB固定ソースに対する今回の真正Qwen3:14Bの2件だけ** の公開研究提出承認であり、`main`へのマージ・正式原本採用・Work/Computer Use起動・有料API・他の研究提案の無条件公開を意味しない。

- 事前結果：真正Qwen 2/2 PRIVATE下書き生成PASS → SHA256・変更境界・保護アンカー静的2/2 PASS → `node --input-type=module --check` 構文2/2 PASS。ソースは本人Windowsの隔離私有領域にあり、このチャット側には**結果メタデータのみ**。こちらからWindows内の下書きを読んだりGitHubへ直接公開することはできない。
- 今回の2件の誤選択を防ぐため公開クライアントが要求するSHA256を固定：stage1 `03b73c926cb507b9fc0bed50c3a9b38cf5cada631b15a428b9e3f240fe8098cc`、stage2 `5b8468783df8126d6e053bf7d37b4c9b74fd543bdd345d5898ac88fe022df6d6`。対象 `minecraftaibuilder`、モデル報告 `qwen3:14b`、元コミット `fe1682e15ffa063f4dc415b06c4d76a54737a06e` を固定。PRIVATEレシート・静的検査・構文検査すべてのSHAを照合して選ぶ。
- [RUN_PUBLISH_EXISTING_QWEN_MAB_TWO_DRAFTS.cmd](./RUN_PUBLISH_EXISTING_QWEN_MAB_TWO_DRAFTS.cmd) を本人Windows上で**1回だけ**実行。Git Blobを検証したPowerShellがレビュー済みPythonコード9件を追加でSHA照合して取得。真正Qwenを再呼び出しせず、最終読取・構文チェックを行った後、既存 `submit_public_research_qa.py --publish-public-code` に今回の PRIVATE 下書きを渡す。
- 既存の送信器はベースGitを新しい使い捨てcloneで取得し、**既存の** `ryomashibaba/MinecraftAIBuilder:research/dec-free-autonomy-solo-pilot-20261104` にだけ、1ファイル追加コミットをfast-forwardでpushする。生成コード2段階の全文を公開提出JSONへ載せるため、**公開Git履歴から原則回収不能**。保守的な秘密文字列・スコープの確認は実施するが、あらゆる機密や不適切なコードを自動で確実に発見できるわけではない。既存Git認証がなければHOLDし、秘密鍵・トークンをチャットに送らない。
- GitHub受信側は既存 `.github/workflows/dec-free-autonomy-public-source-handoff.yml` を使用し、GitHub UbuntuランナーのDocker内部、`network=none`、読取専用ソース、無資格情報で真正SOURCE QAを実施。各stageが合格すれば**ランナーの使い捨て隔離clone内のみ**で研究コミットを作成。main・既存開発ブランチ・Minecraft世界・本番へ反映しない。既存ワークフローと受信器を増設しない。
- 公開クライアントは正確な提出コミットSHA・pushイベント・対象ワークフロー・対象ブランチを照合して結果を監視。私有 `SHAREABLE_REAL_QWEN_PUBLIC_QA_HANDOFF.json` に、送信コミット・Actions URL/結果・HOLD理由のみ保存し、Explorerで選択表示する。本人には**この小さなJSONだけ**をチャットに送ってもらい、こちらでActionsとArtifactを独立確認する。
- 現時点で**実際の2件のpush・GitHub QAは未実行**。ランチャー・構文CIの成功と、本人Windowsでの公開提出成功・有用なソース改善・ART合格・長時間自律実行は必ず区別する。


## 2026-11-04：人間操作最小化を標準化 — この公開研究ソース以後はGitHub側で無人QA・再診断

本人から「もう少し私の工程を減らせない？」との要望。**今後の既定運用は、既に公開された研究材料のテスト・解析・安全な隔離修正は GitHub コネクタ/Actions 側で完結させること**。同じソースの再推論・毎回ZIPダウンロード・ローカルCMD実行・JSON添付は要求しない。

- 真正Qwen3:14Bの公開研究提出コミット `741932d8f0e41efdc5c1fd99bd99ea690cb64720` を受領済み。本人がアップロードした最終Handoff JSONでは、`public_submission_confirmed=true`、QA run `41845806261` が `failure`。GitHubから独立に再照合：受信workflowの `INDEPENDENT_DOCKER_QA_STAGE1_CHECK0_RC1`、SOURCE QA実際の合格0。原本/main/本番は無変更、Windows生成コード実行0。モデル生成PASS・静的PASS・Node構文PASSは**実行PASSではない**。
- 公開Qwen stage 1のソースには、モジュールトップレベルで未定義変数 `v` にアクセスする余剰式がある。これは `node --check` ではPASSするが、Nodeモジュール実行時は `ReferenceError` を起こす（問題部分を別に単体再現）。Qwen stage 2は正常な7～9段の階段に対し最大5段を要求する矛盾した検証を追加。ゆえに、両Qwen修正案を**ゲーム品質改善として認定しない**。
- 元のQwen提出JSONと固定SHA2件は一切書き換えない。代わりに、別由来 `ASSISTANT_REVIEWED_REPAIR_FROM_FAILED_QWEN_NOT_QWEN_INFERENCE` を明記した決定的・限定的な修正の候補を隔離作成し、既存の `receive_public_research_qa.handle` と `promote_private_real_drafts_docker.py` で実Docker/Node SOURCEテストを実行する経路 `.github/workflows/dec-reviewed-qwen-mab-repair-qa.yml` と `tools/free-autonomy-solo/reviewed_qwen_mab_repair_qa.py` を追加。受信済みの公開材料から**ユーザー操作0・モデル再呼び出し0・有料API0・main更新0**で実行する。
- 受信公開Qwenデータのコミット・ペイロードSHA・各stage SHAを完全照合し、既知の差分と**完全一致**しなければHOLD。見かけ上の修正を無条件で適用しない。初回レビュー用CIで公開Qwenのstage2にインデント1文字差を検出→精密照合を修正して再試験。ローカルユーザーPCを操作せず、公開済み差分だけで対処。
- 修正後の候補もGitHub runnerの一時領域にのみ置き、成功まで**自動公開・原本マージしない**。真正Qwenの生成実績と、GPTによる修正提案と、独立SOURCE QAと、Minecraft Education/ARTを厳密に区別。公開提出に必要な本人承認が得られているのは元のQwen2件であり、今後の新たな原本・秘密情報の公開を包括許可とは扱わない。
- 将来の無人ローカルLLM連続セッションを成立させるにはWindows上で最初の一度だけ長時間管理プロセスの導入/ログイン等の初期設定が必要になり得る。こちらのチャットからWindowsプログラムを勝手に常駐させない。安全な単一研究ブランチ内の修正・検証・コミットを無人で回し、main/公開範囲拡張/追加費用/WorkやComputer Useは従来の個別承認境界を守る。MinecraftAIBuilderとBrowser Ink TPSは同格だがローカルAIの同時作業は1プロジェクトのみ。


## 2026-11-05：中断時の未検証編集をPRIVATE隔離して再開する任意機能

**目的：** 12月対策の「同一プロジェクトを長時間継続・人手での細かい復旧を減らす」を、研究用のDocker監督器 `solo_agent.py` に反映する。既存の安全優先HOLDは**既定のまま**であり、現行運用を強制変更しない。

- オプトイン設定：JSONのトップレベルに `"quarantine_unverified_on_resume": true` を明示した場合**のみ**、再起動時の未検証作業ツリーを調べる。開始時の作業コピーは完全cleanでなければならず、既存`state.json`とモデル・プロジェクト・ブランチの同一性が必要。従来からの単一プロジェクトOSロック、Docker隔離、main拒否、Git origin/HEAD検証も継続。
- 研究ブランチ・承認済みの`allowed_prefixes`内で、変更パス20個以下・読める通常ファイル合計2,000,000バイト以下・シンボリックリンクなしの場合だけ、**PRIVATE**の`state_dir/quarantine/<checkpoint>/`に各元バイトとSHA256・Git追跡有無を保存して検証する。ファイル削除もmanifestに記録。GitHubへ自動アップロードしない。
- 全変更の正確なバックアップが取れた後だけ、追跡済み変更パスに`git restore --source=HEAD --staged --worktree -- <exact paths>`、未追跡の変更パスに対象ファイル単位の削除を適用。**無差別な `git clean -fd`、`git reset --hard`、ブランチ切替、コミット巻き戻しはしない。** 処理後もHEAD・ブランチ・remote・clean状態を検査し、結果をPRIVATE状態に追記する。
- `.github`、凍結原本、想定外の場所、モデルが変更したGit履歴、予算超過、バックアップ不一致では従来どおりHOLD。復旧で退避した未検証ソースは**QA成功・採用候補とみなさない**。同じQA済みタスクを再生成しない。
- 導入前提：操作者が**捨ててもよい独立研究clone**とPRIVATE保存先を確保し、Docker隔離の真正動作を先に確認した場合に限る。既存原本やユーザーの普段のGit作業ツリーでは本設定を使わない。設定追加による`config_sha256`変更は既存セッションの再開を拒否するため、新しいPRIVATEセッションを作ってから有効にする。

検証の出自：`test_solo_agent.py`内の一時Gitと模擬モデルで機密退避・元バイト一致・安全復旧・禁止場所の拒否・容量上限・HEAD変更拒否を試験する。**真正Windows Docker／実Qwen、夜間連続運転、実作品品質の証明ではない。** CIの最終結果は実行HEAD単位で照合してからPASS/FAILを報告する。ローカル環境にDockerを自動インストールせず、追加課金、Work/Computer Use起動、既存のPRマージ・本番公開をしない。


## 2026-11-05 次工程：同一セッション内でのモデル失敗・SOURCE QA失敗からの限定自動回復

既存の中断再開用PRIVATE退避（quarantine_unverified_on_resume）を、安全な**無人連続セッション中の限定回復**へ拡張した。最優先のMinecraftAIBuilder / Browser Ink TPSは同格、ローカルモデルは一度に1プロジェクトを専有する。Strataの完成を目標化せず、既存のsolo_agent.pyへ集約する。追加課金、Work/Computer Use起動、原本やmainの変更、正式ゲーム/ART合格判定は行わない。

新しいオプトイン設定（**既定はいずれもfalse**。明示した新しいPRIVATE状態セッションでのみ有効）：

- **"quarantine_unverified_on_agent_failure": true**：AIプロセスが非ゼロ終了し、承認済み研究cloneに未検証編集があるとき、PRIVATE退避・SHA照合・対象パス限定の原状復旧を行う。**綺麗な元状態が確認できたときのみ**、残りのモデル試行へ進める。Git HEAD/branch/originを勝手に書き換えた場合や、保護パス、2MB/20パス制限を超える場合は従来通りHOLD。
- **"quarantine_unverified_on_qa_failure": true**：独立QAがFAILとなった候補について、テストにより候補のパス・内容が変えられていないことを検査し、PRIVATEに不合格の原文候補を退避してから、直前の検証済みHEADへ対象パスだけ復元する。次の試行は前の**未検証候補を混ぜない**。テストがファイルを改変したり、対象外の新規ファイルを生成したら自動掃除をせずHOLD。
- モデルの非ゼロ終了時の詳細stdout/stderrは従来通りPRIVATEログに保存するが、**別の無料・ローカルモデルへフォールバックするプロンプトには生ログを渡さない**。許可範囲内の失敗であることだけ伝え、失敗したプロバイダから次のプロバイダへの予期しない原文伝播を防ぐ。
- 退避証拠は state_dir/quarantine/<checkpoint>/manifest.private.json と原バイト。状態ファイルには failed_attempt_quarantines / qa_failure_quarantines を分けて記録。いずれも**採用・独立QA成功・本物のLLM稼働・ゲーム品質合格の証拠ではない**。

試験は一時GitクローンとFAKE OpenCode CLI／模擬QAを利用。非ゼロ終了＋部分編集→PRIVATE退避→次の試行、QA失敗→退避→検証済みHEADからの再試行、既定HOLD、禁止パス拒否、QA改変拒否、フォールバックへのPRIVATE stdout漏洩拒否を追加した。GitHub Actionsで**この保存HEAD**のCIが完了するまでは合格未確定。真正Windows/Ollama/Gemma、夜間から登校中の長時間連続稼働・ユーザーWindows上のDocker OS隔離・実プロジェクト品質は別ゲートであり、推測でPASSにしない。

既存セッションの途中で設定を変えるとconfig_sha256が変わって再開拒否になるため、オプトインの適用は明示的に新しい使い捨て研究clone・PRIVATEセッションで開始すること。自動git pushは別途明示オプトイン済み既存研究remoteのみで、PRIVATE失敗候補をGitHubへ自動公開しない。
