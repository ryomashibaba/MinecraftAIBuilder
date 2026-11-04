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
$rev = "67fb38453360d9727dad90c22b5bdddf8422f89c"
$blob = "47663737a53607061678b039c99957584d8534f8"
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
