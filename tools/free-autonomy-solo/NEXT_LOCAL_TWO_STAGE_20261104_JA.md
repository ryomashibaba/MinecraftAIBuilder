# 2026年12月対策 — 真正ローカルQwen 2工程連続試験

## 最上位方針（変更禁止）

目的はChatGPT依存低減・追加課金原則0円・長時間自律実開発。MinecraftAIBuilderとBrowser Ink TPSは完全同格、ローカルAIは一度に1プロジェクトを長時間連続担当。Strata完成そのものは目的ではない。main・元成功経路・正式研究実績・本番・Workの個別承認は保護。未確定の品質閾値を勝手に固定しない。

## 新たに実装した共通経路

前工程のOpenCode無料クラウド実リクエストが240秒でタイムアウトしたため、ローカルOllamaへの直接HTTP接続をもう一つの手段として用意した。公式JSON Schemaによる find / replace の2文字列に限定し、モデルにシェルやGitコマンドを実行させない。

新しい local_ollama_patch_loop.py は、明示された既存ファイルへの一意の置換だけを許可。独立QAはネットワーク無しDocker、Gitメタデータ読取専用、CPU/RAM/PID制限つき。QA失敗なら研究コピー内の変更を復元して少数回再試行。成功時のみ研究Gitコミット。同じプロジェクトで複数工程、工程ごとに別QA、状態保存と再開に対応する。GitHub pushは個別フラグを付けたときに限り、既存のresearch remote branchにのみ実行。

RUN_LOCAL_QWEN_TWO_STEP.py は本人のMinecraftAIBuilderやBrowser Ink TPSに触れない独立学習用入口。WindowsのLOCALAPPDATAに使い捨てGitを作り、同一ファイルの clamp 関数を1) 通常数値範囲で正しく修正、2) 逆転範囲をRangeErrorで拒否、の2工程で真正ローカルモデルに修正させる。個別のNode独立QAを通したものだけ隔離Gitにコミット。GitHubへのpushは行わない。

依存コードのダウンロードは固定GitコミットとGit blob SHAで照合。モデル自動ダウンロードなし。公開のNode QA Dockerイメージは、既存GitHub Actionsで確認した不変digestを指定。--allow-public-qa-image-pull を明示した場合にのみ、この公開QAイメージをダウンロード可能。外部有料AI APIは呼ばない。

## ユーザーWindowsでの最小操作

Docker Linux Engine、Git、Python、Ollama、導入済み qwen3:14b を使う。ゲーム中はGPU負荷競合に注意。以下をPowerShellに1回コピーする。現時点でユーザーWindowsの実行結果はまだない。

~~~powershell
$ErrorActionPreference = "Stop"
$rev = "67ead6b7991a6b5fbbf3f51bdec481cb934f94b4"
$expected = "d5f4253cd988ef7b443cb56328ddba043b841883"
$path = Join-Path $env:TEMP "RUN_LOCAL_QWEN_TWO_STEP.py"
$url = "https://raw.githubusercontent.com/ryomashibaba/MinecraftAIBuilder/$rev/tools/free-autonomy-solo/RUN_LOCAL_QWEN_TWO_STEP.py"
Invoke-WebRequest -Uri $url -OutFile $path
if ((git hash-object $path).Trim() -ne $expected) { throw "SOURCE_INTEGRITY_HOLD" }
python $path --model qwen3:14b --allow-public-qa-image-pull
~~~

実モデルは最大2工程×各2試行の安全上限で使う。全て成功した場合は private receipt に TWO_STEP_LOCAL_SOURCE_QA_PROOF_ONLY、ローカル2コミットを保存。失敗はHOLD。最終メッセージの PRIVATE_RESULT_PATH に共有可能な小さなJSONがある。RAWモデル回答のアップロードやスクショは不要。

## 判定境界

- 既存Linuxの実Dockerスモーク／OpenCode CLIヘルプPASSは本物のQwen推論の証明ではない。
- 本研究ブランチのCIでの新2工程テストはFake/Mock。実Windows/Ollama Qwenの成功率・長時間運転・本番GitHubへのpushは未実証。
- 旧OpenCode無料モデル実試行は 240秒 timeout、修正0・QA0・Git commit0（Actions #41742847107）。
- SOURCE PASSはART PASSやMinecraft Education実機施工、Browser Ink TPS原作正式180秒4v4 PASSではない。

次は使い捨て研究fixtureの真正証拠取得→既存承認済みの個別研究コピーで小さな実ソース修正→独立QA→研究remote保存→同一プロジェクト長時間連続運用、の順に実測する。閾値は実データが揃うまで固定しない。


## 2026-11-04 最終独立QA（今回の研究コード）

- 研究コミット 56eec43d9c6da9654b50b35b505dccf16a34716c / 専用GitHub Actions #41745837245 = completed/success。
- 4検証ジョブともSUCCESS：offline-contract-only（Fake/Mock 41/41）、native-docker-smoke-no-llm（真正Linux Docker限定）、real-opencode-v2-cli-no-llm（真正CLIヘルプのみ）、windows-readonly-ps-parser（PowerShell AST構文のみ）。
- 先行 #41744827211、#41745045798 等のFAILは追加した負例の想定例外とモック範囲の誤りによる。修正版でテストを修復し、旧FAILをSUCCESSとは言い換えない。
- genuine-free-model-once-ephemeral は明示実行以外SKIPPEDを維持。Windows真正モデル・実際のGitHub push・プロジェクト作品品質は未検証HOLD。
- Windows入口 RUN_LOCAL_QWEN_TWO_STEP.py は実機未実行。ソースのみGitHub保存済み、必要な固定源blobハッシュ確認を行う。公開Node QAイメージの初回pullは利用者が --allow-public-qa-image-pull を選んだ場合に限る。


## 2026-11-04 更新：Docker未導入ならこちらを優先（新経路）

従来の RUN_LOCAL_QWEN_TWO_STEP.py はDocker Linux Engineを要求し、古いパッチ監督コードに固定されている。**Docker未導入のWindowsで、この古い経路を無理に実行する必要はない。** 下記の新経路を推奨する。

新しい local_qwen_no_docker_two_step.py は **Pythonと、既に起動しているOllamaの導入済みモデルだけ**を使用し、無課金の真正モデル応答から２工程の小規模コード生成を確認する。Git clone・Docker・Node・追加の有料API・モデル自動pull・プロジェクト原本のマウントは行わない。

最大２工程×各２回のモデル応答。第１工程はclampの正常動作６ケース、第２工程は既存動作を維持したまま不正な境界へのValueErrorを含む８ケース。モデル生成コードはASTの許可されたノードだけを検証・解釈し、exec/eval/import/shellでモデル生成コード自体を実行しない。私有領域に段階別候補と共有可能なJSONを保存。成功時の証明は TWO_STAGE_REAL_LOCAL_AST_QA_ONLY であり、実プロジェクト開発・Gitコミット・ART・180秒4v4・長時間無人運用のPASSではない。

Windows PowerShellに以下を１度コピーする。Gitコマンドは固定配布ソースの**照合だけ**に利用し、clone/commit/pushは行わない。

~~~powershell
$ErrorActionPreference = "Stop"
$rev = "ac6f76aef6e0bdf72a854cc5dbf65b7ae90ebbff"
$expectedBlob = "ec98a13b7191a3f70f58af3bf3c08f85c8e60503"
$script = Join-Path $env:TEMP "FA_LocalQwen_NoDocker_TwoStep.py"
$uri = "https://raw.githubusercontent.com/ryomashibaba/MinecraftAIBuilder/$rev/tools/free-autonomy-solo/local_qwen_no_docker_two_step.py"
Invoke-WebRequest -UseBasicParsing -Uri $uri -OutFile $script
if ((git hash-object $script).Trim() -ne $expectedBlob) { throw "SOURCE_INTEGRITY_HOLD" }
python $script --model qwen3:14b
~~~

Ollamaでのインストール済みモデル名が異なる場合に限り、最後の --model をタグ名と完全一致するものに置き換える（Gemmaも対応）。モデル未導入なら変更や自動取得なしでHOLD。GPU負荷が重いため、ゲームと同時利用は避ける。結果はコンソールの PRIVATE_RESULT_PATH にある SHAREABLE_RESULT.json だけで足り、スクショや全モデル出力の提出は不要。

この経路は**本物のWindowsでのユーザー実行結果がまだなく、事前のオフラインMock試験のみ**。GitHub CIで実Linux推論を試す別ルートもあり、そちらはユーザーの14BやWindowsの証拠に流用しない。
