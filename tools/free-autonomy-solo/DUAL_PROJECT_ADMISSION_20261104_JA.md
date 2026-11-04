# 2026-11-04 — 12月対策：最重要2件の研究push・単一ローカルAI排他を固定

## 不変の全体目標

ChatGPT依存を減らし、無料クラウドAIや既存ローカルLLMの長時間自律開発を実際に成立させる。Strata自身の完成は目的ではない。MinecraftAIBuilderとBrowser Ink TPSは完全同格の最重要プロジェクト。ローカルAIは一度にどちらか片方だけを学校・夜間を通じて長く担当する。main・本番・正式QA・既存成功経路・有料API・Work/Computer Useの事前承認を保護し、未確定のART/正式4v4合格閾値を勝手に決めない。

## 研究コードの実監査

solo_agent.pyのPROJECTSには、すでに minecraftaibuilder → ryomashibaba/MinecraftAIBuilder、browser-ink-tps → ryomashibaba/browser-ink-tps の2件が登録されていた。名前の追加だけでは新しい開発能力にはならないため、遠隔保存の安全性を修正した。

元の監督器は、ローカルのresearch/ブランチは確認していたものの、リモート研究ブランチがまだ存在しないときにgit pushによって作られる可能性を残していた。改修後は、全pushの直前にGitHubのexact originと研究branchを再確認し、非対話 git ls-remote --exit-code --heads origin refs/heads/研究ブランチ で対象が既存であること、SHA・フルrefが厳密一致することを必須にした。通信失敗・認証不足・remoteに未作成ならHOLD。既存ブランチへのnon-force pushだけを許可する。新ブランチ自動作成は行わない。

また、モデルのコード改修が独立QAを通ってローカルコミットされた後にpushが失敗した場合、外側の例外処理がUNPUSHED_RESEARCH_COMMITという重要なHOLD理由を上書きしていた問題を修正。ローカル成果は保持し、GitHub保存済みと混同させない。

## 単一ローカルLLMのOSロック

solo_agent.single_agent_lockはLOCALAPPDATA/FreeAutonomySolo/one-local-project.lockを両プロジェクトで共有し、OSの排他ロックを使う。別プロセスで2つめのプロジェクトが並列取得しようとすれば拒否し、所有者が終了すれば次のプロジェクトが取得できる。LinuxとWindowsの両方で独立試験する。ただし別アプリによるOllamaの利用やGPU負荷までは停止しない。これは本監督器に従うプロセス同士だけの排他契約。

## 両プロジェクト固有の保護

MinecraftAIBuilder：Education実機の既存R125成功経路、9安全ゲートBLOCKED、worldWrites 0、Draft PR #128未マージ、ART HOLDを維持。Browser Ink TPS：B423の実180秒・本物の新worldでの再戦は新証拠が揃うまでHOLD、F1～F5と原作25/17/26/0、自然敵対岸0/12、Draft PR #5/Pages保護と正式4v4 HOLDを維持。共通安全CIのSOURCE成功を美術やゲームの正式成果としない。

## 今回検証した範囲と未解決事項

両GitHub originの真正exact allowlist、未作成リモート研究ブランチへのpush拒否、ローカルコミットとHOLD理由保持、remote refすり替え拒否、別OSプロセスの単一モデル排他をオフラインfixtureで独立検証。別途実Linux Docker隔離とWindows Python/PowerShellの限定検証を行う。実Qwen14BのユーザーWindows、主力実プロジェクトの本物の複数工程改修・夜間運用・研究pushおよびART/180秒4v4は未実証のためHOLD。

## 次工程

GitHub-hosted runnerで両プロジェクトの本物の保護研究ソースを各々独立にREADONLYテストし、SOURCE合否を先に確定する。同時ローカルLLMにはしない。ユーザーWindowsの真正Qwen3 14B試験後、承認済み専用研究cloneの片方へだけ長時間連続実行を拡張する。追試・失敗・戻り先を保存し、既存原本やmainには触れない。
