# MinecraftAIBuilder — B198Z-R17 新しい承認が必要な実Qwen単発ランチャー（未配布）
2026-10-19 / Draft PR #128 / **この工程で本物のQwen推論は行っていない** / Minecraft施工禁止

## 工程の役割
R16で初心者向け2.5KB軽量スターターと、必要な32ファイルの厳格SHA検証・模擬Ollama一括QAが揃った。R17では、その**既に検証済みの32ファイルを改変・入れ替えず**、将来ユーザーが新規に実Qwen単発生成を明示承認したときだけ利用する別のWindows起動プログラムを準備する。

**以前の「R6実Qwenを1回だけ承認」はすでに使用済み。今回の「次の工程へ」はR17のコード実装・模擬テストへの同意であって、実モデルの推論承認ではない。** よって、このR17起動CMDはまだユーザー向け配布ZIPへ同梱しない。GitHub Draft PRのコードとしてのみ保存し、実行方法は承認後に提供する。

## 実装ファイル
- `tools/r17-gated/RUN_R17_ONCE_AFTER_FRESH_APPROVAL.cmd`：専用のユーザー確認。以前のR6文字列 `I_APPROVE_ONE_LOCAL_MODEL_REQUEST` を使い回しても起動できない。**R17専用**の新しい確認文字列 `I_APPROVE_R17_ONE_LOCAL_QWEN_REQUEST` をタイプした場合のみ続行。これ自体はChat上の新規明示承認を代替せず、配布は別途承認後に限定する。
- `tools/r17-gated/RUN_R17_ONCE_AFTER_FRESH_APPROVAL.ps1`：Node.js／R16準備状態を確認。R16の**Git blob SHAで固定されたインストーラー**と32ファイルをすべてSHA照合し、模擬QAが合格するまで本物のモデル接続を拒否。更新・自動修復・自動インストールはせず、未準備ならHOLDで終了。
- R17実行専用フォルダー `%LOCALAPPDATA%\MinecraftAIBuilder\R17_OneShot_Evidence` に、**新規作成専用の再実行防止ロック** `R17_APPROVAL_CONSUMED_LOCK.txt` を作り、作成に成功した実行だけがモデル接続できる。失敗・途中切れ・プログラム異常後もロックは維持。ユーザー操作だけで何度もGPU推論を開始できない。
- R11の`r11-compact`を明示し、固定 `qwen3.8:27b`、`num_predict=3072`、`num_ctx=6144`、thinking=false、stream=false を維持。現行のR6単発モデルレイヤーで `127.0.0.1` のモデル名確認を先行し、**最大1回のモデル生成POST**のみ実行。Minecraft worldの操作コマンド無し。
- 生成の成否に関わらず、R6原本無改変・SHA-256・R11出力上限/構文検査・R13静的日本語品質監査・可能であればオフライン3D / B198W評価票を同じ専用ZIPへ保存。追加の `R17_ONE_SHOT_MANIFEST.json` は独立して生成し、`modelAttemptsAllowed=1`、`R11`モード、`NO_WORLD_WRITES`、9ゲートBLOCKED、R15の基準原本比較が**自動では未実施**である事実を明記する。
- **R15の旧R6との比較を捏造しない**。以前のR13またはR14監査結果が実際にある場合にだけ、後続のオフライン比較を行う。旧モデルの途中終了が、新モデルで「形状も独創的に良くなった」という証明に自動変化することはない。

## 実機相当のWindows検証（本物のQwenを動かさない）
- `scripts/b198zr17-once-windows-smoke.test.mjs` で **テスト開始前に偽Ollama HTTPサーバーが127.0.0.1:11434を専有**。このポートが実Ollama等に使われていた場合、**起動テストを実行せず失敗させる**。実環境へのフォールバック禁止。
- Windows CMDを直接起動し、承認なし・以前の承認文字列ではモデルのGET/POSTがゼロ、現行の新しい文字列でのみ実際に模擬GET 1・模擬POST 1となることを検証。
- 本物のR16の固定ソースインストール・オフライン模擬テスト合格後にだけ擬似的なQwen応答を受け取る。**偽の4-key建築原文**を使い、R9の階段、R10の反復要素、R11監査、R13監査、R17マニフェストをWindows PowerShell ZIPへ同梱したか検証。
- 同じR17新承認文字列で再度起動しても、再実行防止ロックにより2回目のGET/POSTはゼロで、2回目の結果ZIPを作らないことを確認。
- このCIは **Windows-latest + Node 24 + PowerShell5.1**を使用。生成結果はあくまで模擬HTTPによるテスト原本であり、Qwenの建築品質・VRAM・実際の走破性を保証しない。
- GitHub Actions：`.github/workflows/r17-gated-fake-windows.yml`

## 固定する安全条件
`NOT_PREPARED`、全9ゲート `BLOCKED`、`BuildPlan.operations=[]`、Minecraft word read/write=0。Qwen実推論=0。mainマージなし。実行用ファイルをR16の安全なスターターZIPに自動同梱しない。新しい生成はR17の実装・CI合格とは独立した**ユーザーの新規明示承認**が必要。

## 次の判断
R17の模擬テストが合格した段階ではユーザー操作は不要。次の工程が実Qwen新規1回になるなら、R17専用ランチャーを渡す前に**新しく1回の実推論を承認するか**確認し、承認しない場合は設計・テストのみ継続する。承認後は自動再実行できない状態で原本ZIPをユーザーから受け取り、R13/R15と人間の3D審査を行う。
