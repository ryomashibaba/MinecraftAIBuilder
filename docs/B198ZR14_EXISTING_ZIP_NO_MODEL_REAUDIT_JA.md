# B198Z-R14 — 過去に保存した実QwenのR6 ZIPを「Qwen実行0回」で再監査
2026-10-19 / Draft PR #128 / 既存mainやMinecraft Education worldを変更しない

## 目的と今回の実装
以前に1度だけ許可された `qwen3.8:27b` の実生成が3072/3072出力トークン上限に達し、JSON未完成となった。すでに生成済みの `R6_<GUID>_UPLOAD_THIS_RESULT.zip` を、初心者が1回の操作で再監査できる環境にする。新しいモデル推論は**承認されていない**ため実行しない。

## 実行UX
1. 別途配布する `MinecraftAIBuilder_R14_MINI_REAUDIT_20261019.zip` を解凍（3ファイル、約2.9KB）。
2. `RUN_R14_MINI.cmd` をダブルクリックするとR14を準備。初回だけGitHubからハッシュ固定の4個のR14起動ファイルを取得し、そのうちの専用インストーラーが実監査に必要な11個のNodeソースファイル（合計約100KB）を固定コミットから取得する。**GitHubリポジトリ丸ごとの解凍は不要**。
3. Windowsファイル選択画面で保存済みR6結果ZIPを選択。またはR6 ZIPを起動CMDへドラッグしてもよい。
4. ユーザーの原本ZIPのSHA-256を読み、**実際にR6 ZIPへ入っている3種の原本/レシート/結果のみ**を別の安全なフォルダーへ読み取り抽出する。元のZIPを上書き・編集しない。
5. R13の厳格なソース検査＋凍結c01原文＋B143/R3/B198Wの独立した品質検査を実施し、`R13_OFFLINE_QUALITY_DECISION.json` と日本語の`R13_OFFLINE_QUALITY_OVERVIEW.html`を生成。R14原本参照SHA・安全状態を明示した`R14_OFFLINE_AUDIT_MANIFEST.json`も生成する。
6. 結果HTMLを開き、3ファイルのみ含む小さな`R14_<GUID>_UPLOAD_THIS_AUDIT.zip`をWindows Explorerで選択表示する。そのZIPをChatGPTへ送る。**元のQwen原文は再提出用ZIPへ複製しない**。

## ソースコードと安全
- `tools/r14-mini/RUN_R14_REAUDIT.ps1`: 元ZIP読み取り、.NET ZIP事前検査、限定3ファイルの抽出、R13実行、結果の再ZIP。実モデルの生成/再実行/読み込みはしない。
- `tools/r14-mini/INSTALL_R14_MINI.ps1`: 11ソースファイルのGit blob SHA-1照合。固定ソースコミット：`b320b25353741676df9c2e4ac19f60f29871f519`。インストール後の改変や予期せぬ余分ファイルはHOLDし、改変ソースへ自動上書きをしない。
- `tools/r14-mini/SETUP_AND_REAUDIT_R14.cmd`: 二重実行・モデル生成の入口を作らず、ZIP監査のみを起動。
- ZIPは15MB以上を拒否、ファイル件数・個別展開サイズ・合計展開サイズを制限し、Windows `\\`・通常 `/` の両方を安全に正規化してから絶対パス/親パスへ脱出/未知構造/ZIP内のシンボリックリンク/原本ファイル重複を拒否する。
- **途中で切れたJSONはR13のHOLDが正常な報告**。JSONを勝手に閉じたり、AIの形状をねつ造・変更したり、再推論したりしない。
- 再監査は毎回新しいGUIDフォルダーへ出力。元ZIPのSHAは処理前後で同じことを検証する。
- モデル本人性・実プレイヤーの歩行可能性・曲線外観の美しさ・図書館としての使い勝手はモデル出力JSONだけで自動合格にしない。
- `NOT_PREPARED`、9ゲート全部`BLOCKED`、`BuildPlan.operations=[]`、worldContacts/worldWrites=0、mainマージ無し。実Qwenの生成承認は**前回の1回で使用済み**。新しい生成には別途明示承認が必要。

## CIで何を実際に検証したか
- GitHub Actions `.github/workflows/r14-saved-zip-windows.yml` の **Windows PowerShell 5.1 + Node 24** にて、
  `scripts/b198zr14-saved-zip-windows-smoke.ps1` を実行。
- 偽の「過去に生成済みR6 JSON途中終了」をZIPへ格納し、**本物のWindows CMD**から起動→11ファイル実ダウンロード→SHA照合→R13のHOLDレポートと小ZIP作成→入力原本SHA変化なしを検査。
- 同じ原本ZIPを2回監査し、別GUID出力が生成されることを確認。
- `../`を含む悪意あるZIPエントリは拒否。Windowsで標準の `Compress-Archive` が `\\` を区切りに使う正当なR6 ZIPは正しく受け入れる。
- Windows専用ジョブは最新検証コミットで2件とも**PASS**。CIは偽データのみで実Qwenは一切呼ばない。
- [Windows実行記録](https://github.com/ryomashibaba/MinecraftAIBuilder/actions/runs/39237711757)。

## 実際の過去R6 ZIP確認
ユーザーが以前提出した `R6_b191f072-1d5d-4749-a30e-1cdce50a567a_UPLOAD_THIS_RESULT.zip` はR6固定フォルダーの下に`R6_FROZEN_REQUEST.json`、`R6_ORIGINAL_MODEL_RESPONSE_UNMODIFIED.txt`、`R6_R5_UNVERIFIED_CAPTURE_RECEIPT.json`、`R6_SINGLE_CAPTURE_RESULT.json`の4ファイルを含む。R14の許可した入力フォルダー形状と一致する。**そのファイルに対して新たな推論は行っていない。**

## 次の工程
実Qwenの再生成に先立ち、過去R6のHOLD事実と、R9～R13で改善した出力構造を別々に比較し、改善を主張するために必要な**本物の新しいモデル結果・人間による採点・世界施工に至らない実用検証**の証拠基準を明示する。AI作成のテスト建築を実Qwenの成功に混同しない。
