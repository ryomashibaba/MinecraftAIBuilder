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
