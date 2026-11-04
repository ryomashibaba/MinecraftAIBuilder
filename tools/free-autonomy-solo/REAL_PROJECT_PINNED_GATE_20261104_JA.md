# 2026-11-04 — 12月対策：両主力の実ソースQAとWindows隔離研究クローン

## 絶対方針

ChatGPT依存を減らし、無料クラウドまたはローカルLLMを使って追加の有料APIなしで長時間の実プロジェクト開発を進める。MinecraftAIBuilderとBrowser Ink TPSは同格の最重要2件、ただし**ローカルLLMが実行するのは一度に片方だけ**。Strata完成そのものを目標にはしない。既存原本、main、成功済みMinecraft Education経路、T20本番、正式品質基準、Work事前承認制は保護する。

## 2026-11-04 実際のソース・固定SHA

- MinecraftAIBuilder：feature/b198zr1-protected-architectural-revision の ad070ecb3244e1cce742f37e1943f0cff7e31ca2。V4H二階公共建築のAI著作コード source/ai/r125-v4h-mezzanine-author-ir.mjs、Git blob 4cbcbb448737b314b6d5d4bfcdc367e9b1b45f52。
- Browser Ink TPS：research/t21-b406-single-session-real-enemy-range-audit-20261103 の 0942eca28ca3cc2c66cc754c0d6d8e6fdedb6c07。名前はB406研究ブランチだが中身はB423の真正試合再戦修正を含む。対象は src/app/B193SourceCoopMode.ts、Git blob 9e2fe93e6e85cb12ffb27ac1d2506c87ee10bca4。

## 本物の実プロジェクトSOURCEベースライン

[Actions #41758191491](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41758191491) は**2ジョブともSUCCESS**。

- MAB：実ソースのNode24構文チェックと V4H 真B143/二階2幅階段SOURCEテスト4件PASS。Minecraft世界書込なし。実Qwen著作・ART合格・Minecraft Education実歩行ではない。
- TPS：実ソースの TypeScript型検査PASS、B193/B423 Vitest 1ファイルPASS、Vite build PASS。tracked file変更0。唯一の未追跡出力 tsconfig.tsbuildinfo を限定許可。真Chrome 180秒4v4/得点/ART合格ではない。
- TPS正本にはpackage-lockが無いため、初回npm ciはFAIL。非永続的な npm install --no-save --package-lock=false で検証を行ったが、間接依存の再現性は不確か。途中のYAMLコロン記法と、正常なTypeScript生成物に関する保護ゲートの旧FAILも順次修正した。旧FAILは残す。

## 本物のWindowsで隔離クローンできることを検証

- REAL_PROJECT_SINGLE_SESSION_MANIFEST_20261104.json：2件を同じ優先度で登録し、ソースの固定コミット・Git blob・独立QAコマンド・禁止操作を定義。
- prepare_pinned_real_project.py：選ばれた**1プロジェクトだけ**を、LOCALAPPDATAの専用私有ディレクトリにexact SHAでgit fetchし、research/の新しいローカルブランチを作る。HEAD/remote/clean status/Git保存blob/テキスト正規化を検査。元のclone、main、GitHub remote、本番、モデル設定を変えない。推論・QAは実行せず準備だけ。
- [Windows Actions #41759325826](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41759325826) はMAB・TPS両方の実際のWindows 2022 runnerで**SUCCESS**。2つのSHAREABLE_PREPARE_RECEIPT.jsonをArtifactsに7日間保存。これはユーザーPCでの成功ではない。
- 先行Windows #41759068211 ではMAB PASS、TPSはWindows CRLF改行による「作業ファイルの生バイト」とGit blob SHAの不一致を安全に検出してHOLD。git ls-tree HEAD と git hash-object --path でGit正規化された原本を厳密比較するよう修正し、回帰テストも追加。修正版はWindows上でPASS。

## 利用者操作を減らす入口

RUN_PREPARE_REAL_PROJECT_ONCE.ps1 は -Project minecraftaibuilder または -Project browser-ink-tps の一方を明示する1回起動入口。PythonスクリプトとJSONマニフェストを固定コミットの2つのGit blobで検証して、隔離研究cloneを作る。Python/Git未導入なら自動インストールせずHOLD、モデルのダウンロード・新しいDockerの導入・有料API・GitHub pushはしない。

これは**私有研究ソースの準備**であり、真正Qwen14Bの実ソース改修能力・長時間無人開発の証明ではない。Docker未導入Windowsで未信頼AI生成コードのNode/Pythonテストを無隔離実行して安全とみなすこともしない。

## 今回の成果と今後

従来の小型Qwen1.7B公開fixtureでは、真正モデルがソースを1工程だけ修正し、独立NodeQAと隔離Gitローカルコミットに成功。2工程連続は未実証HOLD。0.6Bや1.7Bの失敗をユーザーWindowsの14Bの成績と取り違えない。

今回達成したのは、両主力の**真正GitHubソースに対する再現可能なベースライン**と、片方だけ選んで**真正Windows OS上に安全に研究コピーを確保できる経路**。今後は個別の研究コピーで、本物のQwen14Bのソース編集・隔離QA・研究commit・自動復旧・同一プロジェクトの連続運転を実証する。建築美術・真正Minecraft実機・TPS 180秒/4v4は引き続き別の基準で評価する。
