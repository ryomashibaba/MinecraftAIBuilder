# 2026-11-04 — ローカルQwen14BからGitHub独立Docker QAへの実ソース受け渡し

## 継承する最上位方針

主目的は「ChatGPTへの開発依存・追加課金を減らし、無料クラウド＋ローカルモデルで長時間にわたり高品質な開発を続けること」。Strataは手段の一つで目的ではない。MinecraftAIBuilderとBrowser Ink TPSは完全同格の最優先2件。手元のローカルモデルが一度に担当するのは必ず片方だけ。main/正式原本/既存実機成功経路/TPS本番/Pages公開/Work開始/有料API課金は明示承認なしに変更しない。

## 今回の実装（研究ブランチ内のみ）

- `public_qa_handoff_protocol.py`：固定GitHub原本の1ファイル・2段階完全ソース案を公開研究Gitブランチに提出する形式。SHA256の段階連鎖、固定40文字Git HEADとGit blob、ソースサイズ上限、公開関数名維持、1つの有界な編集、代表的な秘密鍵・トークンらしい文字列の拒否。
- `submit_public_research_qa.py`：Windows上で既存の PRIVATE_DRAFT_RESULT を検証し、新たな Git clone に提出JSONを**1ファイルだけ**追加して、既存 `research/dec-free-autonomy-solo-pilot-20261104` に**fast-forwardのみ**でpush。新しいremote branchを作らず、force/main/PR変更・認証トークン収集なし。pushにはユーザーWindowsのGit Credential Managerなどで**既に認証済みのGit権限が必要**。未認証/操作失敗ならHOLD。
- `receive_public_research_qa.py` と `.github/workflows/dec-free-autonomy-public-source-handoff.yml`：GitHubの指定 research ブランチに新しい提出JSONがpushされたときだけ起動。pushの親SHAと子SHAを比較し、**1コミットかつ1ファイル新規追加のみ**を許可。提出JSONをデータとして読む。既存の保護された真正GitHubソースを別の隔離クローンへ取得、提出のSHA/段階連鎖を照合して真正Docker SOURCE QA → 各段階合格時だけローカル研究Git commit。GitHub Actionsの権限は `contents:read`、checkout `persist-credentials:false`、Docker内はネットワークnone/readonly source/no credentials。資格情報のないActions側からGitHub pushは行わない。結果のみ7日保存Artifactへ。
- `RUN_QWEN14B_TO_PUBLIC_GITHUB_QA_ONCE.ps1`：既存のPython、Git、起動済みOllamaを使い、片方のprojectのQwen実ソース修正案2段階→PUBLIC GitHub研究提出までを1回のコマンドで実行する。**WindowsにDockerは不要**。Pythonソース・マニフェスト・橋渡しコード8ファイルすべて固定Git blob SHA照合。モデルの自動pull、追加API、Work、OS設定変更なし。
- 2026-11-04 GitHub研究HEADが更新されても、モデル入力の固定ソースはMAB V4H `fe1682e15ffa063f4dc415b06c4d76a54737a06e`、TPS B423 `0942eca28ca3cc2c66cc754c0d6d8e6fdedb6c07`。これは**再現性研究用の過去コミット**であり、最新のMAB V4J/TPS B431等の開発正本へ本番採用する証拠ではない。新しい本線へ合流する前に再同期と作品QAが必須。

## 公開範囲・同意

**必須：`-PublishPublicCode` を指定するまでGitHubへの送信は禁止。** 提出JSONには元から公開されているプロジェクトのソース2段階の写しと、モデルが付加した変更内容が含まれる。公開Gitのコミット履歴に永続的に残る可能性が高く、あとから削除しても完全には回収できない。機密判定は保守的なパターン検査だが、全種類の秘密情報を保証して検出できない。**秘密・未公開コードは絶対に送らない。** 公開が不適切なら、従来のPRIVATE下書きツールだけを使ってHOLDする。GitHubトークン・パスワードをチャットに貼らない。

## Windowsからの実行例（PUBLIC投稿の明示許可つき）

下記は受け渡しのsourceも固定コミットとGit blobで確認する。Ollama、Git、Pythonが事前導入済みで、GitHubの既存研究ブランチへのpush認証が済んでいる必要がある。

~~~powershell
$ErrorActionPreference = "Stop"
$rev = "7b0db3c83aafacc830844d869384878a387391d9"
$blob = "e6f94f389d09919d9c0919f2c0ded1c95d5520a8"
$path = Join-Path $env:TEMP "RUN_QWEN14B_TO_PUBLIC_GITHUB_QA_ONCE.ps1"
$url = "https://raw.githubusercontent.com/ryomashibaba/MinecraftAIBuilder/$rev/tools/free-autonomy-solo/RUN_QWEN14B_TO_PUBLIC_GITHUB_QA_ONCE.ps1"
Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $path
if ((git hash-object $path).Trim() -ne $blob) { throw "SOURCE_INTEGRITY_HOLD" }
& $path -Project minecraftaibuilder -Model qwen3:14b -PublishPublicCode
~~~

browser-ink-tpsを選ぶ場合は最終行の `minecraftaibuilder` を `browser-ink-tps` に置換する。同時に二つ実行しない。**成功したアップロードとGitHub Actions QA成功は別**。送信ツールはpush直後にSUCCESSと決めず、Actionsの独立結果を待って確認する。

## テスト証拠と未達

- `test_public_source_qa_handoff.py`、`test_receive_public_research_qa.py`：本物の一時Git repoで追加/改変/複数ファイル、SHA偽造、ソース変更範囲、公開同意なし、機密文字列の拒否、モデル自己申告と独立検証の区別を回帰。
- Windowsの実GitランナーでMock/オフライン試験。単にLinuxでPythonコードを書いただけではWindows互換を確証しない。
- GitHub研究ブランチにモデル不使用の**公開合成コメント2段階**を、MAB/TPS各1回提出する統合試験を実施。これらは実モデルではなく常に `synthetic_fixture=true` と明示する。実QA・実コミット・実行中安全境界の証拠はActionsの正確なrun/Artifactで確認する。
- 本物のユーザーWindowsのQwen14Bで修正案が生成できるか、Git Credential Managerからの公開提出が成功するか、実コードの有益な改修、Minecraft ART/Education施工、TPS真正180秒4v4、夜間/学校時間中の長時間自律運用はすべて別途**未実証（HOLD）**。

評価区分：**PUBLIC_TRANSPORT_SOURCE_QA（実Docker証拠が出た場合のみ）／LOCAL_QWEN14B_HOLD／ART_AND_FULL_GAME_HOLD／LONG_UNATTENDED_HOLD**。

## 統合試験の確定結果（2026-11-04、合成コメントのみ）

**MAB・TPS両方の「公開研究branchにファイル追加 → Actions pushトリガー → 提出差分SHA/固定source照合 → 実Docker QA → 隔離ローカルGit commit」が成立した。** これは真正Github Runner上の実コードでの試験であり、Fake Dockerではない。ただし候補のコードは本物のQwenが生成したわけではなく、機能を変えない合成コメントのみを使用した。

- MinecraftAIBuilder: [Actions #41794461970](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41794461970) **SUCCESS**。研究submissionコミット `9bf860480fc99911d8ce58b141a247aeab64061f`。固定V4H HEAD `fe1682e15ffa063f4dc415b06c4d76a54737a06e`。2工程/各1独立Node SOURCE QA/隔離Git commit **2件**。7日間の証拠JSON [Artifact #13305131066](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41794461970/artifacts/13305131066)。
- Browser Ink TPS: [Actions #41794476009](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41794476009) **SUCCESS**。研究submissionコミット `bb4c764e537667fe80488136872a684565d72a80`。固定B423 HEAD `0942eca28ca3cc2c66cc754c0d6d8e6fdedb6c07`。2工程/各3独立QA（TypeScript・Vitest・Vite build）/隔離Git commit **2件**。7日間の証拠JSON [Artifact #13305031851](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41794476009/artifacts/13305031851)。
- どちらも `synthetic_fixture=true` / `model_reported_only=ci-synthetic-comments-no-llm` / `runner_model_calls=0` / `github_remote_pushes_from_runner=0` / `project_improvement_certified=false` / `long_unattended_autonomy_certified=false`。
- 回帰とWindows検査: [Actions #41794127076](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41794127076) は97件PASS（Windows Git実体の新規公開プロトコル関連15件PASS）。[Actions #41794612062](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41794612062) は新PowerShellワンショットの構文検査PASS。[Actions #41794872164](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41794872164) SUCCESS。旧mainやユーザーPCソースには変更なし。

以上は「**合成データでの公開GitHub受渡し工程と、安全な独立SOURCE QA工程が2件とも成功した**」ことの実証。手元Windowsの真正Qwen14Bによる有益な修正の発生・WindowsのGit資格情報による本番提出・長時間自律化は引き続き**未実証/HOLD**。研究用の固定V4H/B423 HEADを最新V4J/B431の完成版と混同せず、実改修の評価に使う時は最新の開発正本との差分・有効なQAを再監査する。


## 2026-11-04 追加工程：公開提出後の真正GitHub Actions最終結果まで自動確認

- ワンクリック `RUN_QWEN14B_TO_PUBLIC_GITHUB_QA_ONCE.ps1` に読み取り専用 `verify_public_research_qa.py` を接続した。これは**既存の提出・独立QAを増殖させない**ための結果照合。新Workflow・有料API・GitHub書込み・モデル推論を増やさない。
- PUBLIC投稿には従来どおり `-PublishPublicCode` の明示同意が必要。提出ツールが返した40桁の**正確なコミットSHA**を検査し、対象研究ブランチ・pushイベント・対象ワークフローと完全一致するGitHub Actions実行だけを最大30分（40秒間隔）読み取る。別SHA・別ブランチ・別Workflow・進行中・失敗・GitHubへの到達不能・時間超過は全てHOLD。GitHub APIは認証情報なしの公開読み取りなのでレート制限によるHOLDもあり得る。
- 結果をPRIVATEソース領域の `SHAREABLE_GITHUB_QA_STATUS.json` に保存する。成功の表記は `EXACT_GITHUB_SOURCE_QA_WORKFLOW_SUCCESS_ONLY` に限定。これはGitHubワークフローの成功確認のみであり、Artifact本文を別途精査したこと、モデルが真正Qwen14Bだったこと、価値ある実修正・Minecraft ART/Education施工・TPS真正4v4・夜間長時間自律開発の認定ではない。
- この結果照合器自体は固定Git blobでダウンロードし、既存のPowerShellワンクリック経路からのみ使う。**現段階ではWindows本人PCでの実行は未検証**。監督システムは本研究ブランチ内で改善を継続しつつ、次はユーザーWindows側の真正モデル出力が必要な品質ゲートを進める。
