# 2026-11-04 — 無料・実ローカルLLMの真正GitHub Actions試験記録

## 最上位方針

- ChatGPT依存を下げ、追加課金原則0円でローカル/無料クラウドAIによる長時間自律開発を成立させる。Strata完成自体は目的ではない。
- MinecraftAIBuilder と Browser Ink TPS は完全同格の最重要2件。ローカルAIは一度に片方だけを長時間連続担当し、細かな工程切替や承認待ちを避ける。
- 保護対象はmain・既存成功経路・世界原本・正式公開・有料API・Work/Computer Use開始。新しい研究ブランチ以外には手を出さない。ART品質・Minecraft実機・TPS正式4v4は独立判定。品質閾値は未確定。

## 試験の実装と安全境界

- `.github/workflows/dec-free-autonomy-real-local-once.yml`：特定の研究用スクリプト変更時だけ走る、小型Qwenの**真正ローカル推論**用CI。public repositoryのstandard Ubuntu runnerを使用し、GitHubの標準公開ランナーは無料（https://docs.github.com/en/actions/concepts/billing-and-usage）。
- `real_small_model_ci_once.py`：公式Ollama Dockerを使い、GitHub-hosted runner上で公開モデルを取得。localhostの実OllamaへのJSON応答、使い捨てGit fixtureのJS修正、独立Nodeテスト、**ローカル**コミットまで試験する。ユーザーのproject source、GitHub書込資格情報、外部有料AI API、GPU、Workは不使用。モデルデータは一時コンテナのみ。
- `local_ollama_patch_loop.py`：変更対象を1ファイルに限定し、JSON Schemaで一意find/replace文字列を要求。QAはネットワーク無しの分離Docker、保護Gitメタデータreadonly、CPU/RAM/PID制限。SOURCE QA後のみコミット、pushは明示承認済み研究ブランチに限る。モデル無変更・JSON違反は、研究コピーが未変更であることを検証した上で予算内の限定再試行へ移行。Git/原本/パスの不正変更は引き続き即HOLD。

## 事実と不合格を厳密に区別した記録

1. [#41748000477](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41748000477)：**completed/failure**。真正Ollamaが `qwen3:0.6b` の応答をlocalhostで返し、モデル自己申告 `done=true`・`eval_count=10` を確認。しかし最初のコード修正案が `MODEL_PATCH_SCHEMA_REJECTED`、独立QAとGitコミット **0件**。推論応答は実証、コード改修成功は未実証。
2. [#41748351733](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41748351733)：**completed/failure**。真正 `qwen3:1.7b` が応答。GitHub Actions内の**公開使い捨てGit fixture**で1工程目の実ソース修正が独立Node QAを通り、Gitローカルコミット **1件**。2工程目の追加例外処理は独立QA合格に至らず `HOLD_NOT_VERIFIED`。ワークフロー全体FAIL。
3. [#41748885320](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41748885320)：**completed/failure**。真正 `qwen3:1.7b` の最初のコード修正でNodeの3テストがPASS、使い捨てGitコミット `62d288305762e2475bb88692fb580b9ab7cf8f44`。2工程目は `MODEL_PATCH_NOOP_IDENTICAL`（find/replace同一）の安全拒否によりHOLD、コミット1件。これにより、モデル品質由来の停止を分類できた。
4. この結果を受けて `local_ollama_patch_loop.py` に安全なモデル不正出力のみの限定再試行処理を実装し、無変更案・形式不正・セキュリティ違反の負例試験を追加。最新版の真正試験：[ #41749324866 ](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41749324866)。**この文書の初回作成時点では結果未確定**。実験成功を先取りして記載しない。

## 成果として認める範囲

- 「本当のOllama/QwenがCPUでlocalhost応答した」：PASS（モデル名はサーバー自己申告。独立した暗号学的同一性認証ではない）。
- 「本物のモデルがソースを修正し、独立Node QAを通過し、隔離Gitにコミットできた」：**小さな公開fixtureで1工程だけPASS**。
- 「同一セッションで2工程連続の真正ソース修正QAが成立」：HOLD。再試験の新しい証拠を要する。
- 「Windows本人PC上のQwen3:14B/Gemma、大規模コード・長時間夜間学校時間稼働、両主力プロジェクトの実開発、GitHub remote保存、ART/実機/180秒4v4品質」：**すべて未実証**。
- 費用面：有料API 0回、GitHubの公開標準ランナー利用。追加有料サービスの開始なし。

## 次の優先工程

1. 再試験 #41749324866 の結論と各工程のQAを照合、SOURCE品質と推論実行を区別。
2. ユーザー操作が可能な時点で、固定SHAの `RUN_LOCAL_QWEN_TWO_STEP.py` による既存のローカルQwen3:14Bの2工程実測を行う。モデルや設定の自動変更をしない。
3. 真正長時間運用へ進む前に、**本物の独立clone保証、OS隔離、リソース/ネットワーク安全性、正本非破壊、GitHubへの研究コミット・回復**を検証。長時間稼働の本質は品質と成果であり、テスト件数やStrata実装数ではない。

注意：GitHub ActionsログのSUCCESS/FAILはタスク全体のPASSであり、一部のMODEL/QAステップ成功を「完成」と記載しない。
