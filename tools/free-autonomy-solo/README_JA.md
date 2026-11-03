# 2026年12月対策：単独プロジェクト長時間自律実行の安全研究

この試作は MinecraftAIBuilder / Browser Ink TPS **どちらか一つ**を同時に担当させるための、外部監督型 `OpenCode` CLI 実行器です。**Strataの正式な代替認定ではなく、OSS/無料クラウド/ローカルLLMの可換な選択肢としての研究実装**です。

## 固定境界

- 両プロジェクト同格。`project` に書いた**一件だけ**を1セッション中ずっと担当。OSの単一ロックで二重実行を拒否。
- `main` 禁止・`research/` 接頭辞必須・リポジトリのGit origin完全照合・専用clone必須。原本/凍結資料/ `.github` / `.env` は研究対象外。
- 自動の `git commit` は**独立テスト成功後のみ**、pushはコマンドに明示した場合のみ・research branch限定。merge/公開/実世界書込/課金はしない。
- `--model` は明示 `ollama/...` または`opencode/...-free`のみ。モデルを勝手に有料モデルへ切り替えない。無料モデルが継続して呼べるかは別途真正試験。
- CLI実行成功は「真正ローカルモデル認証」ではない。ユニットテスト成功も建築ART/原作忠実度/180秒真正Chrome/実機Minecraft成功ではない。
- 出力ログと再開状態はGitの外側で保存する。モデル応答や元入力が含まれる可能性があるため、ログをそのままGitHubに公開しない。
- **重要：Git cloneだけでは任意のOSコマンド実行を安全に隔離できない。** `OpenCode --auto`は承認待ちを減らすが、シェル権限が強い。現状は実行前に別のOSサンドボックスとネットワーク/ファイル境界が確立していることを要する (`--sandbox-attested`)。このフラグ自体に隔離能力はない。未構築で有効にしないこと。

## プロトタイプの使い方

1. OS隔離済みの**捨てられる独立clone**を作り、既存開発フォルダ・ワールド・原本をマウントしない。`research/`ブランチを使用。Docker/WSL等でのローカルモデル到達・GPU/CPU負荷は実機実証が必要。
2. 下のJSONを Gitリポジトリ**外**に置き、絶対パスを設定。 `tasks` は1セッションで順次こなす複数の開発目的で、1工程ごとにプロジェクトを替えない。`allowed_prefixes` は対象変更領域に限定する。`checks` は実プロジェクトの独立検査を複数指定する。
3. `python solo_agent.py --config ... --sandbox-attested --push` で実行。`--push` を省略すればローカルコミットまで。`state_dir/state.json` で結果と未認定フラグを確認。

### 設定例：MinecraftAIBuilder

```json
{
  "project": "minecraftaibuilder",
  "workspace": "C:/FreeAutonomyIsolated/MinecraftAIBuilder",
  "branch": "research/free-autonomy-pilot-20261104",
  "model": "ollama/qwen3:14b",
  "tasks": ["汎用ArchitecturePlan生成処理の単体の失敗を再現し修正", "独立テストと負例を追加", "別ジャンルの非退行を比較"],
  "checks": [["node", "--test", "scripts/r125-v4d-local-architect.test.mjs"]],
  "allowed_prefixes": ["source", "scripts"],
  "state_dir": "C:/FreeAutonomyPrivate/MAB-20261104",
  "max_cycles": 12,
  "max_minutes": 840
}
```

### 設定例：Browser Ink TPS

```json
{
  "project": "browser-ink-tps",
  "workspace": "C:/FreeAutonomyIsolated/browser-ink-tps",
  "branch": "research/free-autonomy-pilot-20261104",
  "model": "ollama/qwen3:14b",
  "tasks": ["既存原作証拠に基づく小さな未解決課題を解析して修正", "既存の独立テストを増強", "研究ブランチ上で非退行を再検証"],
  "checks": [["npm", "run", "typecheck"], ["npm", "test"]],
  "allowed_prefixes": ["src", "scripts", "tools"],
  "state_dir": "C:/FreeAutonomyPrivate/TPS-20261104",
  "max_cycles": 12,
  "max_minutes": 840
}
```

上記は**起動例**であり、実際のWindowsでの隔離・LLM・OpenCode・npm/Node・性能・安全を確認したものではない。研究branch名が存在しなければ起動しない。自動clone/重いモデル同時起動を行わない。全員の承認は細かく求めないが、main・公開・課金・実Minecraft書込・Work/Computer Useへの移行は別途ユーザー承認。

## 現時点の証拠

`python -m unittest -v test_solo_agent.py` のLinux/Python 3.13.5ローカル隔離Fake CLI試験8件はPASS。**Fake CLIであり実LLMのコード生成成功数は0件、Windows実機無人運転は0件**。SOURCEテスト成功後コミット・origin/branch/paths/モデル制限・再開の限定動作を確認しただけ。Strata A33の真正推論・長時間運転HOLDは維持。
