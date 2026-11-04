# 2026-11-04 — 同格2主力の本物のSOURCE Docker QA→ローカル研究コミット実証

## 固定方針

2026年12月以降のChatGPT利用制限統合に備え、追加有料API原則なし、無料クラウドAI/ローカルAIによる長時間自律開発を進める。目的はStrata完成ではなく**実ソフトウェアを品質を落とさず開発すること**。MinecraftAIBuilder と Browser Ink TPS は**完全同格の重要2件**、ただしローカルモデルが一度に稼働するプロジェクトは片方だけで、夜間・学校時間中は同じ対象を継続して深く進める。Work/Computer Useは事前承認。main/本番/既存成功実機経路/原本/公開は保護。未決定の美術・実機・正式4v4合格基準は勝手に決めない。

## 成立した独立QA→研究commit機構

- `promote_private_real_drafts_docker.py`：前工程の `draft_real_project_local14b.py` がPRIVATEに作った2段階の修正案とSHAREABLE_DRAFT_RESULT.jsonを検証する**別の明示起動ゲート**。元のGit研究コピーはreadonly source pinとGit状態を照合し、手を加えない。
- QA専用の新規private cloneを作る。モデル回答のsource SHA256連鎖、2段階の順序、検証済み固定コミット、重要APIの残存、一つのソースファイルのみの差分範囲をチェック。破損・欠落・不正・秘密情報混入の可能性をHOLD。
- 真正DockerでNode24コンテナを用い、各段階を **ネットワークnone／root FS readonly／専用cloneのソースbind readonly／cap-drop ALL／no-new-privileges／PID/メモリ/CPU上限**のもとでQAする。ホスト認証・Docker socketをマウントしない。Docker未導入/イメージ未キャッシュなら勝手に導入せずHOLD。
- MAB: `node --test scripts/r125-v4h-mezzanine.test.mjs` という既存V4H SOURCE QAを1段階ごとに実行。B143二層と既存安全ゲートのコード試験であり、人間ART・Minecraft Education真正世界歩行ではない。
- TPS: TypeScript `tsc --noEmit --incremental false`、本物のB193/B423 Vitest、Vite buildを1段階ごとに実行。全QAはnetwork none。Vite/Vitestの設定ファイル作成は `--configLoader runner` でなくし、readonly bindを維持。**真Chromium180秒/自然な4v4/塗装・HP・再戦の実走行証拠ではない**。
- TPSの依存パッケージにlockfileが存在しない。必要な場合だけ `--allow-public-npm-deps` を明示し、モデル生成コードを置く**前の**別Docker準備段階で `npm install --ignore-scripts --no-save --package-lock=false` を行う。ここだけ通常の公開npmネットワークを使用。間接依存は完全再現不能。**モデルコードを入れた後のすべてのQAはnetwork none。**
- 各工程独立QAに合格した場合だけ、ホストのGitから**QA用の新規researchローカルブランチ**にcommit（Git hooks無効）。2工程合格した場合はlocal commitを2件記録。GitHub pushは0、原本更新は0。2工程目FAILなら1工程目の隔離commitだけ残し、HOLD。プライベート生ソースはGitHub Actions artifactに含めない。

## 実際のGitHub Actions真正Docker結論

**[Actions #41790879453](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41790879453)** — 全体 SUCCESS、2独立ジョブ SUCCESS、2つの7日間保存Artifactsを発行。

- MinecraftAIBuilder：固定HEAD `fe1682e15ffa063f4dc415b06c4d76a54737a06e` の真正公開V4Hソース。2工程 × 1既存Node SOURCEテストコマンドPASS、隔離local Git commit **2件**。
- Browser Ink TPS：固定HEAD `0942eca28ca3cc2c66cc754c0d6d8e6fdedb6c07` の真正公開B423制御ソース。2工程 × 3独立QAコマンド（TypeScript/Vitest/Vite）PASS、隔離local Git commit **2件**。
- 両方で**モデル呼出し0、GitHub remote push0、ユーザーWindows/実Minecraft/真Chromiumへの接触0**。使用した差分は、既存機能を変えない**合成コメントの追加**。これは「AIが本当のソフトを改修して成功」の証拠ではなく、「真正の2つのコードベースで安全なQAとcommitゲートが最後まで動いた」の証拠。
- Artifact：[`dec-real-source-docker-minecraftaibuilder`](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41790879453/artifacts/13302654343) と [`dec-real-source-docker-browser-ink-tps`](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41790879453/artifacts/13302754068)。どちらも合格工程数2、各独立QA数、モデル0回・遠隔push0・品質未認定をJSON記録する。

## 過去FAILからの修正（その時点のFAILを成功扱いしない）

- [#41789988693](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41789988693) 初回：MAB側は本物Docker SOURCE QA 2工程SUCCESS、TPSは依存準備HOLD。
- [#41790284419](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41790284419)でTPSのnpmエラー `Cannot read properties of null (reading 'edgesOut')` を特定。Node22/npm10の依存グラフ問題が報告されており、Node24/npm11へ変更。
- [#41790499254](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41790499254)ではTPSが実TypeScript QAを通過したが、Vitestがreadonly `node_modules/.vite-temp`作成を試みHOLD。 `--configLoader runner` で設定一時ファイルを禁止せずに不要化（readonlyを維持）。
- [#41790879453](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/41790879453)で両方真正Docker SOURCE QAと2段階隔離Gitコミット成功。CIのFake/Mock回帰も別系統で継続。

## 未達／次に進むべき本質工程

1. Windowsの既存Qwen3:14B/Gemma等が**本物のMAB/TPSコード**に対して意義のある2段階連続の差分を出すことは未実証。ユーザーPCはDocker Desktop未確認。無人運転自体も未実証。
2. Qwen14Bが生成したPRIVATEの実差分を、GitHub Actionsの読み取り専用・資格情報を渡さないDocker runnerで独立QAできる**低操作数の受渡し経路**を設計するのが次の価値の高い工程。ユーザーWindowsへの重いDocker環境導入を前提としない。GitHub push/外部公開は明示承認ゲートを維持。
3. プログラムとしてSOURCE QA PASSになっても、MinecraftAIBuilderは未知用途の自律3D設計・ART評価・Education実機成功、TPSはF1〜F5の真4v4/再戦と原作忠実度が合格しない限り採用せず研究扱い。

本工程の合格表記：**SOURCE_PIPELINE_PASS / REAL_MODEL_HOLD / ART_OR_FULL_GAME_HOLD / WINDOWS_LONG_AUTONOMY_HOLD**。
